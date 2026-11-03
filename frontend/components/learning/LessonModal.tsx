"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import { Lesson } from './types';
import { speakText } from './speechHelper';
import { useAuth } from '@/lib/authContext';
import { useSpeechCapture } from './useSpeechCapture';
import { compareWords } from '@/lib/speechAudio';
import { LessonStepper } from './lesson/LessonStepper';
import { ListenStep } from './lesson/ListenStep';
import { DictationStep } from './lesson/DictationStep';
import { SpeakStep } from './lesson/SpeakStep';
import { CompleteStep } from './lesson/CompleteStep';
import { QuizStep } from './lesson/QuizStep';
import { getLessonFlow, practiceText } from './lesson/lessonFlow';

interface LessonModalProps {
  lesson: Lesson;
  onClose: () => void;
  onCompleteLesson: (lessonId: string, earnedXp: number) => void;
}

const primaryBtn =
  'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function LessonModal({ lesson, onClose, onCompleteLesson }: LessonModalProps) {
  const { currentLanguage } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);

  // The steps depend on the lesson's skill and on whether it has quiz content (see lessonFlow.ts).
  const flow = useMemo(() => getLessonFlow(lesson), [lesson]);
  const sentence = practiceText(lesson);
  const questions = lesson.content?.quiz ?? [];
  const [step, setStep] = useState(1);
  const finished = step > flow.length;
  const current = finished ? null : flow[step - 1];

  // Quiz step
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [quizChecked, setQuizChecked] = useState(false);
  const selectAnswer = (questionIndex: number, optionIndex: number) =>
    setAnswers((prev) => prev.map((a, i) => (i === questionIndex ? optionIndex : a)));

  // Dictation step
  const [dictationText, setDictationText] = useState('');
  const [dictationChecked, setDictationChecked] = useState(false);
  const dictation = dictationChecked ? compareWords(sentence, dictationText) : null;

  // Speak step
  const speech = useSpeechCapture(currentLanguage, current?.key === 'speak');
  const speakComparison = speech.finalTranscript !== null ? compareWords(sentence, speech.finalTranscript) : null;

  // Sample audio
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const playAudio = (text: string, rate?: number) => {
    setIsPlayingAudio(true);
    speakText(text, currentLanguage, rate).then(() => setIsPlayingAudio(false));
  };
  const playWord = (word: string) => playAudio(word.replace(/[^\p{L}\p{N}'-]/gu, ''), 0.8);

  // Dialog behaviour: focus it, close on Escape, lock page scroll behind it.
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const next = () => {
    if (step < flow.length) {
      setStep(step + 1);
    } else {
      onCompleteLesson(lesson.id, lesson.xpReward);
      setStep(flow.length + 1);
    }
  };

  const quizReady = answers.length === questions.length && answers.every((a) => a !== null);
  const needsCheck = (current?.key === 'dictation' && !dictationChecked) || (current?.key === 'quiz' && !quizChecked);
  const canCheck = current?.key === 'quiz' ? quizReady : dictationText.trim() !== '';
  const runCheck = () => (current?.key === 'quiz' ? setQuizChecked(true) : setDictationChecked(true));
  const wide = current?.key === 'speak' || current?.key === 'dictation';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-dialog-title"
        tabIndex={-1}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg-card)] shadow-2xl outline-none animate-fade-up sm:h-[min(640px,92dvh)] sm:max-w-4xl sm:rounded-[24px] sm:border sm:border-[var(--border)]"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bài học"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p id="lesson-dialog-title" className="truncate text-sm font-bold text-[var(--text-primary)]">{lesson.title}</p>
            {!finished && <LessonStepper steps={flow} current={step} />}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <Star className="h-4 w-4" /> +{lesson.xpReward} XP
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className={`mx-auto w-full ${wide ? '' : 'max-w-xl'} ${finished ? 'flex min-h-full items-center justify-center' : ''}`}>
            {current?.key === 'listen' && (
              <ListenStep lesson={lesson} part={step} label={current.label} isPlaying={isPlayingAudio} onPlay={playAudio} />
            )}
            {current?.key === 'quiz' && (
              <QuizStep part={step} label={current.label} questions={questions} answers={answers} checked={quizChecked} onSelect={selectAnswer} />
            )}
            {current?.key === 'dictation' && (
              <DictationStep
                lesson={lesson}
                part={step}
                label={current.label}
                text={dictationText}
                onTextChange={setDictationText}
                comparison={dictation}
                isPlaying={isPlayingAudio}
                onPlay={playAudio}
                onPlayWord={playWord}
              />
            )}
            {current?.key === 'speak' && (
              <SpeakStep lesson={lesson} part={step} speech={speech} comparison={speakComparison} onPlay={playAudio} onPlayWord={playWord} />
            )}
            {finished && <CompleteStep lesson={lesson} onClose={onClose} />}
          </div>
        </div>

        {!finished && (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 sm:px-5">
            <p className="hidden min-w-0 flex-1 text-sm text-[var(--text-muted)] sm:block">
              Bước {step}/{flow.length}
            </p>
            {needsCheck ? (
              <button type="button" disabled={!canCheck} onClick={runCheck} className={`${primaryBtn} w-full sm:w-auto`}>
                Kiểm tra
              </button>
            ) : (
              <button type="button" onClick={next} className={`${primaryBtn} w-full sm:w-auto`}>
                {step === flow.length ? 'Hoàn thành bài học' : 'Tiếp tục'}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
