import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './user.entity.js';
import { UserActivityLog } from './user-activity-log.entity.js';
import { CustomVocabulary } from '../vocabulary/custom-vocabulary.entity.js';
import { UserVocabulary } from '../vocabulary/user-vocabulary.entity.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserActivityLog,
      CustomVocabulary,
      UserVocabulary,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
