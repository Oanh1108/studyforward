import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createNote(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.notesService.createNote(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyNotes(@Request() req: any, @Query('search') search?: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.notesService.getMyNotes(userId, search);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  updateNote(@Request() req: any, @Param('id') id: string, @Body('content') content: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.notesService.updateNote(userId, Number(id), content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteNote(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.notesService.deleteNote(userId, Number(id));
  }
}
