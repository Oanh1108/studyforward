import { describe, it, expect, beforeEach } from 'vitest';
import { CommunicationService } from './communication.service.js';
import { AiProviderError, ChatTurn, ConversationAiProvider, TeacherReply } from './ai/conversation-ai.provider.js';

/** Minimal in-memory stand-in for a TypeORM repository. */
class FakeRepo<T extends Record<string, any>> {
  rows: T[] = [];
  private n = 0;
  private tick = 0;
  create = (d: Partial<T>) => ({ ...d }) as T;
  async save(e: any) {
    if (!e.id) {
      e.id = `00000000-0000-4000-8000-${String(++this.n).padStart(12, '0')}`;
      e.createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, ++this.tick));
      if ('mode' in e && !e.startedAt) e.startedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
      this.rows.push(e);
    }
    return e as T;
  }
  async findOne({ where }: any) {
    return this.rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null;
  }
  async find({ where = {}, order, take }: any = {}) {
    let out = this.rows.filter((r) =>
      Object.entries(where).every(([k, v]: any) => (v && typeof v === 'object' && '_value' in v ? v._value.includes(r[k]) : r[k] === v)),
    );
    const [[key, dir]] = Object.entries(order ?? { createdAt: 'ASC' }) as any;
    out = [...out].sort((a, b) => (a[key] < b[key] ? -1 : 1) * (dir === 'DESC' ? -1 : 1));
    return take ? out.slice(0, take) : out;
  }
  async delete({ id }: any) {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
}

class StubAi extends ConversationAiProvider {
  readonly name = 'stub';
  configured = true;
  seen: { history: ChatTurn[]; systemPrompt: string }[] = [];
  next: (() => TeacherReply | Promise<TeacherReply>) | null = null;
  gate: Promise<void> | null = null;
  isConfigured() {
    return this.configured;
  }
  async chat(input: { systemPrompt: string; history: ChatTurn[] }) {
    this.seen.push(JSON.parse(JSON.stringify(input)));
    if (this.gate) await this.gate;
    if (this.next) return this.next();
    return { reply: `reply #${this.seen.length}`, feedback: null, suggestions: [], vocabulary: [], phrases: [] };
  }
  async summarize() {
    return { commonMistakes: [], betterExpressions: [], newVocabulary: [{ term: 'order', meaning: 'gọi món' }], nextSteps: ['x'], encouragement: 'giỏi' };
  }
  async transcribe() {
    return 'hello there';
  }
}

