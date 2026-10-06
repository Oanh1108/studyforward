import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpeakingPrompt } from './speaking-prompt.entity.js';
import { SpeakingHistory } from './speaking-history.entity.js';
import { SpeakingSession } from './speaking-session.entity.js';
import { User } from '../users/user.entity.js';
import { UserActivityLog } from '../users/user-activity-log.entity.js';
import { SpeakingService } from './speaking.service.js';
import { SpeakingController } from './speaking.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpeakingPrompt,
      SpeakingHistory,
      SpeakingSession,
      User,
      UserActivityLog,
    ]),
  ],
  controllers: [SpeakingController],
  providers: [SpeakingService],
  exports: [SpeakingService],
})
export class SpeakingModule {}
