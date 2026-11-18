"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Coffee,
  Plane,
  Hotel,
  Briefcase,
  ShoppingBag,
  Hand,
  UtensilsCrossed,
  MapPin,
  Play,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  Languages,
  BookOpen,
  HelpCircle,
  Award,
  Loader2,
} from 'lucide-react';
import { SectionTitle } from '../hub/primitives';
import { speakText, stopSpeech } from '../speechHelper';
import { useSpeechRecognition } from './useSpeechRecognition';
import {
  communicationApi,
  ChatMessage,
  ChatSuggestion,
  ChatVocabulary,
  ChatFeedback,
} from '@/lib/communicationApi';
import { useAuth } from '@/lib/authContext';

/**
 * Scenario catalogue with enriched metadata for Gemini 3.1 Live interaction.
 */
const SCENARIOS = [
  {
    id: 'coffee-shop',
    icon: Coffee,
    tag: 'At a coffee shop',
    title: 'Quán cà phê',
    desc: 'Luyện cách gọi đồ uống, tùy chọn sữa/đường và giao tiếp với barista.',
    level: 'A2 · Cơ bản',
    role: 'Barista (Người pha chế)',
    userRole: 'Khách hàng',
  },
  {
    id: 'airport',
    icon: Plane,
    tag: 'At the airport',
    title: 'Sân bay',
    desc: 'Làm thủ tục check-in, ký gửi hành lý và hỏi cổng lên máy bay.',
    level: 'B1 · Trung cấp',
    role: 'Nhân viên hãng bay',
    userRole: 'Hành khách',
  },
  {
    id: 'hotel',
    icon: Hotel,
    tag: 'At a hotel',
    title: 'Khách sạn',
    desc: 'Nhận phòng, hỏi về tiện nghi, ăn sáng và yêu cầu hỗ trợ phòng.',
    level: 'A2 · Cơ bản',
    role: 'Lễ tân khách sạn',
    userRole: 'Khách lưu trú',
  },
  {
    id: 'interview',
    icon: Briefcase,
    tag: 'Job interview',
    title: 'Phỏng vấn xin việc',
    desc: 'Giới thiệu bản thân, nói về kinh nghiệm và trả lời câu hỏi nhà tuyển dụng.',
    level: 'B2 · Nâng cao',
    role: 'Người phỏng vấn HR',
    userRole: 'Ứng viên',
  },
  {
    id: 'shopping',
    icon: ShoppingBag,
    tag: 'Shopping',
    title: 'Mua sắm thời trang',
    desc: 'Hỏi kích cỡ, thử đồ, xem bảng giá và thanh toán tại quầy.',
    level: 'A2 · Cơ bản',
    role: 'Nhân viên bán hàng',
    userRole: 'Khách mua sắm',
  },
  {
    id: 'meeting',
    icon: Hand,
    tag: 'Meeting someone new',
    title: 'Làm quen & kết bạn',
    desc: 'Chào hỏi, bắt chuyện, chia sẻ sở thích và tạo kết nối ban đầu.',
    level: 'A2 · Cơ bản',
    role: 'Người bạn mới quen',
    userRole: 'Bạn',
  },
  {
    id: 'restaurant',
    icon: UtensilsCrossed,
    tag: 'At a restaurant',
    title: 'Nhà hàng ẩm thực',
    desc: 'Gọi món theo thực đơn, hỏi món đặc trưng và yêu cầu hóa đơn.',
    level: 'B1 · Trung cấp',
    role: 'Bồi bàn',
    userRole: 'Thực khách',
  },
  {
    id: 'directions',
    icon: MapPin,
    tag: 'Asking for directions',
    title: 'Hỏi đường phố',
    desc: 'Hỏi thăm đường đến ga tàu, khách sạn hoặc các địa danh lân cận.',
    level: 'A2 · Cơ bản',
    role: 'Người dân địa phương',
    userRole: 'Khách du lịch',
  },
] as const;

type Scenario = (typeof SCENARIOS)[number];

interface ConversationMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  textVi?: string;
  feedback?: ChatFeedback;
  timestamp: string;
}

