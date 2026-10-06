import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class GoogleAuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message || 'Đăng nhập Google thất bại';

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Redirect to login page with error
    response.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
  }
}
