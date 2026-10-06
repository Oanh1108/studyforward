"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { PlacementQuestion, PlacementTestResult, placementTestApi } from '@/lib/placementTestApi';
import Link from 'next/link';

export function PlacementTestView() {
  const { user } = useAuth();
  
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [history, setHistory] = useState<PlacementTestResult[]>([]);
  
  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States: 'intro' | 'testing' | 'result'
  const [stage, setStage] = useState<'intro' | 'testing' | 'result'>('intro');
  const [currentResult, setCurrentResult] = useState<PlacementTestResult | null>(null);

  // Testing state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (user) {
      loadHistory();
      loadQuestions();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const data = await placementTestApi.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  const loadQuestions = async () => {
    try {
      const data = await placementTestApi.getQuestions();
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải đề thi');
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    if (questions.length === 0) return;
    setAnswers({});
    setCurrentQuestionIndex(0);
    setStage('testing');
  };

  const handleSelectAnswer = (qId: number, idx: number) => {
    setAnswers(prev => ({ ...prev, [qId]: idx }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current || submitting) return;

    if (Object.keys(answers).length < questions.length) {
      if (!confirm('Bạn chưa làm hết các câu hỏi. Vẫn nộp bài?')) return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const answersArray = Object.entries(answers).map(([qId, selectedIdx]) => ({
        questionId: Number(qId),
        selectedAnswerIndex: selectedIdx,
      }));
      
      const result = await placementTestApi.submitTest(answersArray);
      setCurrentResult(result);
      setStage('result');
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Lỗi nộp bài');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center p-10">
        <p className="text-[var(--text-secondary)]">Vui lòng đăng nhập để làm bài kiểm tra.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (stage === 'intro') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Bài Kiểm Tra Đầu Vào (Placement Test)
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Bài kiểm tra này giúp đánh giá trình độ tiếng Anh hiện tại của bạn thông qua các kỹ năng:
            <strong> Từ vựng, Ngữ pháp, và Đọc hiểu</strong>.
          </p>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6 text-sm text-amber-700 dark:text-amber-400">
            <strong>⚠️ Lưu ý:</strong>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Kết quả này chỉ mang tính chất tham khảo, không có giá trị thay thế các chứng chỉ quốc tế (IELTS, TOEIC,...).</li>
              <li>Bài thi hiện tại không đánh giá kỹ năng Nghe, Nói và Viết. Do đó, kết quả phản ánh năng lực Đọc-Hiểu (Receptive skills) của bạn.</li>
              <li>Bạn có thể làm lại bài kiểm tra bất kỳ lúc nào để theo dõi tiến độ.</li>
            </ul>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-6 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          <button
            onClick={startTest}
            disabled={questions.length === 0}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bắt đầu làm bài ({questions.length} câu)
          </button>
        </div>

        {history.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Lịch sử làm bài</h2>
            <div className="space-y-3">
              {history.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                  <div>
                    <div className="font-bold text-[var(--text-primary)] text-lg text-indigo-600 dark:text-indigo-400">
                      Trình độ ước lượng: {item.estimatedLevel}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Điểm: {item.totalScore}/{item.maxScore} (Từ vựng: {item.vocabScore}, Ngữ pháp: {item.grammarScore}, Đọc: {item.readingScore})
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-2 sm:mt-0 font-medium">
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (stage === 'testing') {
    const q = questions[currentQuestionIndex];
    if (!q) return null;

    return (
      <div className="max-w-3xl mx-auto animate-fade-in space-y-4">
        {/* Progress header */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between shadow-sm sticky top-20 z-10">
          <div className="font-bold text-[var(--text-primary)]">
            Câu {currentQuestionIndex + 1} / {questions.length}
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 uppercase tracking-wider">
            {q.type === 'vocab' ? 'Từ vựng' : q.type === 'grammar' ? 'Ngữ pháp' : 'Đọc hiểu'}
          </div>
        </div>

        {/* Question card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 md:p-8 shadow-sm space-y-6">
          {q.passage && (
            <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-sm leading-relaxed text-[var(--text-secondary)] mb-4">
              {q.passage}
            </div>
          )}

          <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)] leading-snug">
            {q.question}
          </h3>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const isSelected = answers[q.id] === idx;
              return (
                <label
                  key={idx}
                  className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                      : 'border-[var(--border)] hover:border-indigo-400 hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-3"
                    checked={isSelected}
                    onChange={() => handleSelectAnswer(q.id, idx)}
                  />
                  <span className="font-medium text-sm md:text-base">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Navigation actions */}
        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            onClick={prevQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] font-bold disabled:opacity-50 hover:bg-[var(--bg-subtle)] transition-all"
          >
            ← Câu trước
          </button>
          
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={nextQuestion}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition-all active:scale-95"
            >
              Câu tiếp →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang nộp...</span>
                </>
              ) : (
                'Nộp bài'
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'result' && currentResult) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-up space-y-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">Hoàn thành bài kiểm tra!</h2>
          <p className="text-[var(--text-secondary)] mb-8">Dưới đây là kết quả đánh giá năng lực hiện tại của bạn.</p>

          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-32 h-32 rounded-full border-4 border-indigo-100 dark:border-indigo-900 flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-950/30 mb-4 shadow-inner">
              <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                {currentResult.estimatedLevel}
              </span>
            </div>
            <div className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">
              Mức trình độ ước lượng
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
              <div className="text-xs text-[var(--text-muted)] font-bold uppercase mb-1">Từ vựng</div>
              <div className="text-xl font-extrabold text-[var(--text-primary)]">{currentResult.vocabScore}</div>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
              <div className="text-xs text-[var(--text-muted)] font-bold uppercase mb-1">Ngữ pháp</div>
              <div className="text-xl font-extrabold text-[var(--text-primary)]">{currentResult.grammarScore}</div>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
              <div className="text-xs text-[var(--text-muted)] font-bold uppercase mb-1">Đọc hiểu</div>
              <div className="text-xl font-extrabold text-[var(--text-primary)]">{currentResult.readingScore}</div>
            </div>
          </div>

          <div className="text-left bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl">
            <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
              <span>💡</span> Lời khuyên cho bạn
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              {currentResult.recommendedAction}
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => setStage('intro')}
              className="px-6 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-subtle)] transition-all"
            >
              Về trang chủ test
            </button>
            <Link
              href="/courses"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-all"
            >
              Xem khóa học gợi ý
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
