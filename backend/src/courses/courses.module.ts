import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './lesson.entity.js';
import { UserLessonProgress } from './user-lesson-progress.entity.js';
import { User } from '../users/user.entity.js';
import { UserActivityLog } from '../users/user-activity-log.entity.js';
import { CoursesService } from './courses.service.js';
import { CoursesController } from './courses.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lesson,
      UserLessonProgress,
      User,
      UserActivityLog,
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
