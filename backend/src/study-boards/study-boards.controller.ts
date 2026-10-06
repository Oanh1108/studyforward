import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { StudyBoardsService } from './study-boards.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('study-boards')
@UseGuards(JwtAuthGuard)
export class StudyBoardsController {
  constructor(private readonly studyBoardsService: StudyBoardsService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.studyBoardsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.studyBoardsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Body('name') name: string, @Request() req: any) {
    return this.studyBoardsService.create(req.user.id, name || 'Bảng không tên');
  }

  @Put(':id/data')
  async updateData(
    @Param('id') id: string,
    @Body('data') data: any,
    @Body('version') version: number,
    @Request() req: any
  ) {
    try {
      return await this.studyBoardsService.updateData(id, req.user.id, data, version);
    } catch (error: any) {
      if (error.message === 'VERSION_CONFLICT') {
        throw new HttpException('Dữ liệu đã bị thay đổi ở nơi khác (Xung đột phiên bản).', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }
  
  @Put(':id/name')
  async updateName(
    @Param('id') id: string,
    @Body('name') name: string,
    @Request() req: any
  ) {
    return this.studyBoardsService.updateName(id, req.user.id, name);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.studyBoardsService.remove(id, req.user.id);
  }
}
