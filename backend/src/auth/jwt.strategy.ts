import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          if (req?.cookies?.accessToken) {
            return req.cookies.accessToken;
          }
          if (req?.headers?.cookie) {
            const match = req.headers.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : null;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'toeic_master_super_secret_key_change_in_production',
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc không hợp lệ');
    if (user.isLocked) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }
    const { password: _, ...result } = user;
    return result;
  }
}
