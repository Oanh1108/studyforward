"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { userStatsApi } from '@/lib/userStatsApi';
import { placementTestApi, PlacementTestResult } from '@/lib/placementTestApi';
import { IconClock, IconCards, IconStar, IconFire, IconCheck } from '../icons';

export function ProgressTrackerView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [testHistory, setTestHistory] = useState<PlacementTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [activityRes, testRes] = await Promise.all([
          userStatsApi.getActivityHistory(),
          placementTestApi.getHistory().catch(() => [])
        ]);
        setHistory(activityRes);
        setTestHistory(testRes);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const historyMap = new Map();
    history.forEach(item => {
      const d = new Date(item.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      historyMap.set(dateStr, item);
    });

    let daysToGenerate = 7;
    if (filter === 'month') daysToGenerate = 30;
    
    if (filter === 'all') {
      if (history.length === 0) {
        daysToGenerate = 7;
      } else {
        const oldest = new Date(Math.min(...history.map(h => new Date(h.date).getTime())));
        const oldestDate = new Date(oldest.getFullYear(), oldest.getMonth(), oldest.getDate());
        daysToGenerate = Math.max(7, Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 3600 * 24)) + 1);
      }
    }

    const continuousHistory = [];
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const existingData = historyMap.get(dateStr);
      if (existingData) {
        continuousHistory.push({ ...existingData, date: dateStr });
      } else {
        continuousHistory.push({
          date: dateStr,
          minutes: 0,
          wordsLearned: 0,
          xpEarned: 0
        });
      }
    }
    return continuousHistory;
  }, [history, filter]);

  const stats = useMemo(() => {
    return filteredHistory.reduce((acc, item) => ({
      minutes: acc.minutes + item.minutes,
      words: acc.words + item.wordsLearned,
      xp: acc.xp + item.xpEarned,
      days: acc.days + (item.minutes > 0 || item.wordsLearned > 0 || item.xpEarned > 0 ? 1 : 0)
    }), { minutes: 0, words: 0, xp: 0, days: 0 });
  }, [filteredHistory]);

  const maxMinutes = Math.max(...filteredHistory.map(h => h.minutes), 60);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Theo dõi tiến bộ</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Dữ liệu được thống kê dựa trên thời gian học và hoạt động thực tế.
          </p>
        </div>
        
        <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl">
          <button onClick={() => setFilter('week')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${filter === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--text-secondary)]'}`}>7 Ngày</button>
          <button onClick={() => setFilter('month')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${filter === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--text-secondary)]'}`}>30 Ngày</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${filter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--text-secondary)]'}`}>Tất cả</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2 text-sm font-bold"><IconClock className="w-4 h-4 text-blue-500"/> Thời gian học</div>
          <div className="text-3xl font-black">{stats.minutes} <span className="text-base font-medium text-[var(--text-muted)]">phút</span></div>
          <div className="text-xs text-[var(--text-muted)] mt-1">*Không cộng dồn khi để treo trang</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2 text-sm font-bold"><IconCards className="w-4 h-4 text-emerald-500"/> Từ vựng đã ôn</div>
          <div className="text-3xl font-black">{stats.words} <span className="text-base font-medium text-[var(--text-muted)]">từ</span></div>
          <div className="text-xs text-[var(--text-muted)] mt-1">*Bao gồm luyện chính tả & SRS</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2 text-sm font-bold"><IconStar className="w-4 h-4 text-amber-500"/> Điểm XP thu được</div>
          <div className="text-3xl font-black">{stats.xp} <span className="text-base font-medium text-[var(--text-muted)]">XP</span></div>
          <div className="text-xs text-[var(--text-muted)] mt-1">*Tích lũy từ bài học</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2 text-sm font-bold"><IconFire className="w-4 h-4 text-rose-500"/> Số ngày học</div>
          <div className="text-3xl font-black">{stats.days} <span className="text-base font-medium text-[var(--text-muted)]">ngày</span></div>
          <div className="text-xs text-[var(--text-muted)] mt-1">*Trong khoảng thời gian lọc</div>
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-3xl shadow-sm">
        <h3 className="font-bold text-lg mb-6">Biểu đồ thời gian học</h3>
        
        {loading ? (
          <div className="h-48 flex items-center justify-center text-[var(--text-muted)] font-bold animate-pulse">Đang tải dữ liệu...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[var(--text-muted)] font-bold">Chưa có dữ liệu học tập trong khoảng thời gian này.</div>
        ) : (
          <div className="flex items-stretch gap-2 h-48 pb-6 pt-8 overflow-x-auto">
            {filteredHistory.map((item, idx) => {
              const heightPct = Math.max(item.minutes > 0 ? 3 : 0, (item.minutes / maxMinutes) * 100);
              const dateObj = new Date(item.date);
              const isToday = new Date().toDateString() === dateObj.toDateString();
              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end min-w-[30px] group">
                  <div className="w-full flex-1 flex flex-col justify-end relative group-hover:bg-[var(--bg-subtle)] rounded-t-md transition-colors">
                    <div 
                      className="w-full bg-indigo-500 rounded-t-sm group-hover:bg-indigo-400 transition-all relative" 
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-md">
                        {item.minutes} phút
                      </div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold mt-2 whitespace-nowrap truncate w-full text-center shrink-0 ${isToday ? 'text-indigo-600' : 'text-[var(--text-muted)]'}`}>
                    {dateObj.getDate()}/{dateObj.getMonth() + 1}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PLACEMENT TEST HISTORY */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg">Lịch sử đánh giá năng lực</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">*Trình độ hiển thị không tự động tăng dựa theo số bài học mà yêu cầu bài kiểm tra thực tế.</p>
          </div>
          <button onClick={() => window.open('/placement-test', '_blank')} className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold rounded-xl text-sm transition-colors">
            Làm bài kiểm tra mới
          </button>
        </div>

        {testHistory.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            Bạn chưa thực hiện bài kiểm tra năng lực nào.
          </div>
        ) : (
          <div className="space-y-4">
            {testHistory.map(test => (
              <div key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-[var(--border)] rounded-2xl hover:border-indigo-300 transition-colors gap-4">
                <div>
                  <div className="font-bold text-lg text-[var(--text-primary)]">Trình độ ước tính: <span className="text-indigo-600">{test.estimatedLevel}</span></div>
                  <div className="text-sm text-[var(--text-secondary)] mt-1">Ngày thi: {new Date(test.createdAt).toLocaleDateString('vi-VN')}</div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-muted)] font-bold uppercase">Từ vựng</div>
                    <div className="font-black text-emerald-600">{test.vocabScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-muted)] font-bold uppercase">Ngữ pháp</div>
                    <div className="font-black text-amber-600">{test.grammarScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-muted)] font-bold uppercase">Đọc hiểu</div>
                    <div className="font-black text-blue-600">{test.readingScore}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
