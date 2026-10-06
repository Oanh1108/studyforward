"use client";

import React, { useState, useEffect, useRef } from 'react';
import { YouTubePlayer } from './YouTubePlayer';
import { mediaApi } from '@/lib/mediaApi';
import { extractYouTubeId, parseTranscript, TranscriptSegment, VideoLessonData } from '@/lib/youtubeUtils';
import { IconMic, IconPlay } from '../icons';

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
  let i = target.length, j = user.length;
  while (i > 0 && j > 0) {
    if (target[i - 1] === user[j - 1]) {
      lcs.unshift({ word: target[i - 1], type: 'correct' as const });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      lcs.unshift({ word: target[i - 1], type: 'missing' as const });
      i--;
    } else {
      lcs.unshift({ word: user[j - 1], type: 'extra' as const });
      j--;
    }
  }
  while (i > 0) { lcs.unshift({ word: target[i - 1], type: 'missing' as const }); i--; }
  while (j > 0) { lcs.unshift({ word: user[j - 1], type: 'extra' as const }); j--; }
  return lcs;
}

export function YouTubeLesson({ initialMode = 'dictation' }: { initialMode?: 'dictation' | 'shadowing' }) {
  const [practiceType, setPracticeType] = useState<'dictation' | 'shadowing'>(initialMode);
  
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState('');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [lessonTitle, setLessonTitle] = useState('YouTube Practice');
  
  const [player, setPlayer] = useState<any>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [mode, setMode] = useState<'setup' | 'practice' | 'result'>('setup');
  
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [speed, setSpeed] = useState<number>(1.0);
  
  // Dictation specific
  const [isChecked, setIsChecked] = useState(false);
  const [diffResult, setDiffResult] = useState<{ word: string; type: 'correct' | 'missing' | 'extra' }[]>([]);
  
  // Shadowing specific
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // General progress
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [savedLessons, setSavedLessons] = useState<VideoLessonData[]>([]);
  const [wrongSegments, setWrongSegments] = useState<number[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadSavedLessons();
  }, []);

  const loadSavedLessons = async () => {
    try {
      const data = await mediaApi.getUserVideos();
      setSavedLessons(data);
    } catch (e) {
      console.warn("Could not load saved videos");
    }
  };

  const handleStartSetup = () => {
    const id = extractYouTubeId(videoUrl);
    if (!id) {
      alert("Link YouTube không hợp lệ. Vui lòng nhập link đúng.");
      return;
    }
    setVideoId(id);
    const parsed = parseTranscript(rawTranscript);
    if (parsed.length === 0) {
      alert("Vui lòng nhập bản chép lời để có thể thực hành.");
      return;
    }
    setSegments(parsed);
    setMode('practice');
    setCurrentSegmentIndex(0);
    setScore({ correct: 0, total: 0 });
    setWrongSegments([]);
    setPlayerError(null);
  };

  const selectSavedLesson = (lesson: VideoLessonData) => {
    setVideoId(lesson.youtubeVideoId);
    setLessonTitle(lesson.title);
    setRawTranscript(lesson.transcriptData);
    setSegments(JSON.parse(lesson.transcriptData));
    setMode('practice');
    setCurrentSegmentIndex(0);
    setScore({ correct: 0, total: 0 });
    setWrongSegments([]);
    setPlayerError(null);
  };

  const currentSegment = segments[currentSegmentIndex];

  const playSegment = () => {
    if (player && currentSegment) {
      player.setPlaybackRate(speed);
      player.seekTo(currentSegment.startTime);
      player.playVideo();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (player.getCurrentTime() >= currentSegment.endTime) {
          player.pauseVideo();
          clearInterval(timerRef.current);
        }
      }, 100);
    }
  };

  const handlePlayerError = (errCode: number) => {
    if (errCode === 2) setPlayerError("Video không tồn tại (ID không hợp lệ).");
    else if (errCode === 100) setPlayerError("Video không tìm thấy (có thể đã bị xóa hoặc private).");
    else if (errCode === 101 || errCode === 150) setPlayerError("Chủ sở hữu video không cho phép nhúng (embed) video này.");
    else setPlayerError("Lỗi không xác định từ YouTube player.");
  };

  // Shadowing Microphone Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setMicError(null);
      setAudioUrl(null);
    } catch (err) {
      setMicError("Không thể truy cập Micro. Vui lòng cấp quyền hoặc kiểm tra thiết bị.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
  };

  // Dictation Handlers
  const handleCheckDictation = () => {
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

  const markShadowingDifficult = () => {
    if (!wrongSegments.includes(currentSegmentIndex)) {
      setWrongSegments(prev => [...prev, currentSegmentIndex]);
    }
    setScore(prev => ({ ...prev, total: prev.total + 1 })); // Not perfect
    handleNext();
  };

  const markShadowingGood = () => {
    setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    handleNext();
  };

  const handleNext = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(p => p + 1);
      // Reset Dictation
      setUserInput('');
      setIsChecked(false);
      setDiffResult([]);
      // Reset Shadowing
      setAudioUrl(null);
      
      if (practiceType === 'dictation') setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setMode('result');
    if (videoId) {
      try {
        await mediaApi.saveVideoLesson({
          youtubeVideoId: videoId,
          title: lessonTitle,
          transcriptData: JSON.stringify(segments),
          scoreCorrect: score.correct,
          scoreTotal: score.total
        });
        loadSavedLessons();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  if (mode === 'setup') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-up">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Tạo bài luyện tập từ YouTube</h2>
            <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl">
              <button onClick={() => setPracticeType('dictation')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${practiceType === 'dictation' ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--text-secondary)]'}`}>Chép chính tả</button>
              <button onClick={() => setPracticeType('shadowing')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${practiceType === 'shadowing' ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--text-secondary)]'}`}>Shadowing</button>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Link YouTube:</label>
              <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Tiêu đề bài học:</label>
              <input type="text" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Nhập tiêu đề..." className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Bản chép lời (Transcript) kèm mốc thời gian:</label>
              <textarea
                value={rawTranscript}
                onChange={e => setRawTranscript(e.target.value)}
                placeholder="[00:05] Câu tiếng Anh thứ nhất\n[00:10] Câu thứ hai..."
                className="input w-full h-40 font-mono text-sm"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">* Hệ thống tự động phân tách câu dựa trên mốc thời gian. Bạn có thể tự sửa, nhập hoặc dán phụ đề tải về từ YouTube vào đây.</p>
            </div>
            <button onClick={handleStartSetup} className="btn-primary w-full py-3 rounded-xl font-bold">Bắt đầu học</button>
          </div>
        </div>

        {savedLessons.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Bài học đã lưu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedLessons.map(lesson => (
                <div key={lesson.id} onClick={() => selectSavedLesson(lesson)} className="bg-[var(--bg-subtle)] border border-[var(--border)] p-4 rounded-xl cursor-pointer hover:border-indigo-400 transition-all flex items-center gap-3">
                  <div className="w-16 h-10 bg-slate-200 dark:bg-slate-800 rounded flex-shrink-0 flex items-center justify-center text-xl overflow-hidden relative">
                    <img src={`https://img.youtube.com/vi/${lesson.youtubeVideoId}/default.jpg`} alt="thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-sm truncate">{lesson.title}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Tiến độ đợt trước: {lesson.scoreCorrect}/{lesson.scoreTotal}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'result') {
    return (
      <div className="space-y-6 animate-fade-up max-w-2xl mx-auto text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
        <div className="text-6xl mb-4">🎬</div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Hoàn thành bài luyện tập YouTube</h2>
        <p className="text-[var(--text-secondary)]">Bạn đã hoàn thành tốt {score.correct}/{score.total} đoạn.</p>
        <p className="text-xs text-indigo-600 mt-2">* Kết quả đã được lưu. Điểm luyện tập này không tự động tính vào trình độ tiếng Anh.</p>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setMode('setup')} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
            Về danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left side: Video Player */}
      <div className="lg:col-span-2 space-y-4">
        {videoId && (
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm bg-black relative">
            <YouTubePlayer videoId={videoId} onReady={(p) => setPlayer(p)} onError={handlePlayerError} />
            {playerError && (
              <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center p-4 text-center text-white z-10 backdrop-blur-sm">
                <div>
                  <div className="text-4xl mb-2">⚠️</div>
                  <div className="font-bold text-rose-400">{playerError}</div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-2xl flex flex-col items-center justify-center gap-4">
          <button
            onClick={playSegment}
            disabled={!!playerError}
            className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95"
            title="Phát lại đoạn hiện tại"
          >
            ▶
          </button>
          <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Tốc độ:</span>
            {[0.5, 0.75, 1.0].map(s => (
              <button
                key={s}
                onClick={() => {
                  setSpeed(s);
                  if (player) player.setPlaybackRate(s);
                }}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${speed === s ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--text-secondary)] hover:text-indigo-600'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Input and Eval */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{lessonTitle}</h3>
            <div className="text-sm font-bold text-[var(--text-secondary)]">
              Đoạn {currentSegmentIndex + 1} / {segments.length}
            </div>
          </div>

          {/* ===== SHADOWING MODE ===== */}
          {practiceType === 'shadowing' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Câu mẫu (Shadowing):</div>
                <div className="text-[var(--text-primary)] font-medium text-xl leading-relaxed">{currentSegment?.text}</div>
              </div>

              <div className="flex flex-col items-center gap-4 py-4 border-y border-[var(--border)]">
                {micError && <div className="text-rose-500 text-sm font-bold bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg w-full text-center">{micError}</div>}
                
                {!audioUrl ? (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border-2 border-slate-300 dark:border-slate-700'}`}
                  >
                    {isRecording ? <div className="w-5 h-5 bg-white rounded-sm"></div> : <IconMic className="w-6 h-6" />}
                  </button>
                ) : (
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
                      <audio src={audioUrl} controls className="h-10 w-full" />
                      <button onClick={deleteRecording} className="text-rose-500 font-bold text-sm shrink-0 px-2 py-1 bg-rose-500/10 rounded-lg hover:bg-rose-500/20">Xóa</button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] text-center">* Bản ghi âm này chỉ được lưu tạm thời trên trình duyệt của bạn (RAM) và sẽ tự động xóa khi qua câu khác hoặc tải lại trang.</p>
                  </div>
                )}
                <div className="text-sm font-medium text-[var(--text-secondary)]">
                  {isRecording ? 'Đang ghi âm... Nhấn để dừng' : audioUrl ? 'Hãy đối chiếu bản thu với giọng gốc của video' : 'Nhấn để bắt đầu ghi âm giọng của bạn'}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setMode('setup')} className="text-sm text-[var(--text-muted)] hover:text-indigo-600 font-bold transition-all">← Quay lại</button>
                <div className="flex gap-2">
                  <button onClick={markShadowingDifficult} className="px-4 py-2 border-2 border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl font-bold transition-all">Đánh dấu khó</button>
                  <button onClick={markShadowingGood} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all">Tiếp tục →</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== DICTATION MODE ===== */}
          {practiceType === 'dictation' && (
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
                <div className="mt-4 p-5 rounded-xl border-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 animate-fade-in space-y-4">
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
                        >
                          {d.word}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-indigo-100 dark:border-indigo-900/30">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Đáp án gốc:</div>
                    <div className="text-[var(--text-primary)] font-medium text-lg">{currentSegment?.text}</div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between items-center">
                <button onClick={() => setMode('setup')} className="text-sm text-[var(--text-muted)] hover:text-indigo-600 font-bold transition-all">← Quay lại</button>
                {isChecked ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    Tiếp tục <span>→</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCheckDictation}
                    disabled={!userInput.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
                  >
                    Kiểm tra
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
