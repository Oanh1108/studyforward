"use client";

import React, { useState, useEffect, useRef } from 'react';
import { focusApi, FocusSession } from '@/lib/focusApi';
import { useAuth } from '@/lib/authContext';
import { IconPlay, IconFire, IconClose, IconCheck } from '../icons';

const STORAGE_KEY = 'sf_focus_session';

interface FocusState {
  departure: string;
  destination: string;
  targetMinutes: number;
  startTime: number;
  pauseTime: number | null;
  totalPausedMs: number;
  status: 'running' | 'paused';
}

export function FocusTimerView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  
  // Setup fields
  const [departure, setDeparture] = useState('Việt Nam');
  const [destination, setDestination] = useState('New York');
  const [duration, setDuration] = useState(25);
  const [reduceMotion, setReduceMotion] = useState(false);
  
  // Timer state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [history, setHistory] = useState<FocusSession[]>([]);

  // Update loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadHistory();
    // Restore session from localStorage if exists
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: FocusState = JSON.parse(saved);
        setDeparture(state.departure);
        setDestination(state.destination);
        setDuration(state.targetMinutes);
        setIsActive(true);
        setIsPaused(state.status === 'paused');
        
        updateProgress(state);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const state: FocusState = JSON.parse(saved);
            updateProgress(state);
          } catch {}
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, isPaused]);

  const loadHistory = async () => {
    try {
      const data = await focusApi.getHistory();
      setHistory(data);
    } catch {}
  };

  const updateProgress = (state: FocusState) => {
    const now = state.status === 'paused' && state.pauseTime ? state.pauseTime : Date.now();
    const elapsed = now - state.startTime - state.totalPausedMs;
    setProgressMs(Math.max(0, elapsed));
    
    // Auto complete
    if (elapsed >= state.targetMinutes * 60 * 1000 && state.status === 'running') {
      handleEndSession(state, 'completed');
    }
  };

  const handleStart = () => {
    const state: FocusState = {
      departure,
      destination,
      targetMinutes: duration,
      startTime: Date.now(),
      pauseTime: null,
      totalPausedMs: 0,
      status: 'running'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setIsActive(true);
    setIsPaused(false);
    setProgressMs(0);
  };

  const handlePause = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const state: FocusState = JSON.parse(saved);
    state.status = 'paused';
    state.pauseTime = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setIsPaused(true);
  };

  const handleResume = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const state: FocusState = JSON.parse(saved);
    if (state.pauseTime) {
      state.totalPausedMs += (Date.now() - state.pauseTime);
      state.pauseTime = null;
    }
    state.status = 'running';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setIsPaused(false);
  };

  const handleStop = () => {
    if (confirm('Bạn có chắc muốn dừng chuyến bay sớm? Lịch sử sẽ ghi nhận bạn chưa hoàn thành.')) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        handleEndSession(JSON.parse(saved), 'aborted');
      }
    }
  };

  const handleEndSession = async (state: FocusState, status: 'completed' | 'aborted') => {
    setIsActive(false);
    localStorage.removeItem(STORAGE_KEY);
    
    const now = status === 'completed' ? state.startTime + state.totalPausedMs + (state.targetMinutes * 60000) : Date.now();
    const actualElapsedMs = now - state.startTime - state.totalPausedMs;
    const actualMinutes = Math.floor(actualElapsedMs / 60000);

    try {
      await focusApi.createSession({
        departure: state.departure,
        destination: state.destination,
        targetMinutes: state.targetMinutes,
        actualMinutes,
        status
      });
      loadHistory();
      if (status === 'completed') {
        alert('Chúc mừng chuyến bay đã hạ cánh an toàn! Bạn đã có một phiên tập trung tuyệt vời.');
      }
    } catch {}
  };

  // Rendering logic
  const targetMs = duration * 60 * 1000;
  const pct = Math.min(100, (progressMs / targetMs) * 100);
  const remainingMs = Math.max(0, targetMs - progressMs);
  
  const m = Math.floor(remainingMs / 60000);
  const s = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up px-2 pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Chuyến bay Tập trung ✈️</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Học tập không gián đoạn như đang trên một chuyến bay dài.</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
          <input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)} className="rounded" />
          Giảm chuyển động (Tiết kiệm pin)
        </label>
      </div>

      {!isActive ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h3 className="text-xl font-bold mb-6">Lên lịch trình bay</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Điểm đi</label>
              <input type="text" value={departure} onChange={e => setDeparture(e.target.value)} className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] p-4 rounded-2xl outline-none focus:border-indigo-500 font-bold text-lg" placeholder="VD: Hà Nội" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Điểm đến</label>
              <input type="text" value={destination} onChange={e => setDestination(e.target.value)} className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] p-4 rounded-2xl outline-none focus:border-indigo-500 font-bold text-lg" placeholder="VD: New York" />
            </div>
          </div>
          
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Thời gian bay (Phút)</label>
              <span className="text-3xl font-black text-indigo-600">{duration}</span>
            </div>
            <input type="range" min="5" max="180" step="5" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer dark:bg-indigo-900/50" />
            <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] mt-2">
              <span>5p</span>
              <span>180p</span>
            </div>
          </div>

          <button onClick={handleStart} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 flex justify-center items-center gap-3">
            🛫 CẤT CÁNH
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-indigo-900 to-slate-900 text-white border border-indigo-500/30 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
          {/* Stars background */}
          {!reduceMotion && (
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-2">Chuyến bay đang diễn ra</div>
            <div className="flex items-center gap-4 text-2xl md:text-4xl font-black mb-10">
              <span className="text-indigo-100 truncate max-w-[150px] md:max-w-[200px]">{departure}</span>
              <span className="text-indigo-500 text-sm md:text-xl">✈️</span>
              <span className="text-indigo-100 truncate max-w-[150px] md:max-w-[200px]">{destination}</span>
            </div>

            {/* Visual Progress Map */}
            <div className="w-full max-w-2xl relative h-16 mb-12">
              {/* Path */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 border-t-2 border-dashed border-indigo-500/50"></div>
              {/* Nodes */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(129,140,248,0.6)]"></div>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-4 bg-slate-600 rounded-full"></div>
              
              {/* Airplane */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 text-3xl transition-all ${reduceMotion ? '' : 'animate-bounce'}`}
                style={{ left: `calc(${pct}% - 15px)`, transitionDuration: '1s' }}
              >
                ✈️
              </div>
            </div>

            {/* Timer */}
            <div className={`text-6xl md:text-8xl font-black tabular-nums tracking-tighter mb-10 ${isPaused ? 'text-slate-400' : 'text-white'}`}>
              {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {isPaused ? (
                <button onClick={handleResume} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-lg">
                  Tiếp tục bay
                </button>
              ) : (
                <button onClick={handlePause} className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-lg">
                  Tạm dừng
                </button>
              )}
              <button onClick={handleStop} className="px-6 py-4 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold rounded-2xl transition-colors">
                Hạ cánh khẩn cấp
              </button>
            </div>
            
            <p className="mt-8 text-xs text-indigo-300 font-medium">Bộ đếm giờ vẫn sẽ chạy chính xác ngay cả khi bạn đổi tab hoặc tải lại trang.</p>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Lịch sử bay gần đây</h3>
          <div className="space-y-3">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-2xl gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${h.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                    {h.status === 'completed' ? '✅' : '⚠️'}
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{h.departure} → {h.destination}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">{new Date(h.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-bold">
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-muted)] uppercase">Mục tiêu</div>
                    <div className="text-[var(--text-primary)]">{h.targetMinutes}p</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-muted)] uppercase">Thực tế</div>
                    <div className={h.status === 'completed' ? 'text-emerald-600' : 'text-rose-500'}>{h.actualMinutes}p</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
