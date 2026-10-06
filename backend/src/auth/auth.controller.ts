import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthExceptionFilter } from './google-auth.filter.js';
import { UseFilters } from '@nestjs/common';

// Ensure upload directory exists
const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
const AVATARS_DIR = join(UPLOAD_DIR, 'avatars');
if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true });
const COVERS_DIR = join(UPLOAD_DIR, 'covers');
if (!existsSync(COVERS_DIR)) mkdirSync(COVERS_DIR, { recursive: true });

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(
      new BadRequestException('Chỉ chấp nhận ảnh định dạng JPG, PNG, WebP hoặc GIF.'),
      false,
    );
  }
  cb(null, true);
};

  @Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req: any) {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @UseFilters(GoogleAuthExceptionFilter)
  async googleAuthRedirect(@Request() req: any, @Res() res: Response) {
    // Successful authentication, redirect to frontend with token
    const result = this.authService.generateGoogleToken(req.user);
    
    // Set secure cookie
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?login_success=true&token=${result.accessToken}`);
  }

  // POST /api/auth/register
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);

    // Set secure cookie
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return result;
  }

  // POST /api/auth/login
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set secure cookie (30 days if rememberMe, else 1 day)
    const maxAge = dto.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return result;
  }

  // POST /api/auth/logout
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return this.authService.logout();
  }

  // GET /api/auth/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: any) {
    return req.user;
  }

  // PATCH /api/auth/current-language
  @UseGuards(JwtAuthGuard)
  @Patch('current-language')
  async updateCurrentLanguage(
    @Request() req: any,
    @Body() body: { language: string },
  ) {
    const updated = await this.usersService.updateCurrentLanguage(req.user.id, body.language);
    const { password: _, ...safeUser } = updated;
    return safeUser;
  }

  // POST /api/auth/forgot-password
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // POST /api/auth/reset-password
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // POST /api/auth/change-password (authenticated)
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  // POST /api/auth/upload/avatar
  @UseGuards(JwtAuthGuard)
  @Post('upload/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AVATARS_DIR,
        filename: (_req: any, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_SIZE_BYTES },
    }),
  )
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file ảnh.');

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3002}`;
    const avatarUrl = `${backendUrl}/uploads/avatars/${file.filename}`;

    await this.usersService.updateProfile(req.user.id, { avatar: avatarUrl });

    return { avatarUrl };
  }

  // POST /api/auth/upload/cover
  @UseGuards(JwtAuthGuard)
  @Post('upload/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: COVERS_DIR,
        filename: (_req: any, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_SIZE_BYTES },
    }),
  )
  async uploadCover(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file ảnh.');

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3002}`;
    const coverUrl = `${backendUrl}/uploads/covers/${file.filename}`;

    await this.usersService.updateProfile(req.user.id, { coverImage: coverUrl });

    return { coverUrl };
  }
}
