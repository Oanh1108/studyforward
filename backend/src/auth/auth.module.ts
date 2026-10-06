import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { GoogleStrategy } from './google.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { PasswordResetToken } from './password-reset-token.entity.js';

@Global()
@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([PasswordResetToken]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'toeic_master_super_secret_key_change_in_production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, JwtAuthGuard, RolesGuard, GoogleStrategy],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
