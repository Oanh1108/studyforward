import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto.name, dto.email, dto.password, dto.goal);
    const token = this.signToken(user.id, user.email);
    return {
      accessToken: token,
      user: { id: user.id, name: user.name, email: user.email, goal: user.goal, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const token = this.signToken(user.id, user.email);
    return {
      accessToken: token,
      user: { id: user.id, name: user.name, email: user.email, goal: user.goal, role: user.role },
    };
  }

  // Logout is handled client-side by deleting the token.
  // This endpoint just confirms the action server-side.
  logout() {
    return { message: 'Đăng xuất thành công' };
  }

  private signToken(userId: number, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
