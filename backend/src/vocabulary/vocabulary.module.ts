import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vocabulary } from './vocabulary.entity.js';
import { UserVocabulary } from './user-vocabulary.entity.js';
import { CustomVocabulary } from './custom-vocabulary.entity.js';
import { VocabularyService } from './vocabulary.service.js';
import { VocabularyController } from './vocabulary.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vocabulary, UserVocabulary, CustomVocabulary]),
    AuthModule,
  ],
  providers: [VocabularyService],
  controllers: [VocabularyController],
})
export class VocabularyModule {}
