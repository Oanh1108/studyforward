import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminLog } from './admin-log.entity.js';
import { User } from '../users/user.entity.js';
import { Vocabulary } from '../vocabulary/vocabulary.entity.js';
import { CustomVocabulary } from '../vocabulary/custom-vocabulary.entity.js';
import { VocabularyFolder } from '../vocabulary/vocabulary-folder.entity.js';
import { UserVocabulary } from '../vocabulary/user-vocabulary.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminLog,
      User,
      Vocabulary,
      CustomVocabulary,
      VocabularyFolder,
      UserVocabulary,
    ]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
