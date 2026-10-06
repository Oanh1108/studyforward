"use client";

import React, { useState } from 'react';
import { MyVocabularyView } from './my-vocabulary/MyVocabularyView';
import { DiscoverVocabularyView } from './vocabulary/DiscoverVocabularyView';

interface VocabularyViewProps {
  onOpenStudySession?: (folderId?: number | null) => void;
}

export function VocabularyView({ onOpenStudySession }: VocabularyViewProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'notebook'>('discover');

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-fade-up">
      <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-1 mb-6 shadow-sm mx-auto max-w-sm">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'discover'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          Khám phá từ mới
        </button>
        <button
          onClick={() => setActiveTab('notebook')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'notebook'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          Sổ tay của tôi
        </button>
      </div>

      {activeTab === 'discover' ? (
        <DiscoverVocabularyView />
      ) : (
        <MyVocabularyView onOpenStudySession={onOpenStudySession} />
      )}
    </div>
  );
}
