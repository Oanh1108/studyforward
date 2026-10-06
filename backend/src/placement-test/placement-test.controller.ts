import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PlacementTestService } from './placement-test.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('placement-test')
@UseGuards(JwtAuthGuard)
export class PlacementTestController {
  constructor(private readonly placementTestService: PlacementTestService) {}

  @Get('questions')
  getQuestions() {
    return this.placementTestService.getQuestions();
  }

  @Post('submit')
  submitTest(@Request() req: any, @Body() body: { answers: { questionId: number, selectedAnswerIndex: number }[] }) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.placementTestService.submitTest(userId, body.answers);
  }

  @Get('history')
  getHistory(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.placementTestService.getHistory(userId);
  }
}
