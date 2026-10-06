"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { speakingApi, SpeakingTopicData, SpeakingSessionData, SpeakingStatData } from '@/lib/speakingApi';
import { useAuth } from '@/lib/authContext';
import { SpeakingPrompt, SpeakingHistory } from './types';
import { IconSpeaker, IconMic, IconSparkles } from './icons';
import { speakText } from './speechHelper';
import { Select, SelectOption } from '../ui/Select';
import { Loader2 } from 'lucide-react';

export function SpeakingView() {
  const { currentLanguage } = useAuth();
  
  const [topics, setTopics] = useState<SpeakingTopicData[]>([]);
  const [stats, setStats] = useState<SpeakingStatData[]>([]);
  const [activeSessionsList, setActiveSessionsList] = useState<SpeakingSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeSession, setActiveSession] = useState<{
    session: SpeakingSessionData;
    prompts: SpeakingPrompt[];
  } | null>(null);

  const fetchTopicsAndStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load topics and exact stats per level
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

  if (activeSession) {
    return <SpeakingSessionView 
      sessionData={activeSession} 
      onExit={() => { setActiveSession(null); fetchTopicsAndStats(); }} 
    />;
  }

  return (
    <SpeakingSetupView 
      topics={topics} 
      stats={stats}
      activeSessions={activeSessionsList}
      onStartSession={setActiveSession} 
      language={currentLanguage} 
      onRefresh={fetchTopicsAndStats}
    />
  );
}

