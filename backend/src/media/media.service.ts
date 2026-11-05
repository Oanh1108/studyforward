import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserVideoLesson } from './media.entity.js';
import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript';

export type TranscriptErrorCode = 'NO_CAPTIONS' | 'VIDEO_UNAVAILABLE' | 'BLOCKED';

/** Tells "this video has no captions" apart from "YouTube refused our server", which need different advice. */
export function describeTranscriptError(error: unknown): { message: string; code: TranscriptErrorCode } {
  if (
    error instanceof YoutubeTranscriptDisabledError ||
    error instanceof YoutubeTranscriptNotAvailableError ||
    error instanceof YoutubeTranscriptNotAvailableLanguageError
  ) {
    return { code: 'NO_CAPTIONS', message: 'Video này không có phụ đề để lấy tự động.' };
  }
  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return { code: 'VIDEO_UNAVAILABLE', message: 'Không tìm thấy video này, hoặc video bị giới hạn nên không lấy được phụ đề.' };
  }
  return {
    code: 'BLOCKED',
    message: 'YouTube đang từ chối yêu cầu lấy phụ đề từ máy chủ (thường gặp khi máy chủ nằm trên dịch vụ cloud).',
  };
}

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
      // Keep the real cause in the server log: the response only carries a short code the page can act on.
      console.error(`[youtube transcript] ${videoId}:`, error instanceof Error ? `${error.constructor.name}: ${error.message}` : error);
      throw new BadRequestException(describeTranscriptError(error));
    }
  }
}
