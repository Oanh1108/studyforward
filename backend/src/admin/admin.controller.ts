import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/user.entity.js';
import { CourseType } from '../vocabulary/vocabulary.entity.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  // 1. Overview Stats (Aggregate level only)
  @Get('stats')
  getStats() {
    return this.adminService.getOverviewStats();
  }

  // 2. User Management
  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      search,
      role,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Patch('users/:id/lock')
  setUserLock(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { isLocked: boolean },
  ) {
    return this.adminService.setUserLockStatus(req.user, Number(id), Boolean(body.isLocked));
  }

  @Patch('users/:id/role')
  setUserRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { role: UserRole },
  ) {
    return this.adminService.changeUserRole(req.user, Number(id), body.role);
  }

  @Delete('users/:id')
  deleteUser(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(req.user, Number(id));
  }

  // 3. Shared Curriculum Vocab Management
  @Get('curriculum-vocab')
  getCurriculumVocab(
    @Query('search') search?: string,
    @Query('topic') topic?: string,
    @Query('course') course?: CourseType,
    @Query('language') language?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getCurriculumWords({
      search,
      topic,
      course,
      language,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 15,
    });
  }

  @Post('curriculum-vocab')
  createCurriculumWord(
    @Request() req: any,
    @Body()
    body: {
      course?: CourseType;
      topic: string;
      word: string;
      meaning: string;
      language?: string;
      reading?: string;
      ipa?: string;
      pinyin?: string;
      kana?: string;
      romaji?: string;
      romaja?: string;
      thaiReading?: string;
      partOfSpeech?: string;
      exampleEn?: string;
      exampleVi?: string;
    },
  ) {
    return this.adminService.createCurriculumWord(req.user, body);
  }

  @Patch('curriculum-vocab/:id')
  updateCurriculumWord(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateCurriculumWord(req.user, Number(id), body);
  }

  @Delete('curriculum-vocab/:id')
  deleteCurriculumWord(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteCurriculumWord(req.user, Number(id));
  }

  // 4. Audit Logs
  @Get('logs')
  getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
