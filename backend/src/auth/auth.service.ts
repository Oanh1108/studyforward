import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import { PasswordResetToken } from './password-reset-token.entity.js';

interface FailedAttempt {
  count: number;
  blockedUntil: number | null;
}

@Injectable()
export class AuthService {
  // In-memory rate limiting for login attempts
  private failedAttempts = new Map<string, FailedAttempt>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
  private readonly RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto.name, dto.email, dto.password, dto.goal);
    const token = this.signToken(user.id, user.email, '1d');
    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        goal: user.goal,
        role: user.role,
        isLocked: user.isLocked,
        currentLanguage: user.currentLanguage || 'en',
      },
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check rate limit / lockout
    this.checkRateLimit(normalizedEmail);

    const user = await this.usersService.findByEmail(normalizedEmail);
    // Generic error message to prevent account enumeration
    if (!user) {
      this.recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Handle Google/OAuth users who have no password set
    if (!user.password) {
      throw new UnauthorizedException(
        'Tài khoản này đăng nhập qua mạng xã hội. Vui lòng dùng tính năng quên mật khẩu để đặt mật khẩu.',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      this.recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    // Login succeeded: reset failed attempts
    this.failedAttempts.delete(normalizedEmail);

    // 30 days if rememberMe, else 1 day
    const tokenExpiresIn = dto.rememberMe ? '30d' : '1d';
    const token = this.signToken(user.id, user.email, tokenExpiresIn);

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        goal: user.goal,
        role: user.role,
        isLocked: user.isLocked,
        currentLanguage: user.currentLanguage || 'en',
      },
      rememberMe: !!dto.rememberMe,
      expiresIn: dto.rememberMe ? 30 * 86400 : 86400,
    };
  }

  logout() {
    return { message: 'Đăng xuất thành công' };
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  async validateGoogleUser(profile: { googleId: string; email: string; name: string; avatar: string }) {
    const normalizedEmail = profile.email.toLowerCase();
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (user) {
      return user;
    }

    user = await this.usersService.findByEmail(normalizedEmail);
    if (user) {
      if (!user.googleId) {
        throw new BadRequestException('Email đã được đăng ký. Vui lòng đăng nhập bằng email/mật khẩu và liên kết Google trong Hồ sơ.');
      }
      return user;
    }

    // New user
    user = await this.usersService.createGoogleUser(
      profile.name,
      normalizedEmail,
      profile.googleId,
      profile.avatar,
    );
    return user;
  }

  generateGoogleToken(user: any) {
    const token = this.signToken(user.id, user.email, '30d');
    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        goal: user.goal,
        role: user.role,
        isLocked: user.isLocked,
        currentLanguage: user.currentLanguage || 'en',
      },
    };
  }

  // ─── Forgot / Reset Password ────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message:
          'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.',
      };
    }

    // Invalidate any previous unused tokens for this user
    await this.resetTokenRepo.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_TTL_MS);

    const resetToken = this.resetTokenRepo.create({
      userId: user.id,
      token: rawToken,
      expiresAt,
      used: false,
    });
    await this.resetTokenRepo.save(resetToken);

    // Send email
    await this.sendPasswordResetEmail(user.email, user.name, rawToken);

    return {
      message:
        'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.resetTokenRepo.findOne({
      where: { token: dto.token, used: false },
    });

    if (!record) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.');
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.');
    }

    const user = await this.usersService.findById(record.userId);
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Hash and save new password
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordDirect(user.id, hashed);

    // Mark token as used
    record.used = true;
    await this.resetTokenRepo.save(record);

    // Invalidate all other pending tokens for this user
    await this.resetTokenRepo.update(
      { userId: user.id, used: false },
      { used: true },
    );

    return { message: 'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.' };
  }

  // ─── Change Password (Authenticated) ───────────────────────────────────────

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    // Google/OAuth users may have no password
    if (!user.password) {
      throw new BadRequestException(
        'Tài khoản này chưa có mật khẩu. Vui lòng dùng tính năng đặt lại mật khẩu qua email.',
      );
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordDirect(userId, hashed);

    return { message: 'Đổi mật khẩu thành công.' };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private checkRateLimit(email: string) {
    const record = this.failedAttempts.get(email);
    if (!record) return;

    if (record.blockedUntil) {
      const now = Date.now();
      if (now < record.blockedUntil) {
        const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
        throw new UnauthorizedException(
          `Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
        );
      } else {
        // Block time expired, reset
        this.failedAttempts.delete(email);
      }
    }
  }

  private recordFailedAttempt(email: string) {
    const record = this.failedAttempts.get(email) || { count: 0, blockedUntil: null };
    record.count += 1;

    if (record.count >= this.MAX_ATTEMPTS) {
      record.blockedUntil = Date.now() + this.BLOCK_TIME_MS;
    }

    this.failedAttempts.set(email, record);
  }

  private signToken(userId: number, email: string, expiresIn: string = '1d'): string {
    return this.jwtService.sign({ sub: userId, email }, { expiresIn } as any);
  }

  private async sendPasswordResetEmail(
    toEmail: string,
    userName: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Build transporter from env variables
    // If SMTP is not configured, log the link to console in dev mode
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@studyforward.app';

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Dev fallback: log the reset link so developer can test without SMTP
      console.log('\n========== PASSWORD RESET LINK (dev) ==========');
      console.log(`To: ${toEmail}`);
      console.log(`Reset link: ${resetLink}`);
      console.log('================================================\n');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Đặt lại mật khẩu – StudyForward</title>
</head>
<body style="margin:0;padding:0;background:#f5f7ff;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f7ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #dfe9ff;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f7cff 0%,#3d6ef1 100%);padding:32px 40px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;">📚 StudyForward</div>
              <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">Nền tảng học tiếng Anh thông minh</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#101827;">Đặt lại mật khẩu</h2>
              <p style="margin:0 0 8px;color:#52607a;font-size:15px;line-height:1.6;">
                Xin chào <strong>${userName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#52607a;font-size:15px;line-height:1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản StudyForward của bạn.
                Nhấn nút bên dưới để tạo mật khẩu mới. Liên kết này có hiệu lực trong <strong>1 giờ</strong>
                và chỉ có thể dùng một lần.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${resetLink}"
                   style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#4f7cff 0%,#3d6ef1 100%);color:#ffffff;font-weight:700;font-size:15px;border-radius:12px;text-decoration:none;box-shadow:0 10px 24px rgba(79,124,255,0.35);">
                  Đặt lại mật khẩu →
                </a>
              </div>
              <p style="margin:24px 0 0;color:#7b8aa5;font-size:13px;line-height:1.6;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                Mật khẩu của bạn sẽ không thay đổi.
              </p>
              <hr style="border:none;border-top:1px solid #dfe9ff;margin:24px 0;" />
              <p style="margin:0;color:#7b8aa5;font-size:12px;">
                Liên kết sẽ hết hạn lúc ${new Date(Date.now() + this.RESET_TOKEN_TTL_MS).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 24px;text-align:center;">
              <p style="margin:0;color:#b6c4d9;font-size:12px;">© 2026 StudyForward. Học tiếng Anh giao tiếp &amp; luyện thi thông minh.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"StudyForward" <${smtpFrom}>`,
      to: toEmail,
      subject: 'Đặt lại mật khẩu StudyForward',
      html,
      text: `Xin chào ${userName},\n\nNhấn vào liên kết sau để đặt lại mật khẩu (hiệu lực 1 giờ):\n${resetLink}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.\n\nStudyForward`,
    });
  }
}
