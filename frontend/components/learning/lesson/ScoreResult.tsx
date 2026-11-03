"use client";

import React from 'react';
import { Volume2 } from 'lucide-react';
import { WordComparison } from '@/lib/speechAudio';

const TONES = {
  good: { ring: 'stroke-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', box: 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10', label: 'Rất tốt!', hint: 'Bạn đúng gần như toàn bộ câu.' },
  ok: { ring: 'stroke-amber-500', text: 'text-amber-600 dark:text-amber-400', box: 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10', label: 'Khá tốt', hint: 'Nghe lại câu mẫu và chú ý từng từ hơn.' },
  low: { ring: 'stroke-rose-500', text: 'text-rose-600 dark:text-rose-400', box: 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10', label: 'Cần luyện thêm', hint: 'Nghe câu mẫu rồi thử lại.' },
} as const;

const toneFor = (score: number) => (score >= 85 ? TONES.good : score >= 60 ? TONES.ok : TONES.low);

function ScoreRing({ score, className }: { score: number; className: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 72 72" className="h-[72px] w-[72px] shrink-0 -rotate-90" role="img" aria-label={`Điểm ${score}%`}>
      <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="7" className="stroke-black/10 dark:stroke-white/10" />
      <circle
        cx="36" cy="36" r={radius} fill="none" strokeWidth="7" strokeLinecap="round"
        className={`${className} transition-all duration-700`}
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)}
      />
    </svg>
  );
}

/** Score ring with a short verdict. `detail` is an extra line such as what the app heard. */
export function ScoreSummary({ score, detail }: { score: number; detail?: string }) {
  const tone = toneFor(score);
  return (
    <div className={`flex items-center gap-4 rounded-[20px] border p-4 ${tone.box}`}>
      <div className="relative">
        <ScoreRing score={score} className={tone.ring} />
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${tone.text}`}>{score}%</span>
      </div>
      <div className="min-w-0">
        <p className={`text-base font-bold ${tone.text}`}>{tone.label}</p>
        <p className="text-sm text-[var(--text-secondary)]">{tone.hint}</p>
        {detail && <p className="mt-1 text-sm italic text-[var(--text-muted)]">{detail}</p>}
      </div>
    </div>
  );
}

/** The target sentence word by word: green = right, red = wrong or missing. Tap a word to hear it. */
export function WordChips({ comparison, onPlayWord }: { comparison: WordComparison; onPlayWord: (word: string) => void }) {
  const hasWrong = comparison.words.some((w) => w.status === 'wrong');
  return (
    <div className="space-y-2 text-center">
      <p className="text-sm text-[var(--text-muted)]">
        {hasWrong
          ? 'Từ màu đỏ là từ chưa đúng. Chạm vào từ để nghe cách đọc chuẩn rồi đọc theo.'
          : 'Bạn đúng tất cả các từ. Chạm vào từ bất kỳ để nghe lại.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {comparison.words.map((word, index) =>
          word.status === 'neutral' ? (
            <span key={index} className="px-1 py-1 text-base text-[var(--text-muted)]">{word.text}</span>
          ) : (
            <button
              key={index}
              type="button"
              onClick={() => onPlayWord(word.text)}
              aria-label={`Nghe phát âm từ ${word.text}`}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                word.status === 'wrong'
                  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
              }`}
            >
              {word.text}
              {word.status === 'wrong' && <Volume2 className="h-4 w-4" />}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
