export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export class ChatRequestDto {
  scenarioId!: string;
  scenarioTag!: string;
  scenarioTitle?: string;
  messages?: ChatMessage[];
  userMessage?: string;
  userLevel?: string;
}

export interface ChatSuggestion {
  en: string;
  vi: string;
}

export interface ChatVocabulary {
  word: string;
  ipa: string;
  meaning: string;
}

export interface ChatFeedback {
  correction?: string;
  tip?: string;
}

export class ChatResponseDto {
  reply!: string;
  replyVi!: string;
  suggestions!: ChatSuggestion[];
  vocabulary!: ChatVocabulary[];
  feedback?: ChatFeedback;
}

