import { Controller, Post, Body } from '@nestjs/common';
import { CommunicationService } from './communication.service.js';
import { ChatRequestDto } from './communication.dto.js';

@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post('chat')
  async chat(@Body() body: ChatRequestDto) {
    return this.communicationService.chat(body);
  }
}

