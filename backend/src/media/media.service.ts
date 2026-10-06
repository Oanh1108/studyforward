import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserVideoLesson } from './media.entity.js';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(UserVideoLesson)
    private mediaRepo: Repository<UserVideoLesson>,
  ) {}

  async getUserVideos(userId: number) {
    return this.mediaRepo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async getVideo(userId: number, id: number) {
    const video = await this.mediaRepo.findOne({ where: { id, userId } });
    if (!video) throw new NotFoundException('Video lesson not found');
    return video;
  }

  async saveVideoLesson(userId: number, data: { youtubeVideoId: string; title: string; transcriptData: string; scoreCorrect?: number; scoreTotal?: number }) {
    let video = await this.mediaRepo.findOne({ where: { userId, youtubeVideoId: data.youtubeVideoId } });
    
    if (video) {
      video.title = data.title || video.title;
      video.transcriptData = data.transcriptData || video.transcriptData;
      if (data.scoreCorrect !== undefined) video.scoreCorrect = data.scoreCorrect;
      if (data.scoreTotal !== undefined) video.scoreTotal = data.scoreTotal;
    } else {
      video = this.mediaRepo.create({
        userId,
        youtubeVideoId: data.youtubeVideoId,
        title: data.title,
        transcriptData: data.transcriptData,
        scoreCorrect: data.scoreCorrect || 0,
        scoreTotal: data.scoreTotal || 0,
      });
    }
    return this.mediaRepo.save(video);
  }

  async deleteVideoLesson(userId: number, id: number) {
    await this.mediaRepo.delete({ id, userId });
    return { success: true };
  }
}
