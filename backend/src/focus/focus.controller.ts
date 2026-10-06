import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { FocusService } from './focus.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('focus')
export class FocusController {
  constructor(private readonly service: FocusService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createSession(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.createSession(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getHistory(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getHistory(userId);
  }
}
