import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictationProgress } from './dictation-progress.entity.js';
import { DictationService } from './dictation.service.js';
import { DictationController } from './dictation.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([DictationProgress])],
  providers: [DictationService],
  controllers: [DictationController],
})
export class DictationModule {}