export function CommunicationView() {
  const [active, setActive] = useState<Scenario | null>(null);

  if (active) return <ConversationSession scenario={active} onBack={() => setActive(null)} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Luyện giao tiếp AI</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              <Sparkles className="w-3.5 h-3.5" />
              Gemini 3.1 Live
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Thực hành nói và phản xạ tiếng Anh qua các tình huống thực tế với trợ lý AI giọng nói thông minh.
          </p>
        </div>
      </header>

      <section aria-label="Chọn tình huống">
        <SectionTitle>Chọn tình huống giao tiếp</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s)}
                className="group flex min-h-[220px] flex-col rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left shadow-xs transition-all hover:-translate-y-1 hover:border-violet-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-violet-500 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300 group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
                    {s.level}
                  </span>
                </div>
                <span className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{s.tag}</span>
                <span className="mt-1 text-base font-bold text-[var(--text-primary)]">{s.title}</span>
                <span className="mt-1.5 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{s.desc}</span>
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-[var(--border)]">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">Vai trò: {s.role}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-300 group-hover:translate-x-0.5 transition-transform">
                    <Play className="h-3.5 w-3.5 fill-current" /> Bắt đầu
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ConversationSession({ scenario, onBack }: { scenario: Scenario; onBack: () => void }) {
  const { user } = useAuth();
  const Icon = scenario.icon;

  // Session state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [vocabulary, setVocabulary] = useState<ChatVocabulary[]>([]);
  const [autoVoice, setAutoVoice] = useState(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.1-flash');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  // Speech Recognition hook for user's voice input
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    supported: speechSupported,
    error: speechError,
  } = useSpeechRecognition('en-US');

  // Synchronize speech transcript into draft
  useEffect(() => {
    if (transcript) {
      setDraft(transcript);
    }
  }, [transcript]);

  // Scroll to bottom when messages update
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Clean up speech on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopSpeech();
      stopListening();
    };
  }, [stopListening]);

  // Function to play AI's spoken voice
  const playVoice = useCallback(
    async (text: string, msgId: string) => {
      stopSpeech();
      setPlayingMessageId(msgId);
      try {
        await speakText(text, 'en', speechRate);
      } finally {
        if (isMountedRef.current) {
          setPlayingMessageId(null);
        }
      }
    },
    [speechRate]
  );

  // Initialize conversation: call Gemini for the first turn greeting
  const startConversation = useCallback(async () => {
    setIsLoading(true);
    setMessages([]);
    setSuggestions([]);
    setVocabulary([]);
    stopSpeech();

    try {
      const res = await communicationApi.chat({
        scenarioId: scenario.id,
        scenarioTag: scenario.tag,
        scenarioTitle: scenario.title,
        userLevel: scenario.level,
        messages: [],
      });

      if (res.modelUsed) setModelUsed(res.modelUsed);

      const aiMsg: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'model',
        text: res.reply,
        textVi: res.replyVi,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([aiMsg]);
      setSuggestions(res.suggestions || []);
      setVocabulary(res.vocabulary || []);

      if (autoVoice) {
        playVoice(res.reply, aiMsg.id);
      }
    } catch (err: any) {
      console.error('Failed to initialize conversation:', err);
      // Fallback greeting if network fails
      const fallback: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'model',
        text: `Hello! Welcome. How can I help you with ${scenario.title} today?`,
        textVi: `Xin chào! Chào mừng bạn. Tôi có thể giúp gì cho bạn hôm nay?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([fallback]);
    } finally {
      setIsLoading(false);
    }
  }, [scenario, autoVoice, playVoice]);

  useEffect(() => {
    startConversation();
  }, [startConversation]);

  // Send a message (either typed, spoken, or picked from suggestions)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || draft).trim();
    if (!text || isLoading) return;

    stopSpeech();
    if (isListening) stopListening();

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: ConversationMessage = {
      id: userMsgId,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setDraft('');
    setIsLoading(true);

    try {
      const apiMessages: ChatMessage[] = newHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await communicationApi.chat({
        scenarioId: scenario.id,
        scenarioTag: scenario.tag,
        scenarioTitle: scenario.title,
        userLevel: scenario.level,
        messages: apiMessages,
        userMessage: text,
      });

      if (res.modelUsed) setModelUsed(res.modelUsed);

      const aiMsgId = `msg-ai-${Date.now()}`;
      const aiMsg: ConversationMessage = {
        id: aiMsgId,
        role: 'model',
        text: res.reply,
        textVi: res.replyVi,
        feedback: res.feedback?.correction || res.feedback?.tip ? res.feedback : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setSuggestions(res.suggestions || []);
      if (res.vocabulary && res.vocabulary.length > 0) {
        setVocabulary(res.vocabulary);
      }

      if (autoVoice) {
        playVoice(res.reply, aiMsgId);
      }
    } catch (err: any) {
      console.error('Failed to get AI reply:', err);
      const errorMsg: ConversationMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        text: "I didn't quite catch that. Could you please say that again?",
        textVi: "Tôi chưa nghe rõ lắm, bạn có thể nói lại được không?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTranslation = (id: string) => {
    setShowTranslations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const turnsCount = Math.floor(messages.length / 2);

  return (
    <div className="flex flex-col animate-fade-up max-w-[1300px] mx-auto w-full">
      {/* Top Navigation Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              stopSpeech();
              onBack();
            }}
            aria-label="Quay lại danh sách tình huống"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-violet-400 focus-visible:outline-2 focus-visible:outline-violet-500 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold text-[var(--text-primary)]">{scenario.tag}</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 hidden sm:inline-block">
                {scenario.title}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {scenario.role} • Lượt trò chuyện: <strong className="text-violet-600 dark:text-violet-400">{turnsCount}</strong>
            </p>
          </div>
        </div>

        {/* Controls: Voice, Speed, Model, Reset */}
        <div className="flex items-center gap-2">
          {/* Auto voice toggle */}
          <button
            type="button"
            onClick={() => {
              if (autoVoice) stopSpeech();
              setAutoVoice(!autoVoice);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              autoVoice
                ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]'
            }`}
            title={autoVoice ? 'Giọng đọc AI: Đang BẬT' : 'Giọng đọc AI: Đang TẮT'}
          >
            {autoVoice ? <Volume2 className="w-4 h-4 text-violet-600 dark:text-violet-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{autoVoice ? 'Giọng AI: Bật' : 'Giọng AI: Tắt'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-0.5 text-xs font-semibold text-[var(--text-secondary)]">
            {[0.85, 1.0, 1.15].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSpeechRate(rate)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  speechRate === rate ? 'bg-violet-600 text-white font-bold' : 'hover:text-[var(--text-primary)]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Model Badge */}
          <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-muted)]">
            <Sparkles className="w-3 h-3 text-violet-500" />
            Gemini 3.1
          </span>

          {/* Reset session button */}
          <button
            type="button"
            onClick={startConversation}
            aria-label="Khởi động lại hội thoại"
            title="Làm mới cuộc trò chuyện"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-violet-600 hover:border-violet-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container: Chat + Side Panel */}
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        {/* Chat Area */}
        <div className="flex flex-col rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] shadow-xs overflow-hidden h-[calc(100dvh-12rem)] min-h-[440px]">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((m) => {
              const isAi = m.role === 'model';
              const isPlaying = playingMessageId === m.id;
              const showVi = showTranslations[m.id];

              return (
                <div key={m.id} className={`flex gap-3 ${isAi ? 'items-start' : 'items-start justify-end'}`}>
                  {isAi && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xs">
                      <Bot className="h-5 w-5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[78%] space-y-2 ${isAi ? 'items-start' : 'items-end'}`}>
                    {/* Role title / info */}
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-bold text-[var(--text-muted)]">
                        {isAi ? scenario.role : user?.name || 'Bạn'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{m.timestamp}</span>
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`relative rounded-2xl p-4 text-sm leading-relaxed shadow-xs transition-all ${
                        isAi
                          ? 'bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-sm'
                          : 'bg-violet-600 text-white rounded-tr-sm'
                      }`}
                    >
                      <p className="font-medium text-[15px]">{m.text}</p>

                      {/* Vietnamese translation toggle */}
                      {isAi && m.textVi && showVi && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] font-normal animate-fade-in">
                          <p className="italic">"{m.textVi}"</p>
                        </div>
                      )}

                      {/* AI bubble action bar */}
                      {isAi && (
                        <div className="mt-3 flex items-center gap-3 text-xs pt-1">
                          <button
                            type="button"
                            onClick={() => playVoice(m.text, m.id)}
                            className={`inline-flex items-center gap-1 font-bold transition-colors cursor-pointer ${
                              isPlaying
                                ? 'text-violet-600 dark:text-violet-400 animate-pulse'
                                : 'text-violet-600 hover:text-violet-800 dark:text-violet-400'
                            }`}
                            title="Nghe lại phát âm"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{isPlaying ? 'Đang phát...' : 'Nghe'}</span>
                          </button>

                          {m.textVi && (
                            <button
                              type="button"
                              onClick={() => toggleTranslation(m.id)}
                              className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                              <Languages className="w-3.5 h-3.5" />
                              <span>{showVi ? 'Ẩn dịch' : 'Dịch nghĩa'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Real-time Feedback Card on User message */}
                    {isAi && m.feedback && (m.feedback.correction || m.feedback.tip) && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1 animate-fade-in">
                        {m.feedback.correction && (
                          <div className="flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Cách diễn đạt tự nhiên hơn: </strong>
                              <span className="italic font-medium text-amber-800 dark:text-amber-100">
                                "{m.feedback.correction}"
                              </span>
                            </div>
                          </div>
                        )}
                        {m.feedback.tip && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-300 pl-5">
                            {m.feedback.tip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!isAi && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-xs">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white animate-pulse">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-[var(--bg-subtle)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                  <span>{scenario.role} đang chuẩn bị câu trả lời...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Bar */}
          {suggestions.length > 0 && !isLoading && (
            <div className="px-4 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border)] flex items-center gap-2 overflow-x-auto hide-scrollbar">
              <span className="text-[11px] font-bold text-[var(--text-muted)] shrink-0 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                Gợi ý:
              </span>
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(sug.en)}
                  className="shrink-0 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-[var(--bg-card)] hover:bg-violet-50 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-semibold transition-all hover:scale-102 active:scale-98 cursor-pointer text-left shadow-2xs"
                  title={sug.vi}
                >
                  <p className="truncate max-w-[260px]">{sug.en}</p>
                </button>
              ))}
            </div>
          )}

          {/* Voice status error banner */}
          {speechError && (
            <div className="px-4 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs border-t border-rose-200">
              {speechError}
            </div>
          )}

          {/* Composer Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 md:p-4 bg-[var(--bg-card)] border-t border-[var(--border)] flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening((spoken) => setDraft(spoken));
                }
              }}
              disabled={isLoading}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 border-rose-600 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:border-violet-500 hover:text-violet-600'
              }`}
              title={
                !speechSupported
                  ? 'Trình duyệt chưa hỗ trợ ghi âm trực tiếp'
                  : isListening
                  ? 'Đang nghe... Nhấn để dừng'
                  : 'Nhấn để nói tiếng Anh qua Microphone'
              }
            >
              {isListening ? <Mic className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {isListening && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Text Input */}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isLoading}
              placeholder={
                isListening
                  ? 'Đang lắng nghe bạn nói tiếng Anh...'
                  : 'Nói hoặc gõ câu trả lời tiếng Anh...'
              }
              className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3.5 text-sm text-[var(--text-primary)] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!draft.trim() || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
              aria-label="Gửi tin nhắn"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Side Panel: Scenario Info + Vocabulary */}
        <aside className="space-y-4 lg:h-[calc(100dvh-12rem)] lg:min-h-[440px] lg:overflow-y-auto lg:pr-1">
          {/* Situation Context Card */}
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-600" />
              Thông tin phiên giao tiếp
            </h2>

            <dl className="mt-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[var(--border)]">
                <dt className="text-[var(--text-muted)]">Chủ đề</dt>
                <dd className="font-bold text-[var(--text-primary)]">{scenario.title}</dd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border)]">
                <dt className="text-[var(--text-muted)]">Vai trò của AI</dt>
                <dd className="font-semibold text-violet-600 dark:text-violet-400">{scenario.role}</dd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border)]">
                <dt className="text-[var(--text-muted)]">Trình độ gợi ý</dt>
                <dd className="font-semibold text-[var(--text-secondary)]">{scenario.level}</dd>
              </div>
              <div className="flex justify-between items-center py-1">
                <dt className="text-[var(--text-muted)]">Mô hình AI</dt>
                <dd className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {modelUsed}
                </dd>
              </div>
            </dl>
          </div>

          {/* Real-time Vocabulary Extracted by Gemini */}
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Từ vựng hữu ích trong ngữ cảnh
            </h2>

            {vocabulary.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Từ vựng và phát âm quan trọng sẽ xuất hiện tự động theo diễn biến cuộc hội thoại.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {vocabulary.map((vocab, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1 hover:border-violet-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--text-primary)]">{vocab.word}</span>
                      <button
                        type="button"
                        onClick={() => speakText(vocab.word, 'en', 0.9)}
                        className="p-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 text-violet-600 transition-colors cursor-pointer"
                        title="Nghe phát âm từ"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {vocab.ipa && (
                      <p className="text-[11px] font-mono text-violet-600 dark:text-violet-400">
                        {vocab.ipa}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-secondary)]">{vocab.meaning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick End & Reward Action */}
          <div className="rounded-[24px] border border-[var(--border)] bg-gradient-to-br from-violet-50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold text-sm">
              <Award className="w-4 h-4" />
              <span>Tiến độ buổi học</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Bạn đã hoàn thành <strong className="text-violet-600">{turnsCount}</strong> lượt trao đổi tiếng Anh với AI.
            </p>
            <button
              type="button"
              onClick={() => setIsCompleted(true)}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Hoàn thành buổi luyện tập
            </button>
          </div>
        </aside>
      </div>

      {/* Completion Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
                Tuyệt vời, bạn đã hoàn thành hội thoại!
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Tình huống: <strong className="text-violet-600">{scenario.title}</strong> ({scenario.tag})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 text-left">
              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Số lượt nói</span>
                <p className="text-base font-extrabold text-[var(--text-primary)] mt-0.5">{turnsCount} lượt</p>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Điểm thưởng</span>
                <p className="text-base font-extrabold text-amber-500 mt-0.5">+{Math.max(10, turnsCount * 5)} XP</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCompleted(false);
                  startConversation();
                }}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Luyện tập lại
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setIsCompleted(false);
                  onBack();
                }}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Chọn tình huống khác
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
