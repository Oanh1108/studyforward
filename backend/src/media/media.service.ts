import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserVideoLesson } from './media.entity.js';
import { YoutubeTranscript } from 'youtube-transcript';

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

  async fetchTranscript(videoId: string) {
    try {
      const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Grouping logic: roughly group into sentences or short phrases.
      const segments = [];
      let currentSegment = { startTime: 0, endTime: 0, text: '' };
      
      for (const item of transcriptList) {
        if (!currentSegment.text) {
          currentSegment.startTime = item.offset / 1000;
          currentSegment.text = item.text;
          currentSegment.endTime = (item.offset + item.duration) / 1000;
        } else {
          // If the current text is too short or doesn't end with punctuation, append.
          // Very basic heuristic for grouping:
          currentSegment.text += ' ' + item.text;
          currentSegment.endTime = (item.offset + item.duration) / 1000;
        }
        
        // If segment is > 5 seconds long or ends with sentence ending punctuation, push it.
        const duration = currentSegment.endTime - currentSegment.startTime;
        const endsWithPunctuation = /[.!?]$/.test(currentSegment.text);
        if (duration > 5 || endsWithPunctuation) {
          segments.push({ ...currentSegment });
          currentSegment = { startTime: 0, endTime: 0, text: '' };
        }
      }
      
      // Push any remaining segment
      if (currentSegment.text) {
        segments.push(currentSegment);
      }
      
      return { success: true, segments };
    } catch (error) {
      throw new BadRequestException('Không thể lấy transcript tự động cho video này. Video có thể không có phụ đề hoặc bị chặn lấy phụ đề.');
    }
  }
}
