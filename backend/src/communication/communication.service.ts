import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConversationSession } from './conversation-session.entity.js';
import { ConversationMessage } from './conversation-message.entity.js';
import { ConversationFeedback } from './conversation-feedback.entity.js';
import {
  CORRECTION_MODES,
  CorrectionMode,
  HISTORY_LIMIT,
  LEVELS,
  Level,
  MAX_AUDIO_BYTES,
  MODES,
  Mode,
  SCENARIOS,
  TOPICS,
} from './communication.constants.js';
import { AiProviderError, ChatTurn, ConversationAiProvider, TeacherReply } from './ai/conversation-ai.provider.js';
import { buildSummaryPrompt, buildSystemPrompt, PromptContext } from './prompt.builder.js';
import { CreateSessionDto, SendMessageDto, TranscribeDto } from './communication.dto.js';

/** Maps provider failures to HTTP errors the UI can tell apart (admin problem vs. transient). */
export function toHttpError(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  if (err instanceof AiProviderError) {
    const status = { not_configured: 503, unavailable: 503, bad_response: 502, bad_audio: 422 }[err.kind];
    const code = {
      not_configured: 'AI_NOT_CONFIGURED',
      unavailable: 'AI_UNAVAILABLE',
      bad_response: 'AI_BAD_RESPONSE',
      bad_audio: 'AUDIO_NOT_RECOGNISED',
    }[err.kind];
    return new HttpException({ statusCode: status, code, message: err.message }, status);
  }
  return new HttpException(
    { statusCode: 500, code: 'INTERNAL', message: 'Đã xảy ra lỗi không mong muốn.' },
    500,
  );
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  /** Sessions that currently have a turn in flight; a second concurrent turn is rejected. */
  private readonly busy = new Set<string>();

  constructor(
    @InjectRepository(ConversationSession) private readonly sessions: Repository<ConversationSession>,
    @InjectRepository(ConversationMessage) private readonly messages: Repository<ConversationMessage>,
    @InjectRepository(ConversationFeedback) private readonly feedback: Repository<ConversationFeedback>,
    private readonly ai: ConversationAiProvider,
  ) {}

  /** Catalogue + whether the AI backend is configured, so the UI can warn before the user starts. */
  getStatus() {
    return {
      aiConfigured: this.ai.isConfigured(),
      provider: this.ai.name,
      levels: LEVELS,
      modes: MODES,
      correctionModes: CORRECTION_MODES,
      topics: TOPICS,
      scenarios: SCENARIOS.map(({ id, label, labelVi }) => ({ id, label, labelVi })),
    };
  }

  private ctx(s: ConversationSession): PromptContext {
    return { mode: s.mode as Mode, topic: s.topic, level: s.level as Level, correctionMode: s.correctionMode as CorrectionMode };
  }

  private validateTopic(mode: string, topic: string) {
    const list = mode === 'roleplay' ? SCENARIOS : TOPICS;
    if (!list.some((t) => t.id === topic)) {
      throw new BadRequestException('Chủ đề hoặc tình huống không hợp lệ cho chế độ đã chọn.');
    }
  }

  private async owned(userId: number, id: string): Promise<ConversationSession> {
    const s = await this.sessions.findOne({ where: { id, userId } });
    if (!s) throw new NotFoundException('Không tìm thấy phiên hội thoại.');
    return s;
  }

  private toTurns(rows: ConversationMessage[]): ChatTurn[] {
    return rows.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  /** Most recent messages in chronological order. */
  private async recent(sessionId: string, limit = HISTORY_LIMIT): Promise<ConversationMessage[]> {
    const rows = await this.messages.find({ where: { sessionId }, order: { createdAt: 'DESC' }, take: limit });
    return rows.reverse();
  }

  private assistantMeta(r: TeacherReply) {
    return { suggestions: r.suggestions, vocabulary: r.vocabulary, phrases: r.phrases };
  }

  private shape(m: ConversationMessage, fb?: ConversationFeedback | null) {
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      inputType: m.inputType,
      meta: m.meta,
      createdAt: m.createdAt,
      feedback: fb
        ? { original: fb.originalText, corrected: fb.correctedText, explanation: fb.explanation, vocabulary: fb.vocabulary }
        : null,
    };
  }

  async createSession(userId: number, dto: CreateSessionDto) {
    this.validateTopic(dto.mode, dto.topic);
    if (!this.ai.isConfigured()) {
      throw toHttpError(new AiProviderError('Chưa cấu hình GEMINI_API_KEY trên máy chủ.', 'not_configured'));
    }

    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        mode: dto.mode,
        topic: dto.topic,
        level: dto.level,
        correctionMode: dto.correctionMode ?? 'gentle',
        status: 'active',
        completedAt: null,
        summary: null,
      }),
    );

    try {
      const reply = await this.ai.chat({ systemPrompt: buildSystemPrompt(this.ctx(session)), history: [] });
      const opening = await this.messages.save(
        this.messages.create({ sessionId: session.id, role: 'assistant', content: reply.reply, inputType: 'text', meta: this.assistantMeta(reply) }),
      );
      return { session, messages: [this.shape(opening)] };
    } catch (err) {
      // Do not leave an empty session behind when the AI could not open the conversation.
      await this.sessions.delete({ id: session.id });
      this.logger.warn(`Opening message failed: ${(err as Error).message}`);
      throw toHttpError(err);
    }
  }

  async sendMessage(userId: number, sessionId: string, dto: SendMessageDto) {
    const session = await this.owned(userId, sessionId);
    if (session.status !== 'active') throw new ConflictException('Phiên hội thoại đã kết thúc.');
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('Tin nhắn không được để trống.');

    if (this.busy.has(sessionId)) {
      throw new ConflictException('Tin nhắn trước vẫn đang được xử lý. Vui lòng đợi AI trả lời.');
    }
    this.busy.add(sessionId);
    try {
      const history = this.toTurns(await this.recent(sessionId));
      history.push({ role: 'user', content });

      // Ask the AI first: nothing is stored if it fails, so the client can safely retry the same message.
      let reply: TeacherReply;
      try {
        reply = await this.ai.chat({ systemPrompt: buildSystemPrompt(this.ctx(session)), history });
      } catch (err) {
        this.logger.warn(`Teacher turn failed: ${(err as Error).message}`);
        throw toHttpError(err);
      }

      const userMsg = await this.messages.save(
        this.messages.create({ sessionId, role: 'user', content, inputType: dto.inputType === 'voice' ? 'voice' : 'text', meta: null }),
      );
      let fb: ConversationFeedback | null = null;
      if (reply.feedback && session.correctionMode !== 'none') {
        fb = await this.feedback.save(
          this.feedback.create({
            messageId: userMsg.id,
            originalText: content,
            correctedText: reply.feedback.corrected,
            explanation: reply.feedback.explanation,
            vocabulary: reply.feedback.vocabulary,
          }),
        );
      }
      const aiMsg = await this.messages.save(
        this.messages.create({ sessionId, role: 'assistant', content: reply.reply, inputType: 'text', meta: this.assistantMeta(reply) }),
      );
      return { userMessage: this.shape(userMsg, fb), assistantMessage: this.shape(aiMsg) };
    } finally {
      this.busy.delete(sessionId);
    }
  }

  async transcribe(userId: number, sessionId: string, dto: TranscribeDto) {
    const session = await this.owned(userId, sessionId);
    if (session.status !== 'active') throw new ConflictException('Phiên hội thoại đã kết thúc.');
    const audio = Buffer.from(dto.audio, 'base64');
    if (audio.length === 0) throw new BadRequestException('Không nhận được dữ liệu âm thanh.');
    if (audio.length > MAX_AUDIO_BYTES) throw new PayloadTooLargeException('Bản ghi âm quá dài. Hãy nói ngắn hơn.');
    try {
      const transcript = await this.ai.transcribe({ audio, mimeType: dto.mimeType.split(';')[0] });
      if (!transcript) throw new AiProviderError('Không nhận diện được giọng nói. Hãy thử nói rõ hơn.', 'bad_audio');
      return { transcript };
    } catch (err) {
      if (err instanceof AiProviderError && err.kind === 'bad_response') {
        err = new AiProviderError('Không nhận diện được giọng nói. Hãy thử nói rõ hơn.', 'bad_audio');
      }
      throw toHttpError(err);
    }
  }

  async getSession(userId: number, sessionId: string) {
    const session = await this.owned(userId, sessionId);
    const rows = await this.messages.find({ where: { sessionId }, order: { createdAt: 'ASC' } });
    const fbs = rows.length ? await this.feedback.find({ where: { messageId: In(rows.map((r) => r.id)) } }) : [];
    const byMsg = new Map(fbs.map((f) => [f.messageId, f]));
    return { session, messages: rows.map((m) => this.shape(m, byMsg.get(m.id))) };
  }

  async listSessions(userId: number) {
    const sessions = await this.sessions.find({ where: { userId }, order: { startedAt: 'DESC' }, take: 10 });
    return sessions.map((s) => ({
      id: s.id, mode: s.mode, topic: s.topic, level: s.level, status: s.status, startedAt: s.startedAt, completedAt: s.completedAt,
    }));
  }

  async complete(userId: number, sessionId: string) {
    const session = await this.owned(userId, sessionId);
    const rows = await this.messages.find({ where: { sessionId }, order: { createdAt: 'ASC' } });
    const userTurns = rows.filter((m) => m.role === 'user').length;
    const last = rows.length ? rows[rows.length - 1].createdAt : session.startedAt;

    let summaryError: string | null = null;
    if (session.status !== 'completed') {
      let summary: Record<string, unknown> | null = null;
      if (userTurns > 0) {
        try {
          summary = (await this.ai.summarize({
            systemPrompt: buildSummaryPrompt(this.ctx(session)),
            transcript: this.toTurns(rows.slice(-HISTORY_LIMIT * 2)),
          })) as unknown as Record<string, unknown>;
        } catch (err) {
          // Finishing must not depend on the AI being up; the stats below are still real.
          summaryError = (err as Error).message;
          this.logger.warn(`Summary failed: ${summaryError}`);
        }
      }
      session.status = 'completed';
      session.completedAt = new Date();
      session.summary = summary;
      await this.sessions.save(session);
    }

    return {
      sessionId: session.id,
      mode: session.mode,
      topic: session.topic,
      level: session.level,
      durationSeconds: Math.max(0, Math.round((last.getTime() - session.startedAt.getTime()) / 1000)),
      userTurns,
      summary: session.summary,
      summaryError,
    };
  }
}
