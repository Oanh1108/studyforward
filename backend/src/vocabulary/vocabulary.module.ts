import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vocabulary } from './vocabulary.entity.js';
import { UserVocabulary } from './user-vocabulary.entity.js';
import { CustomVocabulary } from './custom-vocabulary.entity.js';
import { VocabularyFolder } from './vocabulary-folder.entity.js';
import { VocabularyStudySession } from './vocabulary-study-session.entity.js';
import { VocabularyService } from './vocabulary.service.js';
import { VocabularyController } from './vocabulary.controller.js';
import { AiVocabularyService } from './ai-vocabulary.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vocabulary,
      UserVocabulary,
      CustomVocabulary,
      VocabularyFolder,
      VocabularyStudySession,
    ]),
    AuthModule,
  ],
  providers: [VocabularyService, AiVocabularyService],
  controllers: [VocabularyController],
  exports: [VocabularyService, AiVocabularyService],
})
export class VocabularyModule {}
