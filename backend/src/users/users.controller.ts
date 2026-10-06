import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsersService, UpdateUserProfileDto } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Request() req: any, @Query('language') language?: string) {
    const userId = req.user.id;
    return this.usersService.getUserStats(userId, language);
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@Request() req: any, @Body() dto: UpdateUserProfileDto) {
    const userId = req.user.id;
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/activity-history')
  @UseGuards(JwtAuthGuard)
  async getActivityHistory(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.usersService.getActivityHistory(userId);
  }

  @Post('me/activity')
  @UseGuards(JwtAuthGuard)
  async logActivity(
    @Request() req: any,
    @Body() body: { minutes: number; xp?: number; wordsCount?: number },
  ) {
    const userId = req.user.id;
    return this.usersService.logActivity(
      userId,
      body.minutes || 0,
      body.xp || 0,
      body.wordsCount || 0,
    );
  }
}
