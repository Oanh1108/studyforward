"use client";

import React, { useState } from 'react';
import { Lesson } from './types';
import { IconClose, IconSpeaker, IconMic, IconCheck, IconStar } from './icons';
import { speakText } from './speechHelper';
import { useAuth } from '@/lib/authContext';

interface LessonModalProps {
  lesson: Lesson;
  onClose: () => void;
  onCompleteLesson: (lessonId: string, earnedXp: number) => void;
}

export function LessonModal({ lesson, onClose, onCompleteLesson }: LessonModalProps) {
  const { currentLanguage } = useAuth();
  // Steps: 1: Context/Audio, 2: Multiple Choice, 3: Word Arrange, 4: Complete
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 3;

  // Step 2 state: Multiple Choice
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const correctAnswer = 1; // 0-indexed

  // Step 3 state: Speaking / Word drill
  const [isRecording, setIsRecording] = useState(false);
  const [recordedScore, setRecordedScore] = useState<number | null>(null);

  // Audio playing
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handlePlayAudio = (text: string) => {
    setIsPlayingAudio(true);
    speakText(text, currentLanguage).then(() => setIsPlayingAudio(false));
  };

  const handleSimulateRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setRecordedScore(92);
    }, 2000);
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setIsAnswerChecked(false);
      setSelectedOption(null);
    } else {
      // Complete lesson!
      onCompleteLesson(lesson.id, lesson.xpReward);
      setCurrentStep(4); // Finish screen
    }
  };

  const lessonDialogue = `${lesson.title}. ${lesson.subtitle}`;
  const lessonSpeakingSentence = lesson.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-y-auto">
      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-[var(--bg-card)] md:rounded-3xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden animate-fade-up">
        
        {/* 1. Header with Progress bar */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-card)]">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center transition-colors"
          >
            <IconClose className="w-5 h-5" />
          </button>

          {/* Step indicator */}
          <div className="flex-1 max-w-xs mx-4">
            <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1">
              <span>BƯỚC {Math.min(currentStep, totalSteps)}/{totalSteps}</span>
              <span className="text-amber-500 font-bold">+{lesson.xpReward} XP</span>
            </div>
            <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(Math.min(currentStep, totalSteps) / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="w-9"></div>
        </div>

        {/* 2. Body Content by Step */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          
          {/* STEP 1: Nghe & Ngữ cảnh mẫu */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  Phần 1: Nghe & Hiểu ngữ cảnh
                </span>
                <span className="text-xs text-[var(--text-muted)]">{lesson.title}</span>
              </div>

              <h2 className="text-lg md:text-xl font-black text-[var(--text-primary)]">
                Lắng nghe cuộc đàm phán ngắn sau:
              </h2>

              {/* Audio Player Card */}
              <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePlayAudio(lessonDialogue)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-all active:scale-95 ${
                        isPlayingAudio ? 'bg-amber-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      <IconSpeaker className="w-6 h-6" />
                    </button>
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        Hội thoại bài học: {lesson.title}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {isPlayingAudio ? 'Đang phát âm thanh...' : 'Bấm để nghe giọng người bản xứ (0.95x)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtitle / Script */}
                <div className="p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] space-y-1.5">
                  <p className="text-sm font-medium text-[var(--text-primary)] italic">
                    {`"${lessonDialogue}"`}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Nội dung trọng tâm: {lesson.subtitle}
                  </p>
                </div>
              </div>

              {/* Key vocab notes */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-1.5">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  💡 Điểm ngữ pháp & Từ khóa cốt lõi:
                </span>
                <p className="text-[var(--text-secondary)]">
                  • <strong>Clarify</strong> (/ˈklær.ɪ.faɪ/): Làm rõ, giải thích tường minh hơn.<br />
                  • <strong>Timeline for delivery</strong>: Lộ trình/thời hạn bàn giao sản phẩm.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Trắc nghiệm phản xạ */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">
                  Phần 2: Trắc nghiệm phản xạ
                </span>
              </div>

              <h2 className="text-lg md:text-xl font-black text-[var(--text-primary)]">
                Khi đối tác hỏi &ldquo;Could you clarify the timeline?&rdquo;, câu phản hồi nào chuyên nghiệp nhất?
              </h2>

              <div className="space-y-3 pt-2">
                {[
                  "No, I cannot answer right now because I am busy.",
                  "Certainly! We can deliver the first draft by this Friday and the final version by next Tuesday.",
                  "Why do you ask that? Everything is already written in the contract.",
                ].map((option, idx) => {
                  let borderClass = "border-[var(--border)] hover:border-indigo-400";
                  const bgClass = "bg-[var(--bg-card)]";

                  if (selectedOption === idx) {
                    borderClass = "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20";
                  }

                  if (isAnswerChecked) {
                    if (idx === correctAnswer) {
                      borderClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
                    } else if (selectedOption === idx) {
                      borderClass = "border-rose-500 bg-rose-50 dark:bg-rose-950/40";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswerChecked}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all text-sm font-medium flex items-center justify-between gap-3 ${borderClass} ${bgClass}`}
                    >
                      <span>{option}</span>
                      <span className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center text-xs font-bold shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Instant feedback box */}
              {isAnswerChecked && (
                <div
                  className={`p-4 rounded-2xl border animate-fade-up ${
                    selectedOption === correctAnswer
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                      : 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-2 mb-1">
                    {selectedOption === correctAnswer ? (
                      <>
                        <IconCheck className="w-5 h-5 text-emerald-600" />
                        <span>Chính xác! Bạn trả lời rất chuẩn.</span>
                      </>
                    ) : (
                      <>
                        <span>Chưa chính xác!</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed">
                    {selectedOption === correctAnswer
                      ? "Câu B đưa ra mốc thời gian cụ thể (first draft, final version) với phong thái nhiệt tình ('Certainly!')."
                      : "Đáp án đúng là B: Thể hiện sự sẵn lòng cung cấp thông tin chi tiết và mốc bàn giao cụ thể."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Luyện phát âm câu chốt */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  Phần 3: Luyện nói phát âm
                </span>
              </div>

              <h2 className="text-lg md:text-xl font-black text-[var(--text-primary)]">
                Luyện nói câu hỏi sau với ngữ điệu tự nhiên:
              </h2>

              {/* Target sentence display */}
              <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl text-center space-y-2">
                <div className="text-lg md:text-xl font-black text-[var(--text-primary)]">
                  {`"${lessonSpeakingSentence}"`}
                </div>
                <div className="text-xs text-[var(--text-muted)] font-medium">
                  {lesson.subtitle}
                </div>
                <button
                  onClick={() => handlePlayAudio(lessonSpeakingSentence)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                >
                  <IconSpeaker className="w-4 h-4" /> Nghe phát âm mẫu
                </button>
              </div>

              {/* Recording button */}
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <button
                  onClick={handleSimulateRecording}
                  disabled={isRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 active:scale-95 ${
                    isRecording
                      ? 'bg-rose-500 animate-pulse ring-8 ring-rose-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <IconMic className="w-8 h-8" />
                </button>

                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {isRecording ? 'Đang lắng nghe... Hãy nói to rõ' : 'Chạm vào mic và đọc to câu trên'}
                </span>

                {/* Score badge after recording */}
                {recordedScore !== null && (
                  <div className="w-full max-w-sm p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center animate-fade-up">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {recordedScore}%
                    </div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
                      Phát âm rất tốt! Trọng âm và ngữ điệu tự nhiên.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Màn hình chúc mừng hoàn thành */}
          {currentStep === 4 && (
            <div className="text-center py-8 space-y-4 animate-fade-up">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center animate-bounce">
                <IconStar className="w-10 h-10 fill-current" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  Chúc mừng bạn đã hoàn thành!
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Bạn đã xuất sắc làm chủ nội dung bài học {lesson.title}.
                </p>
              </div>

              {/* XP and Streak rewards */}
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto py-2">
                <div className="bg-[var(--bg-subtle)] p-3 rounded-2xl border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)] font-semibold">Điểm XP</div>
                  <div className="text-xl font-black text-amber-500">+{lesson.xpReward} XP</div>
                </div>
                <div className="bg-[var(--bg-subtle)] p-3 rounded-2xl border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)] font-semibold">Chuỗi ngày</div>
                  <div className="text-xl font-black text-emerald-500">+1 Ngày 🔥</div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full max-w-xs mx-auto py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
              >
                Hoàn thành & Quay lại Dashboard
              </button>
            </div>
          )}
        </div>

        {/* 3. Sticky Bottom Action Bar */}
        {currentStep < 4 && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              Mẹo: Luyện nói to để cơ miệng hình thành phản xạ tiếng Anh tự nhiên.
            </span>

            {currentStep === 2 && !isAnswerChecked ? (
              <button
                disabled={selectedOption === null}
                onClick={() => setIsAnswerChecked(true)}
                className="w-full sm:w-auto ml-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                Kiểm tra đáp án
              </button>
            ) : (
              <button
                onClick={handleNextStep}
                className="w-full sm:w-auto ml-auto px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                {currentStep === totalSteps ? 'Hoàn thành bài học →' : 'Tiếp tục →'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
