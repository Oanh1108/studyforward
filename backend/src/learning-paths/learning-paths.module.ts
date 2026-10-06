import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningPath, LearningPathSection, LearningPathItem, LearningPathProgress } from './learning-path.entity.js';
import { LearningPathsService } from './learning-paths.service.js';
import { LearningPathsController } from './learning-paths.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([LearningPath, LearningPathSection, LearningPathItem, LearningPathProgress])],
  providers: [LearningPathsService],
  controllers: [LearningPathsController],
  exports: [LearningPathsService],
})
export class LearningPathsModule {}
