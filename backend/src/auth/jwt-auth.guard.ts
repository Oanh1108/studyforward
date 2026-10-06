import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token: string | null = null;

    const authHeader = request.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (request?.cookies?.accessToken) {
      token = request.cookies.accessToken;
    } else if (request?.headers?.cookie) {
      const match = request.headers.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc không hợp lệ');
    }

    const userId = payload.sub ?? payload.id;
    const user = await this.usersService.findById(Number(userId));

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    if (user.isLocked) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
      );
    }

    const { password: _, ...safeUser } = user;
    request.user = safeUser;
    return true;
  }
}
