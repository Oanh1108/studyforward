"use client";

import React, { useState } from 'react';
import { Headphones, MonitorPlay } from 'lucide-react';
import { scoreGroups } from '@/lib/dictation/practice';
import { YouTubeLesson } from '../listening/YouTubeLesson';
import { PracticeSession } from './PracticeSession';
import { ToeicBrowser, type ToeicNav } from './ToeicBrowser';
import { usePracticeProgress } from './usePracticeProgress';
import type { PracticeSpec } from './types';

type Section = 'toeic' | 'youtube';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'toeic', label: 'Đề TOEIC', icon: Headphones },
  { id: 'youtube', label: 'YouTube', icon: MonitorPlay },
];

export function DictationHub() {
  const [section, setSection] = useState<Section>('toeic');
  const [session, setSession] = useState<{ spec: PracticeSpec; run: number } | null>(null);
  const [toeicNav, setToeicNav] = useState<ToeicNav>({ testId: null, part: 1 });
  const [youtubePracticing, setYoutubePracticing] = useState(false);
  // Inside a test the page title and source tabs make way for the test itself.
  const insideTest = (section === 'toeic' && toeicNav.testId !== null) || (section === 'youtube' && youtubePracticing);
  const { progress, record } = usePracticeProgress();

  if (session) {
    return (
      <PracticeSession
        key={session.run}
        spec={session.spec}
        onExit={() => setSession(null)}
        onComplete={(outcomes, spec) => scoreGroups(spec, outcomes).forEach((g) => record(g.id, g.score))}
      />
    );
  }

  const start = (spec: PracticeSpec) => setSession((prev) => ({ spec, run: (prev?.run ?? 0) + 1 }));

  return (
    <div className="space-y-6 animate-fade-up">
      {!insideTest && (
      <>
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Nghe chép chính tả</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
          Nghe một câu, gõ lại thật chính xác, rồi xem mình sai ở từ nào. Hệ thống bỏ qua dấu câu và chữ hoa, và coi &ldquo;25&rdquo; giống &ldquo;twenty-five&rdquo;.
        </p>
      </header>

      <div role="tablist" aria-label="Nguồn bài luyện" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--bg-card)] p-1 hide-scrollbar">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => setSection(id)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
              section === id ? 'bg-[var(--brand)] text-[var(--text-inverse)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      </>
      )}

      <div role="tabpanel">
        {section === 'toeic' && <ToeicBrowser progress={progress} nav={toeicNav} onNavChange={setToeicNav} onStart={start} />}
        {section === 'youtube' && <YouTubeLesson onPracticingChange={setYoutubePracticing} />}
      </div>
    </div>
  );
}
