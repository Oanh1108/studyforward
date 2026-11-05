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
import { fetchViaSupadata, groupIntoSegments, type RawTranscriptItem } from './youtube-transcript.util.js';

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
    let items: RawTranscriptItem[] | null = null;
    try {
      items = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (error) {
      // Keep the real cause in the server log: the response only carries a short code the page can act on.
      console.error(`[youtube transcript] ${videoId}:`, error instanceof Error ? `${error.constructor.name}: ${error.message}` : error);
      const problem = describeTranscriptError(error);
      // When YouTube refuses this server (cloud addresses often get refused), ask a transcript service instead.
      // Skipped when the video simply has no captions, so credits are not spent for nothing.
      const apiKey = process.env.SUPADATA_API_KEY;
      if (apiKey && problem.code !== 'NO_CAPTIONS') {
        try {
          items = await fetchViaSupadata(videoId, apiKey);
        } catch (fallbackError) {
          console.error(`[youtube transcript] fallback failed for ${videoId}:`, fallbackError instanceof Error ? fallbackError.message : fallbackError);
        }
      }
      if (!items || items.length === 0) throw new BadRequestException(problem);
    }
    return { success: true, segments: groupIntoSegments(items) };
  }
}
