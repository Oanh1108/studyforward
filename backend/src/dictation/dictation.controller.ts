import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { DictationService } from './dictation.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('dictation/progress')
@UseGuards(JwtAuthGuard)
export class DictationController {
  constructor(private readonly service: DictationService) {}

  @Get()
  getMine(@Request() req: any) {
    return this.service.getMine(req.user?.id ?? req.user?.sub);
  }

  @Post('record')
  record(@Request() req: any, @Body() body: { itemKey?: string; score?: number }) {
    return this.service.record(req.user?.id ?? req.user?.sub, body?.itemKey, body?.score);
  }

  @Post('import')
  importMany(@Request() req: any, @Body() body: { items?: unknown }) {
    return this.service.importMany(req.user?.id ?? req.user?.sub, body?.items);
  }
}
