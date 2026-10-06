import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  Put,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { SpeakingService } from './speaking.service.js';

@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) {}

  @Get('prompts')
  @UseGuards(JwtAuthGuard)
  async getPrompts(@Query('language') language?: string) {
    return this.speakingService.getPrompts(language || 'en');
  }

  @Get('topics')
  @UseGuards(JwtAuthGuard)
  async getTopics(@Query('language') language?: string) {
    return this.speakingService.getTopics(language || 'en');
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Query('language') language?: string) {
    return this.speakingService.getStats(language || 'en');
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard)
  async seedAiPrompts(
    @Body() body: { topic: string; level: string; language?: string }
  ) {
    return this.speakingService.seedAiPrompts(body.topic, body.level, body.language || 'en');
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getActiveSessions(@Request() req: any) {
    return this.speakingService.getActiveSessions(req.user.id);
  }

  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  async createSession(
    @Request() req: any,
    @Body()
    body: {
      language: string;
      topic: string;
      level: string;
      mode: string;
      requestedCount: number;
    },
  ) {
    return this.speakingService.createSession(
      req.user.id,
      body.language || 'en',
      body.topic,
      body.level,
      body.mode,
      body.requestedCount,
    );
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async getSession(@Request() req: any, @Param('id') sessionId: string) {
    return this.speakingService.getSession(req.user.id, sessionId);
  }

  @Post('evaluate')
  @UseGuards(JwtAuthGuard)
  async evaluateTranscript(
    @Body()
    body: {
      transcript: string;
      targetSentence: string;
      targetLanguage: string;
      meaningVi: string;
      mode: string;
    },
  ) {
    return this.speakingService.evaluateTranscript(
      body.transcript,
      body.targetSentence,
      body.targetLanguage,
      body.meaningVi,
      body.mode,
    );
  }

  @Put('sessions/:id/progress')
  @UseGuards(JwtAuthGuard)
  async updateSessionProgress(
    @Request() req: any,
    @Param('id') sessionId: string,
    @Body() body: { newIndex: number },
  ) {
    return this.speakingService.updateSessionProgress(req.user.id, sessionId, body.newIndex);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req: any, @Query('language') language?: string) {
    const userId = req.user.id;
    return this.speakingService.getHistory(userId, language);
  }

  @Post('history')
  @UseGuards(JwtAuthGuard)
  async recordHistory(
    @Request() req: any,
    @Body()
    body: {
      sentence: string;
      score: number;
      fluency: number;
      pronunciation: number;
      feedback: string;
      language?: string;
      sessionId?: string;
      promptId?: string;
    },
  ) {
    const userId = req.user.id;
    return this.speakingService.recordHistory(userId, body);
  }
}