describe('CommunicationService', () => {
  let ai: StubAi;
  let service: CommunicationService;
  const dto = { mode: 'free', topic: 'food', level: 'A2', correctionMode: 'gentle' };

  beforeEach(() => {
    ai = new StubAi();
    service = new CommunicationService(new FakeRepo() as any, new FakeRepo() as any, new FakeRepo() as any, ai);
  });

  it('opens the conversation with an AI message', async () => {
    const { session, messages } = await service.createSession(1, dto);
    expect(session.status).toBe('active');
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('assistant');
    expect(ai.seen[0].history).toEqual([]);
    expect(ai.seen[0].systemPrompt).toContain('CEFR A2');
  });

  it('rejects a topic that does not belong to the mode', async () => {
    await expect(service.createSession(1, { ...dto, mode: 'roleplay', topic: 'food' })).rejects.toThrow('không hợp lệ');
  });

  it('keeps the whole conversation as context on every turn', async () => {
    const { session } = await service.createSession(1, dto);
    await service.sendMessage(1, session.id, { content: 'I like pizza' });
    await service.sendMessage(1, session.id, { content: 'Because it is tasty' });
    const last = ai.seen[ai.seen.length - 1].history;
    expect(last.map((t) => t.role)).toEqual(['assistant', 'user', 'assistant', 'user']);
    expect(last[1].content).toBe('I like pizza');
    expect(last[3].content).toBe('Because it is tasty');
  });

  it('does not mix context between sessions', async () => {
    const a = await service.createSession(1, dto);
    await service.sendMessage(1, a.session.id, { content: 'secret from session A' });
    const b = await service.createSession(1, { ...dto, topic: 'travel', level: 'B2' });
    await service.sendMessage(1, b.session.id, { content: 'hello' });
    const last = ai.seen[ai.seen.length - 1];
    expect(JSON.stringify(last.history)).not.toContain('secret from session A');
    expect(last.systemPrompt).toContain('CEFR B2');
  });

  it('stores nothing when the AI fails, so a retry cannot duplicate the message', async () => {
    const { session } = await service.createSession(1, dto);
    ai.next = () => {
      throw new AiProviderError('overloaded', 'unavailable');
    };
    await expect(service.sendMessage(1, session.id, { content: 'hi' })).rejects.toMatchObject({ status: 503 });
    ai.next = null;
    await service.sendMessage(1, session.id, { content: 'hi' });
    const { messages } = await service.getSession(1, session.id);
    expect(messages.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('rejects a second message while one is still being answered', async () => {
    const { session } = await service.createSession(1, dto);
    let release!: () => void;
    ai.gate = new Promise<void>((r) => (release = r));
    const first = service.sendMessage(1, session.id, { content: 'one' });
    await new Promise((r) => setTimeout(r, 0));
    await expect(service.sendMessage(1, session.id, { content: 'two' })).rejects.toMatchObject({ status: 409 });
    release();
    await first;
  });

  it("does not let another user read or write a session", async () => {
    const { session } = await service.createSession(1, dto);
    await expect(service.getSession(2, session.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.sendMessage(2, session.id, { content: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('saves feedback unless corrections are off', async () => {
    const reply = (): TeacherReply => ({
      reply: 'Nice!',
      feedback: { corrected: "I'd like to drink coffee.", explanation: 'Thiếu "to".', vocabulary: [] },
      suggestions: [],
      vocabulary: [],
      phrases: [],
    });
    const a = await service.createSession(1, dto);
    ai.next = reply;
    const r1 = await service.sendMessage(1, a.session.id, { content: 'I want drink coffee.' });
    expect(r1.userMessage.feedback?.corrected).toBe("I'd like to drink coffee.");

    const b = await service.createSession(1, { ...dto, correctionMode: 'none' });
    ai.next = reply;
    const r2 = await service.sendMessage(1, b.session.id, { content: 'I want drink coffee.' });
    expect(r2.userMessage.feedback).toBeNull();
  });

  it('refuses to start when the AI is not configured, with an admin-facing code', async () => {
    ai.configured = false;
    await expect(service.createSession(1, dto)).rejects.toMatchObject({ response: { code: 'AI_NOT_CONFIGURED' } });
    expect(service.getStatus().aiConfigured).toBe(false);
  });

  it('removes the session if the opening message fails', async () => {
    ai.next = () => {
      throw new AiProviderError('down', 'unavailable');
    };
    await expect(service.createSession(1, dto)).rejects.toMatchObject({ status: 503 });
    expect(await service.listSessions(1)).toHaveLength(0);
  });

  it('completes with real stats and is idempotent; ends further messages', async () => {
    const { session } = await service.createSession(1, dto);
    await service.sendMessage(1, session.id, { content: 'I like pizza' });
    const done = await service.complete(1, session.id);
    expect(done.userTurns).toBe(1);
    expect(done.summary).toMatchObject({ newVocabulary: [{ term: 'order' }] });
    expect((await service.complete(1, session.id)).summary).toEqual(done.summary);
    await expect(service.sendMessage(1, session.id, { content: 'more' })).rejects.toMatchObject({ status: 409 });
  });

  it('completing an untouched session produces no made-up summary', async () => {
    const { session } = await service.createSession(1, dto);
    const done = await service.complete(1, session.id);
    expect(done.userTurns).toBe(0);
    expect(done.summary).toBeNull();
  });

  it('transcribes audio and reports unusable audio', async () => {
    const { session } = await service.createSession(1, dto);
    expect(await service.transcribe(1, session.id, { audio: Buffer.from('abc').toString('base64'), mimeType: 'audio/webm;codecs=opus' })).toEqual({ transcript: 'hello there' });
    ai.transcribe = async () => '';
    await expect(service.transcribe(1, session.id, { audio: Buffer.from('abc').toString('base64'), mimeType: 'audio/webm' })).rejects.toMatchObject({ status: 422 });
  });
});
