"use client";

import React, { useState, useEffect, useRef } from 'react';
import { speakText } from '@/components/learning/speechHelper';
import { YouTubeLesson } from './YouTubeLesson';

interface DictationSegment {
  id: string;
  text: string;
  translation: string;
}

interface DictationLesson {
  id: number;
  title: string;
  description: string;
  segments: DictationSegment[];
}

const DICTATION_LESSONS: DictationLesson[] = [
  {
    id: 1,
    title: 'Business Meeting Introduction',
    description: 'Luyện tập nghe chép chính tả chủ đề giới thiệu cuộc họp.',
    segments: [
      { id: 's1', text: "Hello everyone, thank you for joining the meeting today.", translation: "Xin chào mọi người, cảm ơn vì đã tham gia cuộc họp hôm nay." },
      { id: 's2', text: "We have a lot to cover regarding the new project.", translation: "Chúng ta có rất nhiều điều cần bàn liên quan đến dự án mới." },
      { id: 's3', text: "Please make sure to review the document I sent earlier.", translation: "Vui lòng đảm bảo bạn đã xem tài liệu tôi gửi trước đó." },
    ]
  },
  {
    id: 2,
    title: 'Customer Service Call',
    description: 'Đoạn hội thoại mẫu khi gọi điện chăm sóc khách hàng.',
    segments: [
      { id: 's1', text: "Good morning, this is customer support. How can I help you?", translation: "Chào buổi sáng, đây là bộ phận hỗ trợ khách hàng. Tôi có thể giúp gì cho bạn?" },
      { id: 's2', text: "I would like to return an item I purchased last week.", translation: "Tôi muốn trả lại món hàng tôi đã mua tuần trước." },
      { id: 's3', text: "Could you please provide your order number?", translation: "Bạn có thể vui lòng cung cấp mã đơn hàng không?" },
    ]
  }
];

function cleanText(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s\']/g, '').split(/\s+/).filter(Boolean);
}

