import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyBoardsController } from './study-boards.controller.js';
import { StudyBoardsService } from './study-boards.service.js';
import { StudyBoard } from './study-board.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([StudyBoard])],
  controllers: [StudyBoardsController],
  providers: [StudyBoardsService]
})
export class StudyBoardsModule {}
