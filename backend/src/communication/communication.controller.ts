import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CommunicationService } from './communication.service.js';
import { CreateSessionDto, SendMessageDto, TranscribeDto } from './communication.dto.js';

@Controller('communication')
@UseGuards(JwtAuthGuard)
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}

  @Get('status')
  status() {
    return this.service.getStatus();
  }

  @Get('sessions')
  list(@Request() req: any) {
    return this.service.listSessions(req.user.id);
  }

  @Post('sessions')
  create(@Request() req: any, @Body() dto: CreateSessionDto) {
    return this.service.createSession(req.user.id, dto);
  }

  @Get('sessions/:id')
  get(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSession(req.user.id, id);
  }

  @Post('sessions/:id/messages')
  send(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendMessageDto) {
    return this.service.sendMessage(req.user.id, id, dto);
  }

  @Post('sessions/:id/audio')
  transcribe(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TranscribeDto) {
    return this.service.transcribe(req.user.id, id, dto);
  }

  @Post('sessions/:id/complete')
  complete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.complete(req.user.id, id);
  }
}
