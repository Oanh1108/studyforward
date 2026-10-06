"use client";

import React, { useState, useEffect, useRef } from 'react';
import { speakingApi, SpeakingSessionData, SpeakingPromptData } from '@/lib/speakingApi';
import { speakText } from '../speechHelper';
import { IconSpeaker, IconMic, IconSparkles } from '../icons';
import { Loader2, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SpeakingSessionLayout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SpeakingSessionData | null>(null);
  const [prompts, setPrompts] = useState<SpeakingPromptData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await speakingApi.getSession(sessionId);
        setSession(data.session);
        setPrompts(data.prompts);
        setCurrentIndex(data.session.currentIndex);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải phiên luyện.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  const activePrompt = prompts[currentIndex];
  const isReadMode = session?.mode === 'read';

  useEffect(() => {
    if (typeof window !== 'undefined' && activePrompt) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        let langCode = 'en-US';
        if (activePrompt.language === 'ko') langCode = 'ko-KR';
        if (activePrompt.language === 'ja') langCode = 'ja-JP';
        if (activePrompt.language === 'zh') langCode = 'zh-CN';
        if (activePrompt.language === 'th') langCode = 'th-TH';
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
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
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
    if (!transcript.trim() || !session || !activePrompt) return;
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
    if (!session) return;
    setResult(null);
    setEvalError(null);
    setTranscript('');
    setHasEvaluated(false);
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    await speakingApi.updateSessionProgress(session.id, newIndex);
  };

  const handleExit = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // Return to main dashboard/speaking tab
    router.push('/dashboard'); 
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-3xl">!</div>
        <h1 className="text-2xl font-bold text-slate-800">Không thể tải phiên học</h1>
        <p className="text-slate-500">{error}</p>
        <button onClick={handleExit} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Quay lại</button>
      </div>
    );
  }

  if (!activePrompt) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl">🎉</div>
        <h1 className="text-3xl font-extrabold text-slate-800">Hoàn thành buổi luyện!</h1>
        <p className="text-slate-500 max-w-md mx-auto text-lg">Bạn đã xuất sắc hoàn thành {session.totalSentences} câu thuộc chủ đề "{session.topic}".</p>
        <button onClick={handleExit} className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:-translate-y-1 transition-all">Trở về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* HEADER */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button onClick={handleExit} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Lưu & Thoát</span>
        </button>
        <div className="flex flex-col items-center">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">{session.topic}</div>
          <div className="text-xs font-semibold text-indigo-500">{session.level} • {isReadMode ? 'Đọc' : 'Dịch'}</div>
        </div>
        <div className="font-extrabold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl">
          {currentIndex + 1} / {session.totalSentences}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col justify-center gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* PROMPT AREA */}
        <div className="text-center space-y-6">
          <div className="text-sm md:text-base font-bold text-slate-400 uppercase tracking-[0.2em]">
            {isReadMode ? 'Hãy đọc to câu sau' : 'Hãy dịch câu sau sang Tiếng ' + activePrompt.language.toUpperCase()}
          </div>
          
          {isReadMode ? (
            <div className="space-y-6">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 dark:text-white leading-tight md:leading-tight">
                {activePrompt.sentence}
              </h1>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">{activePrompt.meaningVi}</p>
              <div className="pt-2">
                <button 
                  onClick={() => speakText(activePrompt.sentence, activePrompt.language, 0.95)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                >
                  <IconSpeaker className="w-5 h-5" /> Nghe người bản xứ
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 dark:text-white leading-tight md:leading-tight">
                {activePrompt.meaningVi}
              </h1>
            </div>
          )}
        </div>

        {/* TRANSCRIPT & RECORDING UI */}
        <div className="flex flex-col items-center justify-center space-y-8 min-h-[160px]">
          {isProcessing ? (
             <div className="flex flex-col items-center text-indigo-600 gap-4 animate-in zoom-in duration-300">
               <IconSparkles className="w-12 h-12 animate-pulse" />
               <span className="font-bold text-lg">AI đang phân tích giọng đọc...</span>
             </div>
          ) : (
             <>
                {/* Transcript Display */}
                {transcript && (
                  <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 text-center animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-xl md:text-2xl font-medium text-slate-700 dark:text-slate-200">
                      "{transcript}"
                    </p>
                  </div>
                )}
                
                {/* Controls */}
                {!result && !evalError && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-6">
                      {transcript && !isRecording && (
                        <button 
                          onClick={toggleRecording}
                          className="w-14 h-14 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-all shadow-sm"
                          title="Ghi âm lại"
                        >
                          <RotateCcw className="w-6 h-6" />
                        </button>
                      )}
                      
                      <button
                        onClick={toggleRecording}
                        className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 active:scale-95 ${isRecording ? 'bg-rose-500 animate-pulse shadow-rose-200/50' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50'}`}
                      >
                        <IconMic className="w-10 h-10 md:w-12 md:h-12" />
                      </button>

                      {transcript && !isRecording && (
                        <button 
                          onClick={handleEvaluate}
                          className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200/50"
                          title="Gửi đánh giá"
                        >
                          <IconSparkles className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-400">
                      {isRecording ? 'Đang ghi âm... Chạm để dừng' : (transcript ? 'Ghi âm lại hoặc gửi AI đánh giá' : 'Chạm để bắt đầu nói')}
                    </div>
                  </div>
                )}
             </>
          )}
        </div>

        {/* FEEDBACK AREA */}
        {(result || evalError) && (
          <div className="w-full bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 mb-12">
            {evalError ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">!</div>
                <h3 className="text-xl font-bold text-rose-800">Đánh giá thất bại</h3>
                <p className="text-rose-600">{evalError}</p>
                <div className="pt-4 flex justify-center gap-4">
                  <button onClick={toggleRecording} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Nói lại</button>
                  <button onClick={handleEvaluate} className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors">Thử chấm lại</button>
                </div>
              </div>
            ) : (
              <div className="p-6 md:p-10 space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-6">
                  <h3 className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 flex items-center gap-3">
                    <IconSparkles className="w-8 h-8 text-indigo-500" /> 
                    Phân tích từ AI
                  </h3>
                  <div className={`px-6 py-2 bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-inner border border-slate-100 dark:border-slate-700 font-black text-3xl ${result.score >= 80 ? 'text-emerald-500' : result.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {result.score} <span className="text-lg text-slate-400">/ 100</span>
                  </div>
                </div>
                
                <div className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {result.feedback}
                </div>

                {!isReadMode && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 space-y-4">
                    <div className="text-sm font-bold text-indigo-500 uppercase tracking-wider">Câu tham khảo chuẩn</div>
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activePrompt.sentence}</h4>
                      <button 
                        onClick={() => speakText(activePrompt.sentence, activePrompt.language, 0.95)}
                        className="p-3 bg-white dark:bg-slate-800 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm shrink-0"
                      >
                        <IconSpeaker className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={toggleRecording} 
                    className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex justify-center items-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" /> Thử lại
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-1 transition-all flex justify-center items-center gap-2"
                  >
                    Câu tiếp theo <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
