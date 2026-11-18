import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller.js';
import { CommunicationService } from './communication.service.js';

@Module({
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}

