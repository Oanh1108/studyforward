"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { speakingApi, SpeakingTopicData, SpeakingSessionData, SpeakingStatData } from '@/lib/speakingApi';
import { useAuth } from '@/lib/authContext';
import { IconSparkles } from './icons';
import { Select, SelectOption } from '../ui/Select';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SpeakingView() {
  const { currentLanguage } = useAuth();
  
  const [topics, setTopics] = useState<SpeakingTopicData[]>([]);
  const [stats, setStats] = useState<SpeakingStatData[]>([]);
  const [activeSessionsList, setActiveSessionsList] = useState<SpeakingSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchTopicsAndStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [topicsData, statsData, sessionsData] = await Promise.all([
        speakingApi.getTopics(currentLanguage),
        speakingApi.getStats(currentLanguage),
        speakingApi.getActiveSessions()
      ]);
      setTopics(topicsData);
      setStats(statsData.stats);
      setActiveSessionsList(sessionsData);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải chủ đề');
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage]);

  useEffect(() => {
    fetchTopicsAndStats();
  }, [fetchTopicsAndStats]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-rose-500">
        <p>{error}</p>
        <button onClick={fetchTopicsAndStats} className="mt-4 px-4 py-2 bg-rose-100 rounded-lg font-bold">Thử lại</button>
      </div>
    );
  }

  return (
    <SpeakingSetupView 
      topics={topics} 
      stats={stats}
      activeSessions={activeSessionsList}
      language={currentLanguage} 
      onRefresh={fetchTopicsAndStats}
    />
  );
}