function diffWords(targetStr: string, userStr: string) {
  const target = cleanText(targetStr);
  const user = cleanText(userStr);

  const dp = Array.from({ length: target.length + 1 }, () => Array(user.length + 1).fill(0));
  for (let i = 1; i <= target.length; i++) {
    for (let j = 1; j <= user.length; j++) {
      if (target[i - 1] === user[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs = [];
  let i = target.length;
  let j = user.length;
  while (i > 0 && j > 0) {
    if (target[i - 1] === user[j - 1]) {
      lcs.unshift({ word: target[i - 1], type: 'correct' as const });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      lcs.unshift({ word: target[i - 1], type: 'missing' as const });
      i--;
    } else {
      lcs.unshift({ word: user[j - 1], type: 'extra' as const });
      j--;
    }
  }
  while (i > 0) {
    lcs.unshift({ word: target[i - 1], type: 'missing' as const });
    i--;
  }
  while (j > 0) {
    lcs.unshift({ word: user[j - 1], type: 'extra' as const });
    j--;
  }
  return lcs;
}

export function DictationView() {
  const [activeTab, setActiveTab] = useState<'tts' | 'youtube'>('tts');
  const [selectedLesson, setSelectedLesson] = useState<DictationLesson | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [speed, setSpeed] = useState<number>(1.0);
  const [isChecked, setIsChecked] = useState(false);
  const [diffResult, setDiffResult] = useState<{ word: string; type: 'correct' | 'missing' | 'extra' }[]>([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [wrongSegments, setWrongSegments] = useState<number[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentSegment = selectedLesson?.segments[currentSegmentIndex];

  const handlePlayAudio = () => {
    if (currentSegment) {
      speakText(currentSegment.text, 'en', speed);
    }
  };

  const handleCheck = () => {
    if (!currentSegment) return;
    const diff = diffWords(currentSegment.text, userInput);
    setDiffResult(diff);
    setIsChecked(true);

    const isPerfect = diff.every(d => d.type === 'correct');
    if (isPerfect) {
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
      if (!wrongSegments.includes(currentSegmentIndex)) {
        setWrongSegments(prev => [...prev, currentSegmentIndex]);
      }
    }
  };

  const handleNext = () => {
    if (!selectedLesson) return;
    if (currentSegmentIndex < selectedLesson.segments.length - 1) {
      setCurrentSegmentIndex(p => p + 1);
      setUserInput('');
      setIsChecked(false);
      setDiffResult([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSessionCompleted(true);
    }
  };

  const retryWrong = () => {
    if (!selectedLesson || wrongSegments.length === 0) return;
    const newSegments = wrongSegments.map(idx => selectedLesson.segments[idx]);
    setSelectedLesson({ ...selectedLesson, segments: newSegments });
    setCurrentSegmentIndex(0);
    setUserInput('');
    setIsChecked(false);
    setDiffResult([]);
    setWrongSegments([]);
    setSessionCompleted(false);
  };

  const backToMenu = () => {
    setSelectedLesson(null);
    setCurrentSegmentIndex(0);
    setUserInput('');
    setIsChecked(false);
    setDiffResult([]);
    setSessionCompleted(false);
    setScore({ correct: 0, total: 0 });
    setWrongSegments([]);
  };

  if (activeTab === 'youtube') {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border)]">
            <button onClick={() => setActiveTab('tts')} className="px-6 py-2 rounded-lg text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cơ bản (TTS)</button>
            <button className="px-6 py-2 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 shadow-sm text-indigo-600">Nâng cao (YouTube)</button>
          </div>
        </div>
        <YouTubeLesson />
      </div>
    );
  }

  if (!selectedLesson) {
    return (
      <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border)]">
            <button className="px-6 py-2 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 shadow-sm text-indigo-600">Cơ bản (TTS)</button>
            <button onClick={() => setActiveTab('youtube')} className="px-6 py-2 rounded-lg text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Nâng cao (YouTube)</button>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Nghe chép chính tả (Dictation)</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Luyện nghe sâu bằng cách chép lại chính xác những gì bạn nghe được. <br/>
            <span className="text-indigo-600 font-medium">* Hệ thống tự động bỏ qua dấu câu và không phân biệt chữ hoa chữ thường. Điểm luyện tập tại đây không tự động được coi là trình độ tiếng Anh chính thức.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DICTATION_LESSONS.map(lesson => (
            <div key={lesson.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-indigo-300 transition-all shadow-sm cursor-pointer" onClick={() => setSelectedLesson(lesson)}>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl flex items-center justify-center text-2xl mb-4">🎧</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{lesson.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{lesson.description}</p>
              <div className="text-xs font-bold text-indigo-600 mt-4">{lesson.segments.length} câu • Giọng đọc TTS</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessionCompleted) {
    return (
      <div className="space-y-6 animate-fade-up max-w-2xl mx-auto text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Hoàn thành bài luyện tập</h2>
        <p className="text-[var(--text-secondary)]">Bạn đã nghe đúng {score.correct}/{score.total} câu ngay từ lần đầu.</p>
        
        {wrongSegments.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-xl my-6 text-sm font-medium">
            Bạn có {wrongSegments.length} câu chưa chính xác 100%. Bạn có muốn luyện lại các câu này không?
          </div>
        )}

        <div className="flex justify-center gap-3 mt-6">
          <button onClick={backToMenu} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
            Về danh sách
          </button>
          {wrongSegments.length > 0 && (
            <button onClick={retryWrong} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md">
              Luyện lại câu sai
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={backToMenu} className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors">
          ← Quay lại
        </button>
        <div className="text-sm font-bold text-[var(--text-secondary)]">
          Câu {currentSegmentIndex + 1} / {selectedLesson.segments.length}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-sm">
        {/* Audio Controls */}
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <button
            onClick={handlePlayAudio}
            className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95"
          >
            ▶
          </button>
          <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Tốc độ:</span>
            {[0.5, 0.75, 1.0].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${speed === s ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--text-secondary)] hover:text-indigo-600'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isChecked}
            placeholder="Gõ chính xác những gì bạn nghe được..."
            className="w-full h-32 p-4 rounded-xl border-2 border-[var(--border-subtle)] bg-[var(--bg-base)] focus:border-indigo-500 outline-none resize-none transition-all text-lg leading-relaxed"
            autoFocus
          />

          {isChecked && (
            <div className="p-5 rounded-xl border-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 animate-fade-in space-y-4">
              <div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Đánh giá chi tiết:</div>
                <div className="flex flex-wrap gap-1.5 text-lg font-medium">
                  {diffResult.map((d, i) => (
                    <span
                      key={i}
                      className={`px-1.5 rounded ${
                        d.type === 'correct' ? 'text-emerald-600 bg-emerald-100/50' :
                        d.type === 'missing' ? 'text-slate-400 bg-slate-100 line-through decoration-slate-400' :
                        'text-rose-600 bg-rose-100/50 underline decoration-rose-400 decoration-wavy'
                      }`}
                      title={d.type === 'correct' ? 'Đúng' : d.type === 'missing' ? 'Bạn gõ thiếu từ này' : 'Bạn gõ thừa/sai từ này'}
                    >
                      {d.word}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-indigo-100 dark:border-indigo-900/30">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Đáp án gốc:</div>
                <div className="text-[var(--text-primary)] font-medium text-lg">{currentSegment?.text}</div>
                <div className="text-sm text-[var(--text-secondary)] italic mt-1">{currentSegment?.translation}</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          {isChecked ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              Câu tiếp theo <span>→</span>
            </button>
          ) : (
            <button
              onClick={handleCheck}
              disabled={!userInput.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
            >
              Kiểm tra
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
