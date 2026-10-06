import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyNote } from './note.entity.js';
import { NotesService } from './notes.service.js';
import { NotesController } from './notes.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([StudyNote])],
  providers: [NotesService],
  controllers: [NotesController],
  exports: [NotesService],
})
export class NotesModule {}
