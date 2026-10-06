import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CoursesService } from './courses.service.js';
import { CourseLevel, SkillType } from './lesson.entity.js';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('lessons')
  @UseGuards(JwtAuthGuard)
  async getLessons(
    @Request() req: any,
    @Query('level') level?: string,
    @Query('skill') skill?: string,
    @Query('language') language?: string,
  ) {
    const userId = req.user?.id || 1;
    return this.coursesService.getLessons(userId, level, skill, language);
  }

  @Post('lessons/:id/progress')
  @UseGuards(JwtAuthGuard)
  async updateProgress(
    @Request() req: any,
    @Param('id') lessonId: string,
    @Body('progress') progress: number,
  ) {
    const userId = req.user.id;
    return this.coursesService.updateProgress(userId, lessonId, progress || 0);
  }

  @Post('lessons/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeLesson(
    @Request() req: any,
    @Param('id') lessonId: string,
    @Body('score') score?: number,
    @Body('stars') stars?: number,
  ) {
    const userId = req.user.id;
    return this.coursesService.completeLesson(
      userId,
      lessonId,
      score ?? 100,
      stars ?? 3,
    );
  }
}
