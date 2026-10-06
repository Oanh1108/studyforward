import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { LearningPathsService } from './learning-paths.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('learning-paths')
export class LearningPathsController {
  constructor(private readonly service: LearningPathsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createPath(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.createPath(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyPaths(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getMyPaths(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getPath(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getPath(Number(id), userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  updatePath(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updatePath(Number(id), userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePath(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deletePath(Number(id), userId);
  }

  // SECTIONS
  @UseGuards(JwtAuthGuard)
  @Post(':id/sections')
  createSection(@Request() req: any, @Param('id') id: string, @Body('title') title: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.createSection(Number(id), userId, title);
  }

  @UseGuards(JwtAuthGuard)
  @Put('sections/:id')
  updateSection(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updateSection(Number(id), userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sections/:id')
  deleteSection(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteSection(Number(id), userId);
  }

  // ITEMS
  @UseGuards(JwtAuthGuard)
  @Post('sections/:id/items')
  createItem(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.createItem(Number(id), userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('items/:id')
  updateItem(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updateItem(Number(id), userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:id')
  deleteItem(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteItem(Number(id), userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('sections/:id/reorder-items')
  reorderItems(@Request() req: any, @Param('id') id: string, @Body('itemIds') itemIds: number[]) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.reorderItems(Number(id), userId, itemIds);
  }

  // PROGRESS
  @UseGuards(JwtAuthGuard)
  @Post('items/:id/complete')
  markItemCompleted(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.markItemCompleted(Number(id), userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:id/complete')
  unmarkItemCompleted(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.unmarkItemCompleted(Number(id), userId);
  }
}
