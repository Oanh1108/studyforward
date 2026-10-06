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
import { VocabularyService } from './vocabulary.service.js';
import { CourseType } from './vocabulary.entity.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private service: VocabularyService) {}

  // ==========================================
  // FOLDERS (QUẢN LÝ THƯ MỤC)
  // ==========================================

  // GET /api/vocabulary/folders (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('folders')
  getFolders(@Request() req: any, @Query('language') language?: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getFolders(userId, language);
  }

  // POST /api/vocabulary/folders (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('folders')
  createFolder(
    @Request() req: any,
    @Body() body: { name: string; description?: string; color?: string; language?: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.createFolder(userId, body);
  }

  // PATCH /api/vocabulary/folders/:id (auth required)
  @UseGuards(JwtAuthGuard)
  @Patch('folders/:id')
  updateFolder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; color?: string; language?: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updateFolder(userId, Number(id), body);
  }

  // DELETE /api/vocabulary/folders/:id (auth required)
  @UseGuards(JwtAuthGuard)
  @Delete('folders/:id')
  deleteFolder(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteFolder(userId, Number(id));
  }

  // ==========================================
  // MY VOCABULARY (TỪ VỰNG CỦA TÔI)
  // ==========================================

  // GET /api/vocabulary/my-words (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('my-words')
  getMyWords(
    @Request() req: any,
    @Query('folderId') folderId?: string,
    @Query('folderIds') folderIds?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('language') language?: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getMyWords(userId, { folderId, folderIds, status, search, language });
  }

  // POST /api/vocabulary/my-words (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('my-words')
  addMyWord(
    @Request() req: any,
    @Body()
    body: {
      folderId?: number | null;
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
      synonyms?: string;
      antonyms?: string;
      example?: string;
      exampleTranslation?: string;
      notes?: string;
      allowDuplicate?: boolean;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.addMyWord(userId, body);
  }

  // PATCH /api/vocabulary/my-words/:id (auth required)
  @UseGuards(JwtAuthGuard)
  @Patch('my-words/:id')
  updateMyWord(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      word?: string;
      meaning?: string;
      language?: string;
      reading?: string;
      ipa?: string;
      pinyin?: string;
      kana?: string;
      romaji?: string;
      romaja?: string;
      thaiReading?: string;
      partOfSpeech?: string;
      synonyms?: string;
      antonyms?: string;
      example?: string;
      exampleTranslation?: string;
      notes?: string;
      status?: string;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updateMyWord(userId, Number(id), body);
  }

  // PATCH /api/vocabulary/my-words/:id/move (auth required)
  @UseGuards(JwtAuthGuard)
  @Patch('my-words/:id/move')
  moveMyWord(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { targetFolderId: number | null },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.moveMyWord(userId, Number(id), body.targetFolderId);
  }

  // DELETE /api/vocabulary/my-words/:id (auth required)
  @UseGuards(JwtAuthGuard)
  @Delete('my-words/:id')
  deleteMyWord(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteMyWord(userId, Number(id));
  }

  // POST /api/vocabulary/my-words/:id/study (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('my-words/:id/study')
  recordStudy(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { remembered?: boolean; rating?: string | number },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    const ratingVal = body.rating !== undefined ? body.rating : Boolean(body.remembered);
    return this.service.recordCustomWordStudy(userId, Number(id), ratingVal);
  }

  // POST /api/vocabulary/study/quiz-evaluate (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('study/quiz-evaluate')
  evaluateQuiz(
    @Request() req: any,
    @Body()
    body: {
      wordId: number;
      selections: {
        meaning: string[];
        synonym: string[];
        antonym: string[];
      };
      // Allow frontend to control if it actually records SRS (useful for retries where we only record once)
      recordSrs?: boolean;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.evaluateQuiz(userId, body);
  }

  // POST /api/vocabulary/study/session-complete (auth required)
  // POST /api/vocabulary/study/evaluate-dictation (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('study/evaluate-dictation')
  evaluateDictation(
    @Request() req: any,
    @Body()
    body: {
      wordId: number;
      typingInput: string;
      synonymChips: string[];
      synonymTestMode: string;
      recordSrs?: boolean;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.evaluateDictation(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('study/session-complete')
  completeStudySession(
    @Request() req: any,
    @Body()
    body: {
      sessionId: string;
      mode: string;
      language?: string;
      folderIds?: string | number[] | null;
      totalWords: number;
      correctCount: number;
      durationSeconds: number;
        isCompleted?: boolean;
      details?: Array<{
        wordId: number;
        rating?: string | number;
        isCorrect: boolean;
        userAnswer?: string;
      }>;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.completeStudySession(userId, body);
  }

  // GET /api/vocabulary/study/sessions/:id (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('study/sessions/:id')
  getStudySession(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getStudySession(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('study/incomplete-sessions')
  getIncompleteStudySessions(@Request() req: any, @Query('language') language?: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getIncompleteStudySessions(userId, language);
  }

  @UseGuards(JwtAuthGuard)
  @Get('study/recent-session')
  getRecentStudySession(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getRecentStudySession(userId);
  }

  // POST /api/vocabulary/my-words/bulk-import (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('my-words/bulk-import')
  bulkImport(
    @Request() req: any,
    @Body()
    body: {
      folderId?: number | null;
      newFolderName?: string;
      language?: string;
      items: any[];
      duplicateStrategy?: 'skip' | 'update' | 'keep_both';
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.bulkImport(userId, body);
  }

  // GET /api/vocabulary/my-words/reanalyze/preview (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('my-words/reanalyze/preview')
  reanalyzePreview(@Request() req: any, @Query('language') language?: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.reanalyzePreview(userId, language);
  }

  // POST /api/vocabulary/my-words/reanalyze/apply (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('my-words/reanalyze/apply')
  reanalyzeApply(@Request() req: any, @Body() body: { itemIds: number[] }) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.reanalyzeApply(userId, body.itemIds || []);
  }


  // ==========================================
  // AI MEANING SUGGESTIONS & AUTO-ENRICHMENT
  // ==========================================

  // POST /api/vocabulary/ai/suggest
  @Post('ai/suggest')
  suggestMeanings(
    @Body() body: { word: string; context?: string; language?: string },
  ) {
    return this.service.suggestMeanings(body.word, body.context, body.language || 'en');
  }

  // POST /api/vocabulary/ai/enrich-batch
  @Post('ai/enrich-batch')
  enrichBatch(
    @Body()
    body: {
      items: Array<{ word: string; meaning?: string; example?: string }>;
      language?: string;
    },
  ) {
    return this.service.enrichBatch(body.items || [], body.language || 'en');
  }

  // ==========================================
  // EXISTING CURRICULUM ENDPOINTS (BACKWARD COMPATIBLE)
  // ==========================================

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

  // GET /api/vocabulary/progress?course=toeic (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('progress')
  getProgress(@Request() req: any, @Query('course') course: CourseType = CourseType.TOEIC) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getUserProgress(userId, course);
  }

  // GET /api/vocabulary/review (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('review')
  getDueWords(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getDueWords(userId);
  }

  // POST /api/vocabulary/mark (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('mark')
  mark(
    @Request() req: any,
    @Body() body: { vocabularyId: number; correct: boolean },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.markResult(userId, body.vocabularyId, body.correct);
  }

  // Legacy custom routes
  @UseGuards(JwtAuthGuard)
  @Get('custom')
  getCustomWords(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getCustomWords(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('custom')
  addCustomWord(
    @Request() req: any,
    @Body() body: { listName?: string; word: string; meaning?: string; example?: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.addCustomWord(userId, body.listName ?? '', body.word, body.meaning, body.example);
  }

  @UseGuards(JwtAuthGuard)
  @Post('custom/bulk')
  addCustomWordsBulk(
    @Request() req: any,
    @Body() body: { listName?: string; items: Array<{ word: string; meaning?: string; example?: string }> },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.addCustomWordsBulk(userId, body.listName ?? '', body.items ?? []);
  }

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

  @UseGuards(JwtAuthGuard)
  @Delete('custom/:id')
  deleteCustomWord(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteCustomWord(userId, Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('custom/list/:name')
  deleteCustomList(
    @Request() req: any,
    @Param('name') name: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteCustomList(userId, decodeURIComponent(name));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('custom/list/rename')
  renameCustomList(
    @Request() req: any,
    @Body() body: { oldName: string; newName: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.renameCustomList(userId, body.oldName, body.newName);
  }

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
