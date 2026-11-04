export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface VocabItem {
  term: string;
  meaning: string;
}

export interface TeacherFeedback {
  corrected: string;
  explanation: string;
  vocabulary: VocabItem[];
}

export interface TeacherReply {
  reply: string;
  /** null when the student's message needed no correction (or corrections are switched off). */
  feedback: TeacherFeedback | null;
  suggestions: string[];
  vocabulary: VocabItem[];
  phrases: string[];
}

export interface SessionSummary {
  commonMistakes: { original: string; corrected: string; note: string }[];
  betterExpressions: { original: string; better: string }[];
  newVocabulary: VocabItem[];
  nextSteps: string[];
  encouragement: string;
}

/** Thrown when the AI backend cannot be reached or answers with something unusable. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    /** 'not_configured' is an admin problem; 'unavailable' is transient and worth a retry. */
    readonly kind: 'not_configured' | 'unavailable' | 'bad_response' | 'bad_audio',
  ) {
    super(message);
  }
}

/** Provider abstraction: the engine only depends on this, so another provider can be dropped in. */
export abstract class ConversationAiProvider {
  abstract readonly name: string;
  abstract isConfigured(): boolean;
  /** One teacher turn. `history` already ends with the latest user message, or is empty for the opening line. */
  abstract chat(input: { systemPrompt: string; history: ChatTurn[] }): Promise<TeacherReply>;
  abstract summarize(input: { systemPrompt: string; transcript: ChatTurn[] }): Promise<SessionSummary>;
  /** Speech to text for recorded audio. */
  abstract transcribe(input: { audio: Buffer; mimeType: string }): Promise<string>;
}
