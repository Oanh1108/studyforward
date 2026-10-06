import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('youtube')
  getUserVideos(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.mediaService.getUserVideos(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('youtube/:id')
  getVideo(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.mediaService.getVideo(userId, Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post('youtube')
  saveVideoLesson(
    @Request() req: any,
    @Body() body: { youtubeVideoId: string; title: string; transcriptData: string; scoreCorrect?: number; scoreTotal?: number }
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.mediaService.saveVideoLesson(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('youtube/:id')
  deleteVideoLesson(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.mediaService.deleteVideoLesson(userId, Number(id));
  }
}