function SpeakingSetupView({ 
  topics, 
  stats,
  activeSessions,
  onStartSession, 
  language,
  onRefresh
}: { 
  topics: SpeakingTopicData[], 
  stats: SpeakingStatData[],
  activeSessions: SpeakingSessionData[],
  onStartSession: (data: any) => void, 
  language: string,
  onRefresh: () => void 
}) {
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

  // Find the exact count for the selected topic and level
  const currentStat = stats.find(s => s.topic === selectedTopic && s.level === selectedLevel);
  const availableCount = currentStat?.count || 0;

  // Auto-adjust count if available count is less than selected
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
      const fullSession = await speakingApi.getSession(session.id);
      onStartSession(fullSession);
    } catch (err: any) {
      setStartError(err.message || 'Lỗi khi tạo buổi luyện.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleResume = async (sessionId: string) => {
    setIsStarting(true);
    setStartError('');
    try {
      const fullSession = await speakingApi.getSession(sessionId);
      onStartSession(fullSession);
    } catch (err: any) {
      setStartError(err.message || 'Lỗi khi tải phiên luyện.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setStartError('');
    try {
      const res = await speakingApi.seedAiPrompts(selectedTopic, selectedLevel, language);
      alert(res.message);
      onRefresh(); // Refresh stats
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Luyện nói</h2>
        <p className="text-slate-500">Cấu hình buổi luyện và theo dõi tiến độ của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Cấu hình */}
        <div className="lg:col-span-7 space-y-8">
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
            <p className="text-xs text-slate-500 mt-2 px-1">
              {selectedMode === 'read' ? 'Luyện độ trôi chảy và ngữ điệu bằng cách đọc to theo câu mẫu có sẵn.' : 'Phản xạ, kiểm tra từ vựng và độ tự nhiên khi tự dịch từ tiếng Việt.'}
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">2. Chủ đề</label>
            <Select 
              value={selectedTopic}
              onChange={setSelectedTopic}
              options={topicOptions}
              className="w-full h-11"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
        </div>

        {/* Right Column: Tóm tắt & Đang học dở */}
        <div className="lg:col-span-5 space-y-6">
          {/* Box Tóm tắt */}
          <div className="bg-white dark:bg-slate-800/80 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-4">Tóm tắt thiết lập</h3>
            
            <div className="flex-1 space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Chế độ</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMode === 'read' ? 'Đọc câu mẫu' : 'Dịch nói'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Ngôn ngữ</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Tiếng {getLangName(language)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Chủ đề</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[60%] line-clamp-1">{selectedTopic}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Trình độ</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLevel}</span>
              </div>
              
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-sm">
                <span className="text-slate-500">Số câu khả dụng</span>
                <span className={`font-bold ${availableCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                  {availableCount} câu
                </span>
              </div>
              
              {startError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium mt-2">
                  {startError}
                </div>
              )}
              
              {availableCount === 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 border border-slate-100 dark:border-slate-700">
                  Chưa có câu cho lựa chọn này. Hãy chọn chủ đề/trình độ khác hoặc yêu cầu AI tạo thêm nội dung.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleStart}
                disabled={isStarting || availableCount === 0}
                className={`w-full py-4 px-4 font-bold rounded-2xl transition-all flex justify-center items-center gap-2 min-h-[56px] ${
                  availableCount === 0 
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-700/50 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bắt đầu luyện'}
              </button>
              
              {availableCount < 20 && (
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding || isStarting}
                  className="w-full py-3 px-4 font-semibold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-2xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 min-h-[48px]"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <IconSparkles className="w-4 h-4" />}
                  Nhờ AI soạn thêm
                </button>
              )}
            </div>
          </div>

          {/* Box Đang học dở */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
              Đang học dở
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs">{activeSessions.length}</span>
            </h3>
            
            {activeSessions.length === 0 ? (
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                Chưa có phiên luyện nào đang học dở.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                {activeSessions.map(session => (
                  <div key={session.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors cursor-pointer group" onClick={() => handleResume(session.id)}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{session.topic}</h4>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 shrink-0 ml-2">
                        {session.level}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                      <span>{session.mode === 'read' ? 'Đọc mẫu' : 'Dịch nói'}</span>
                      <span>{session.currentIndex} / {session.totalSentences}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all" 
                        style={{ width: `${(session.currentIndex / session.totalSentences) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeakingSessionView({ sessionData, onExit }: { sessionData: { session: SpeakingSessionData; prompts: SpeakingPrompt[] }, onExit: () => void }) {
  const { session, prompts } = sessionData;
  const [currentIndex, setCurrentIndex] = useState(session.currentIndex);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const activePrompt = prompts[currentIndex];
  const isReadMode = session.mode === 'read';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        let langCode = 'en-US';
        if (activePrompt?.language === 'ko') langCode = 'ko-KR';
        if (activePrompt?.language === 'ja') langCode = 'ja-JP';
        if (activePrompt?.language === 'zh') langCode = 'zh-CN';
        if (activePrompt?.language === 'th') langCode = 'th-TH';
        recognitionRef.current.lang = langCode;

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            finalTranscript += event.results[i][0].transcript;
          }
          setTranscript(finalTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };
      }
    }
  }, [activePrompt?.language]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setResult(null);
      setEvalError(null);
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const handleEvaluate = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    setEvalError(null);
    try {
      const evalData = await speakingApi.evaluateTranscript({
        transcript,
        targetSentence: activePrompt.sentence,
        targetLanguage: activePrompt.language,
        meaningVi: activePrompt.meaningVi,
        mode: session.mode,
      });
      
      setResult(evalData);

      if (!hasEvaluated) {
        // Save history and XP in backend only once per prompt
        await speakingApi.recordHistory({
          sessionId: session.id,
          promptId: activePrompt.id,
          sentence: transcript,
          score: evalData.score,
          fluency: evalData.fluency,
          pronunciation: evalData.pronunciation,
          feedback: evalData.feedback,
          language: activePrompt.language,
        });
        setHasEvaluated(true);
      }

    } catch (err: any) {
      console.error(err);
      setEvalError(err.message || 'Có lỗi xảy ra khi chấm điểm!');
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = async () => {
    setResult(null);
    setEvalError(null);
    setTranscript('');
    setHasEvaluated(false);
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    await speakingApi.updateSessionProgress(session.id, newIndex);
  };

  if (!activePrompt) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl">🎉</div>
        <h2 className="text-2xl font-bold">Hoàn thành buổi luyện!</h2>
        <p className="text-slate-500">Bạn đã luyện tập xong {session.totalSentences} câu thuộc chủ đề "{session.topic}".</p>
        <button onClick={onExit} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Trở về danh sách</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <button onClick={onExit} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">← Thoát</button>
        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Câu {currentIndex + 1} / {session.totalSentences}</div>
        <div className="text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">{session.topic} - {session.level}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Question and Recording */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 space-y-8">
          
          <div className="text-center space-y-4">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {isReadMode ? 'HÃY ĐỌC CÂU SAU' : 'HÃY DỊCH CÂU SAU'}
            </div>
            
            {isReadMode ? (
              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{activePrompt.sentence}</h2>
                <p className="text-slate-500">{activePrompt.meaningVi}</p>
                <button 
                  onClick={() => speakText(activePrompt.sentence, activePrompt.language, 0.95)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  <IconSpeaker className="w-4 h-4" /> Nghe mẫu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{activePrompt.meaningVi}</h2>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex flex-col items-center justify-center space-y-6 min-h-[200px]">
            {isProcessing ? (
              <div className="flex flex-col items-center text-indigo-600 gap-3">
                <IconSparkles className="w-8 h-8 animate-pulse" />
                <span className="font-semibold text-sm">AI đang đánh giá...</span>
              </div>
            ) : (
              <>
                {transcript && (
                  <div className="text-center text-lg font-medium text-slate-700 dark:text-slate-300 px-4">
                    "{transcript}"
                  </div>
                )}
                
                {!result && !evalError && (
                  <>
                    <div className="flex gap-4">
                      <button
                        onClick={toggleRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${isRecording ? 'bg-rose-500 animate-pulse shadow-rose-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                      >
                        <IconMic className="w-7 h-7" />
                      </button>
                      
                      {transcript && !isRecording && (
                        <button 
                          onClick={handleEvaluate}
                          className="h-16 px-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2"
                        >
                          <IconSparkles className="w-5 h-5" /> Gửi AI Đánh giá
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {isRecording ? 'Đang nghe... Nhấn để dừng' : (transcript ? 'Bạn có thể ghi âm lại hoặc gửi đi' : 'Nhấn Micro để nói')}
                    </div>
                  </>
                )}
                
                {(result || evalError) && (
                  <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 w-full justify-center">
                    <button 
                      onClick={toggleRecording}
                      className="px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <IconMic className="w-4 h-4" /> Luyện lại
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Feedback & Result */}
        <div className="h-full">
          {evalError && (
            <div className="p-6 bg-rose-50 dark:bg-rose-900/20 rounded-3xl border border-rose-100 dark:border-rose-800/30 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
              <h3 className="font-bold text-rose-800 dark:text-rose-200">Đánh giá thất bại</h3>
              <p className="text-rose-600 dark:text-rose-300 text-sm">{evalError}</p>
              <button onClick={handleEvaluate} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition-colors mt-2">
                Thử đánh giá lại
              </button>
            </div>
          )}

          {result && !evalError && (
            <div className="p-6 md:p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/30 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <IconSparkles className="w-6 h-6 text-indigo-500" /> Nhận xét của AI
                </h3>
                <div className={`px-4 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/50 font-bold text-lg ${result.score >= 80 ? 'text-green-600' : result.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {result.score} / 100
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-indigo-900 dark:text-indigo-200 leading-relaxed whitespace-pre-wrap font-medium">
                  {result.feedback}
                </p>
              </div>

              {!isReadMode && (
                <div className="pt-6 border-t border-indigo-200 dark:border-indigo-800/50 space-y-3">
                  <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Câu tham khảo chuẩn:</div>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{activePrompt.sentence}</div>
                    <button 
                      onClick={() => speakText(activePrompt.sentence, activePrompt.language, 0.95)}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <IconSpeaker className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex justify-end">
                <button onClick={handleNext} className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all flex justify-center items-center gap-2">
                  Câu tiếp theo →
                </button>
              </div>
            </div>
          )}
          
          {!result && !evalError && !isProcessing && (
            <div className="hidden lg:flex h-full flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-center">
              <IconSparkles className="w-12 h-12 mb-4 opacity-50" />
              <p>Ghi âm và gửi AI để xem nhận xét chi tiết, chỉ ra lỗi sai và cách khắc phục.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
