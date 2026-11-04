import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationSession } from './conversation-session.entity.js';
import { ConversationMessage } from './conversation-message.entity.js';
import { ConversationFeedback } from './conversation-feedback.entity.js';
import { ConversationAiProvider } from './ai/conversation-ai.provider.js';
import { GeminiConversationProvider } from './ai/gemini-conversation.provider.js';
import { CommunicationService } from './communication.service.js';
import { CommunicationController } from './communication.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationSession, ConversationMessage, ConversationFeedback])],
  controllers: [CommunicationController],
  providers: [CommunicationService, { provide: ConversationAiProvider, useClass: GeminiConversationProvider }],
})
export class CommunicationModule {}