function SpeakingSetupView({ 
  topics, 
  stats,
  activeSessions,
  language,
  onRefresh
}: { 
  topics: SpeakingTopicData[], 
  stats: SpeakingStatData[],
  activeSessions: SpeakingSessionData[],
  language: string,
  onRefresh: () => void 
}) {
  const router = useRouter();
  const defaultTopics = [
    'Giới thiệu bản thân', 'Sinh hoạt', 'Gia đình', 'Công việc', 'Học tập',
    'Mua sắm', 'Nhà hàng', 'Du lịch', 'Giao thông', 'Sức khỏe', 'Sở thích', 'Công nghệ'
  ];
  
  const [selectedTopic, setSelectedTopic] = useState<string>(defaultTopics[0]);
  const [selectedLevel, setSelectedLevel] = useState<string>('B1');
  const [selectedMode, setSelectedMode] = useState<string>('translate');
  const [selectedCount, setSelectedCount] = useState<number>(5);
  
  const [isStarting, setIsStarting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [startError, setStartError] = useState('');

  const currentStat = stats.find(s => s.topic === selectedTopic && s.level === selectedLevel);
  const availableCount = currentStat?.count || 0;

  useEffect(() => {
    if (availableCount === 0) {
      if (selectedCount !== 0) setSelectedCount(0);
    } else if (availableCount > 0 && selectedCount > availableCount) {
      if (availableCount >= 20) setSelectedCount(20);
      else if (availableCount >= 10) setSelectedCount(10);
      else if (availableCount >= 5) setSelectedCount(5);
      else setSelectedCount(availableCount);
    } else if (selectedCount === 0 && availableCount > 0) {
      if (availableCount >= 5) setSelectedCount(5);
      else setSelectedCount(availableCount);
    }
  }, [availableCount, selectedCount]);

  const handleStart = async () => {
    if (availableCount === 0) return;
    setIsStarting(true);
    setStartError('');
    try {
      const session = await speakingApi.createSession({
        language,
        topic: selectedTopic,
        level: selectedLevel,
        mode: selectedMode,
        requestedCount: selectedCount
      });
      router.push(`/speaking/session/${session.id}`);
    } catch (err: any) {
      setStartError(err.message || 'Lỗi khi tạo phiên luyện.');
      setIsStarting(false);
    }
  };

  const handleResume = (sessionId: string) => {
    router.push(`/speaking/session/${sessionId}`);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setStartError('');
    try {
      const res = await speakingApi.seedAiPrompts(selectedTopic, selectedLevel, language);
      alert(res.message);
      onRefresh(); 
    } catch (err: any) {
      setStartError(err.message || 'Lỗi khi yêu cầu AI tạo câu.');
    } finally {
      setIsSeeding(false);
    }
  };

  const topicOptions: SelectOption[] = defaultTopics.map(t => ({
    value: t,
    label: t
  }));

  const levelOptions: SelectOption[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => ({
    value: l,
    label: l
  }));

  const countOptions: SelectOption[] = availableCount === 0 
    ? [{ value: 0, label: 'Chưa có câu phù hợp', disabled: true }]
    : [
        { value: 5, label: '5 câu', disabled: availableCount < 5 },
        { value: 10, label: '10 câu', disabled: availableCount < 10 },
        { value: 20, label: '20 câu', disabled: availableCount < 20 },
      ];
      
  if (availableCount > 0 && availableCount < 5 && !countOptions.some(c => c.value === availableCount)) {
    countOptions.unshift({ value: availableCount, label: `${availableCount} câu`, disabled: false });
  }

  const getLangName = (code: string) => {
    switch (code) {
      case 'en': return 'Anh';
      case 'ja': return 'Nhật';
      case 'ko': return 'Hàn';
      case 'zh': return 'Trung';
      case 'th': return 'Thái';
      default: return 'Ngoại ngữ';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Luyện nói</h2>
        <p className="text-slate-500">Cấu hình buổi luyện và theo dõi tiến độ của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 space-y-8 h-fit">
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">1. Chế độ luyện</label>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
            <button 
              onClick={() => setSelectedMode('read')}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg text-center transition-all min-h-[44px] ${selectedMode === 'read' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'}`}
            >
              <div className="font-bold text-sm">Đọc câu mẫu</div>
            </button>
            <button 
              onClick={() => setSelectedMode('translate')}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg text-center transition-all min-h-[44px] ${selectedMode === 'translate' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'}`}
            >
              <div className="font-bold text-sm">Dịch nói (Việt ➔ {getLangName(language)})</div>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 px-1 text-center">
            {selectedMode === 'read' ? 'Luyện độ trôi chảy và ngữ điệu bằng cách đọc to theo câu mẫu có sẵn.' : 'Phản xạ, kiểm tra từ vựng và độ tự nhiên khi tự dịch từ tiếng Việt.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">2. Chủ đề</label>
            <Select 
              value={selectedTopic}
              onChange={setSelectedTopic}
              options={topicOptions}
              className="w-full h-11"
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">3. Trình độ</label>
            <Select 
              value={selectedLevel}
              onChange={setSelectedLevel}
              options={levelOptions}
              className="w-full h-11"
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">4. Số lượng câu</label>
            <Select 
              value={selectedCount}
              onChange={setSelectedCount}
              options={countOptions}
              disabled={availableCount === 0}
              className="w-full h-11"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm">
              <span className="text-slate-500">Số câu khả dụng: </span>
              <span className={`font-bold ${availableCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                {availableCount} câu
              </span>
            </div>
            {availableCount === 0 && (
              <div className="text-xs text-slate-500 mt-1">
                Hãy chọn chủ đề/trình độ khác hoặc yêu cầu AI tạo thêm.
              </div>
            )}
            {startError && (
              <div className="text-sm font-medium text-rose-500 mt-1">
                {startError}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {availableCount < 20 && (
              <button 
                onClick={handleSeed}
                disabled={isSeeding || isStarting}
                className="flex-1 sm:flex-none px-6 py-3 font-semibold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <IconSparkles className="w-4 h-4" />}
                Tạo thêm
              </button>
            )}
            <button 
              onClick={handleStart}
              disabled={isStarting || availableCount === 0}
              className={`flex-1 sm:flex-none px-8 py-3 font-bold rounded-xl transition-all flex justify-center items-center gap-2 ${
                availableCount === 0 
                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-700/50 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bắt đầu luyện'}
            </button>
          </div>
        </div>
        </div>

        <div className="lg:col-span-4">
          {activeSessions.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center justify-between">
                Đang học dở
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs">{activeSessions.length}</span>
              </h3>
              
              <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 hide-scrollbar">
                {activeSessions.map(session => (
                  <div key={session.id} className="p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors cursor-pointer group" onClick={() => handleResume(session.id)}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{session.topic}</h4>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 shrink-0 ml-2">
                        {session.level}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 mb-4 flex items-center justify-between">
                      <span>{session.mode === 'read' ? 'Đọc mẫu' : 'Dịch nói'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{session.currentIndex} / {session.totalSentences}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all rounded-full" 
                        style={{ width: `${(session.currentIndex / session.totalSentences) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
