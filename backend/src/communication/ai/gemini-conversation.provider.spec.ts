import { describe, it, expect, afterEach, vi } from 'vitest';
import { GeminiConversationProvider, parseJsonObject, toSummary, toTeacherReply } from './gemini-conversation.provider.js';
import { AiProviderError } from './conversation-ai.provider.js';

describe('parsing model output', () => {
  it('strips markdown fences', () => {
    expect(parseJsonObject('```json\n{"reply":"Hi"}\n```')).toEqual({ reply: 'Hi' });
  });

  it('rejects non-JSON instead of inventing a reply', () => {
    expect(() => parseJsonObject('Sorry, I cannot')).toThrow(AiProviderError);
  });

  it('requires a reply and normalises optional fields', () => {
    expect(() => toTeacherReply({ reply: '  ' })).toThrow(AiProviderError);
    const r = toTeacherReply({
      reply: 'Nice! What do you drink?',
      feedback: { corrected: "I'd like to drink coffee.", explanation: 'Thiếu "to".', vocabulary: [{ term: "I'd like", meaning: 'Tôi muốn' }, { nope: 1 }] },
      suggestions: ['Coffee, please.', 5, ''],
    });
    expect(r.feedback?.corrected).toBe("I'd like to drink coffee.");
    expect(r.feedback?.vocabulary).toHaveLength(1);
    expect(r.suggestions).toEqual(['Coffee, please.']);
    expect(r.vocabulary).toEqual([]);
  });

  it('treats feedback without a correction as no feedback', () => {
    expect(toTeacherReply({ reply: 'Great!', feedback: { corrected: '' } }).feedback).toBeNull();
    expect(toTeacherReply({ reply: 'Great!', feedback: null }).feedback).toBeNull();
  });

  it('drops incomplete summary entries', () => {
    const s = toSummary({ commonMistakes: [{ original: 'a' }, { original: 'I go', corrected: 'I went', note: 'quá khứ' }] });
    expect(s.commonMistakes).toHaveLength(1);
    expect(s.nextSteps).toEqual([]);
  });
});

describe('GeminiConversationProvider', () => {
  const saved = process.env.GEMINI_API_KEY;
  afterEach(() => {
    process.env.GEMINI_API_KEY = saved;
    vi.restoreAllMocks();
  });

  it('reports not configured without a key and refuses to answer', async () => {
    delete process.env.GEMINI_API_KEY;
    const p = new GeminiConversationProvider();
    expect(p.isConfigured()).toBe(false);
    await expect(p.chat({ systemPrompt: 's', history: [] })).rejects.toMatchObject({ kind: 'not_configured' });
  });

  it('sends the conversation history with correct roles and starts with a user turn', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const calls: any[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: any) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"reply":"Hello!"}' }] } }] }), { status: 200 });
    });
    const p = new GeminiConversationProvider();
    await p.chat({ systemPrompt: 'SYS', history: [] });
    await p.chat({
      systemPrompt: 'SYS',
      history: [
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'I want coffee' },
      ],
    });
    expect(calls[0].contents[0].role).toBe('user');
    expect(calls[0].systemInstruction.parts[0].text).toBe('SYS');
    expect(calls[1].contents.map((c: any) => c.role)).toEqual(['model', 'user']);
    vi.unstubAllGlobals();
  });

  it('maps a rejected key to not_configured and overload to unavailable', async () => {
    process.env.GEMINI_API_KEY = 'bad';
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 }));
    await expect(new GeminiConversationProvider().chat({ systemPrompt: 's', history: [] })).rejects.toMatchObject({ kind: 'not_configured' });
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }));
    await expect(new GeminiConversationProvider().chat({ systemPrompt: 's', history: [] })).rejects.toMatchObject({ kind: 'unavailable' });
    vi.unstubAllGlobals();
  });
});
