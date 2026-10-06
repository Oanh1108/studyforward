import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';
import { UserRole } from '../users/user.entity.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    if (user.isLocked) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa');
    }

    const userRole = String(user.role || '').toLowerCase();
    const hasRole = requiredRoles.some(
      (r) => String(r).toLowerCase() === userRole,
    );

    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền quản trị viên');
    }

    return true;
  }
}
