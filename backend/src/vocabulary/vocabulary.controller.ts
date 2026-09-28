import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { VocabularyService } from './vocabulary.service.js';
import { CourseType } from './vocabulary.entity.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private service: VocabularyService) {}

  // GET /api/vocabulary/topics?course=toeic
  @Get('topics')
  getTopics(@Query('course') course: CourseType = CourseType.TOEIC) {
    return this.service.getTopics(course);
  }

  // GET /api/vocabulary/words?course=toeic&topic=Business
  @Get('words')
  getWords(
    @Query('course') course: CourseType = CourseType.TOEIC,
    @Query('topic') topic: string,
  ) {
    return this.service.getByTopic(course, topic);
  }

  // GET /api/vocabulary/search?course=toeic&q=contract
  @Get('search')
  search(
    @Query('course') course: CourseType = CourseType.TOEIC,
    @Query('q') q: string,
  ) {
    return this.service.search(course, q);
  }

  // GET /api/vocabulary/progress?course=toeic  (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('progress')
  getProgress(@Request() req: any, @Query('course') course: CourseType = CourseType.TOEIC) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getUserProgress(userId, course);
  }

  // GET /api/vocabulary/review  (auth required) — SRS due words
  @UseGuards(JwtAuthGuard)
  @Get('review')
  getDueWords(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getDueWords(userId);
  }

  // POST /api/vocabulary/mark  (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('mark')
  mark(
    @Request() req: any,
    @Body() body: { vocabularyId: number; correct: boolean },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.markResult(userId, body.vocabularyId, body.correct);
  }

  // GET /api/vocabulary/custom (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('custom')
  getCustomWords(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getCustomWords(userId);
  }

  // POST /api/vocabulary/custom (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('custom')
  addCustomWord(
    @Request() req: any,
    @Body() body: { listName?: string; word: string; meaning?: string; example?: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.addCustomWord(userId, body.listName ?? '', body.word, body.meaning, body.example);
  }

  // POST /api/vocabulary/custom/bulk (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('custom/bulk')
  addCustomWordsBulk(
    @Request() req: any,
    @Body() body: { listName?: string; items: Array<{ word: string; meaning?: string; example?: string }> },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.addCustomWordsBulk(userId, body.listName ?? '', body.items ?? []);
  }

  // PATCH /api/vocabulary/custom/:id (auth required)
  @UseGuards(JwtAuthGuard)
  @Patch('custom/:id')
  updateCustomWord(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { word?: string; meaning?: string; example?: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updateCustomWord(userId, Number(id), body);
  }

  // DELETE /api/vocabulary/custom/:id (auth required)
  @UseGuards(JwtAuthGuard)
  @Delete('custom/:id')
  deleteCustomWord(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteCustomWord(userId, Number(id));
  }

  // DELETE /api/vocabulary/custom/list/:name (auth required)
  @UseGuards(JwtAuthGuard)
  @Delete('custom/list/:name')
  deleteCustomList(
    @Request() req: any,
    @Param('name') name: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteCustomList(userId, decodeURIComponent(name));
  }

  // PATCH /api/vocabulary/custom/list/rename (auth required)
  @UseGuards(JwtAuthGuard)
  @Patch('custom/list/rename')
  renameCustomList(
    @Request() req: any,
    @Body() body: { oldName: string; newName: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.renameCustomList(userId, body.oldName, body.newName);
  }

  // PATCH /api/vocabulary/custom/:id/progress (auth required)
  @UseGuards(JwtAuthGuard)
  @Patch('custom/:id/progress')
  updateCustomWordProgress(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { stage: number; intervalDays: number },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updateCustomWordProgress(
      userId,
      Number(id),
      Number(body.stage) || 1,
      Number(body.intervalDays) || 1,
    );
  }

  // POST /api/vocabulary/record-learning (auth required) - Save learning progress for ANY word in ANY study mode
  @UseGuards(JwtAuthGuard)
  @Post('record-learning')
  recordWordLearning(
    @Request() req: any,
    @Body()
    body: {
      word: string;
      meaning?: string;
      example?: string;
      listName?: string;
      stage?: number;
      intervalDays?: number;
      isCorrect?: boolean;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.recordWordLearning(userId, body);
  }

  // POST /api/vocabulary/record-learning/batch (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('record-learning/batch')
  recordWordLearningBatch(
    @Request() req: any,
    @Body()
    body: {
      items: Array<{
        word: string;
        meaning?: string;
        example?: string;
        listName?: string;
        stage?: number;
        intervalDays?: number;
        isCorrect?: boolean;
      }>;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.recordWordsLearningBatch(userId, body.items ?? []);
  }
}
