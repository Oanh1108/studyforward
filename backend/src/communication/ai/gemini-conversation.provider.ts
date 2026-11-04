import { Injectable } from '@nestjs/common';
import { geminiFetch } from '../../common/gemini.js';
import {
  AiProviderError,
  ChatTurn,
  ConversationAiProvider,
  SessionSummary,
  TeacherReply,
  VocabItem,
} from './conversation-ai.provider.js';

const START_TURN = '(The student has just joined. Start the conversation now.)';

const str = (v: unknown, max = 1000): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strArr = (v: unknown, limit: number): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, 200)).filter(Boolean).slice(0, limit) : [];
const vocabArr = (v: unknown, limit: number): VocabItem[] =>
  Array.isArray(v)
    ? v
        .map((x) => ({ term: str((x as any)?.term, 80), meaning: str((x as any)?.meaning, 160) }))
        .filter((x) => x.term)
        .slice(0, limit)
    : [];

/** Models sometimes wrap JSON in a markdown fence; strip it before parsing. */
export function parseJsonObject(text: string): Record<string, any> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  throw new AiProviderError('AI trả về dữ liệu không đúng định dạng.', 'bad_response');
}

export function toTeacherReply(raw: Record<string, any>): TeacherReply {
  const reply = str(raw.reply, 2000);
  if (!reply) throw new AiProviderError('AI không trả về nội dung hội thoại.', 'bad_response');
  const fb = raw.feedback;
  const corrected = fb && typeof fb === 'object' ? str(fb.corrected) : '';
  return {
    reply,
    feedback: corrected
      ? { corrected, explanation: str(fb.explanation, 600), vocabulary: vocabArr(fb.vocabulary, 3) }
      : null,
    suggestions: strArr(raw.suggestions, 3),
    vocabulary: vocabArr(raw.vocabulary, 4),
    phrases: strArr(raw.phrases, 3),
  };
}

export function toSummary(raw: Record<string, any>): SessionSummary {
  const list = (v: unknown, limit: number) => (Array.isArray(v) ? v.slice(0, limit) : []);
  return {
    commonMistakes: list(raw.commonMistakes, 6)
      .map((x: any) => ({ original: str(x?.original), corrected: str(x?.corrected), note: str(x?.note, 300) }))
      .filter((x) => x.original && x.corrected),
    betterExpressions: list(raw.betterExpressions, 6)
      .map((x: any) => ({ original: str(x?.original), better: str(x?.better) }))
      .filter((x) => x.original && x.better),
    newVocabulary: vocabArr(raw.newVocabulary, 10),
    nextSteps: strArr(raw.nextSteps, 3),
    encouragement: str(raw.encouragement, 300),
  };
}

@Injectable()
export class GeminiConversationProvider extends ConversationAiProvider {
  readonly name = 'gemini';

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY?.trim();
  }

  private key(): string {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new AiProviderError('Chưa cấu hình GEMINI_API_KEY trên máy chủ.', 'not_configured');
    return key;
  }

  private async generate(body: Record<string, unknown>): Promise<string> {
    const key = this.key(); // throws not_configured before any network call
    let res: Response;
    try {
      res = await geminiFetch(key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AiProviderError('Không kết nối được dịch vụ AI.', 'unavailable');
    }
    if (!res.ok) {
      if (res.status === 400 || res.status === 403) {
        // Bad/revoked key or a rejected request: not something a retry fixes.
        const detail = await res.json().catch(() => null);
        const msg = detail?.error?.message ?? '';
        if (/api key|permission|not valid/i.test(msg)) {
          throw new AiProviderError('GEMINI_API_KEY không hợp lệ hoặc không có quyền.', 'not_configured');
        }
        throw new AiProviderError(`Dịch vụ AI từ chối yêu cầu (${res.status}).`, 'bad_response');
      }
      throw new AiProviderError(`Dịch vụ AI đang quá tải hoặc lỗi (${res.status}).`, 'unavailable');
    }
    const data: any = await res.json().catch(() => null);
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '';
    if (!text.trim()) throw new AiProviderError('AI không trả về nội dung.', 'bad_response');
    return text;
  }

  async chat({ systemPrompt, history }: { systemPrompt: string; history: ChatTurn[] }): Promise<TeacherReply> {
    // Gemini requires the conversation to start with a user turn.
    const turns = history.length ? history : [{ role: 'user' as const, content: START_TURN }];
    const text = await this.generate({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
      generationConfig: { temperature: 0.8, responseMimeType: 'application/json', maxOutputTokens: 900 },
    });
    return toTeacherReply(parseJsonObject(text));
  }

  async summarize({ systemPrompt, transcript }: { systemPrompt: string; transcript: ChatTurn[] }): Promise<SessionSummary> {
    const lines = transcript.map((t) => `${t.role === 'user' ? 'Student' : 'Teacher'}: ${t.content}`).join('\n');
    const text = await this.generate({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: `Transcript:\n${lines}` }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json', maxOutputTokens: 1400 },
    });
    return toSummary(parseJsonObject(text));
  }

  async transcribe({ audio, mimeType }: { audio: Buffer; mimeType: string }): Promise<string> {
    const text = await this.generate({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Transcribe this English speech exactly as spoken, without correcting grammar or adding anything. Reply with the transcript only. If there is no intelligible speech, reply with an empty string.',
            },
            { inline_data: { mime_type: mimeType, data: audio.toString('base64') } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 400 },
    });
    return text.trim().replace(/^["']|["']$/g, '');
  }
}
