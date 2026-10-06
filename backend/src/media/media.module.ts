import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserVideoLesson } from './media.entity.js';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserVideoLesson])],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
