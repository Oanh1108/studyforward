"use client";

import React, { useState, useEffect } from 'react';
import { notesApi, StudyNote } from '@/lib/notesApi';
import { IconSearch, IconPlus, IconClose, IconBook, IconPlay, IconCards } from '../icons';

export function NotesView({ onNavigate }: { onNavigate?: (tab: string, params?: any) => void }) {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async (q: string = search) => {
    setLoading(true);
    try {
      const data = await notesApi.getMyNotes(q);
      setNotes(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Debounce can be added here, using simple timeout
    setTimeout(() => loadNotes(e.target.value), 300);
  };

  const handleCreateNote = async () => {
    if (!newContent.trim()) return;
    try {
      await notesApi.createNote({
        content: newContent,
        targetType: 'general',
        targetName: 'Ghi chú chung'
      });
      setNewContent("");
      setIsCreating(false);
      loadNotes();
    } catch (e) {
      alert('Không thể tạo ghi chú');
    }
  };

  const handleUpdateNote = async (id: number) => {
    if (!editContent.trim()) return;
    try {
      await notesApi.updateNote(id, editContent);
      setIsEditing(null);
      loadNotes();
    } catch (e) {
      alert('Không thể cập nhật ghi chú');
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;
    try {
      await notesApi.deleteNote(id);
      loadNotes();
    } catch (e) {
      alert('Không thể xóa ghi chú');
    }
  };

  const formatTime = (seconds?: number | null) => {
    if (seconds == null) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderIcon = (type?: string | null) => {
    if (type === 'vocab') return <IconCards className="w-4 h-4 text-emerald-500" />;
    if (type === 'video' || type === 'shadowing' || type === 'dictation') return <IconPlay className="w-4 h-4 text-rose-500" />;
    if (type === 'lesson') return <IconBook className="w-4 h-4 text-blue-500" />;
    return <IconBook className="w-4 h-4 text-slate-500" />;
  };

  const handleNoteClick = (note: StudyNote) => {
    if (onNavigate) {
      if (String(note.targetType) === 'video' || String(note.targetType) === 'dictation' || String(note.targetType) === 'shadowing') {
        // Send signal to dictation tab with video params
        onNavigate('dictation', { videoId: note.targetId, seekTo: note.timestamp });
      } else if (note.targetType === 'vocab') {
        onNavigate('my-vocab');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Sổ Ghi chú</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Lưu trữ mọi ghi chú học tập, thời gian video và từ vựng.</p>
        </div>
        
        <button onClick={() => setIsCreating(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2">
          <IconPlus className="w-4 h-4" /> Thêm ghi chú
        </button>
      </div>

      <div className="relative">
        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input 
          type="text" 
          value={search} 
          onChange={handleSearch} 
          placeholder="Tìm kiếm nội dung, tên bài học..." 
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3.5 pl-12 pr-4 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors shadow-sm font-medium"
        />
      </div>

      {isCreating && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-2xl shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold mb-3">
            Ghi chú chung
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            className="w-full h-24 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-[var(--text-primary)] resize-none"
            placeholder="Nhập nội dung ghi chú..."
            autoFocus
          ></textarea>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 font-bold text-[var(--text-secondary)] hover:bg-[var(--border)] rounded-lg">Hủy</button>
            <button onClick={handleCreateNote} disabled={!newContent.trim()} className="px-5 py-2 font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50">Lưu</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[var(--text-muted)] font-bold animate-pulse">Đang tải...</div>
      ) : notes.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-xl font-bold mb-2">Chưa có ghi chú nào</h3>
          <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Bạn có thể tạo ghi chú ở đây, hoặc lưu nhanh ghi chú trong lúc xem video và học từ vựng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map(note => (
            <div key={note.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition-shadow group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="flex items-center gap-2 px-2 py-1 bg-[var(--bg-subtle)] rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                  onClick={() => handleNoteClick(note)}
                  title="Đi đến liên kết"
                >
                  {renderIcon(note.targetType)}
                  <span className="text-xs font-bold text-[var(--text-secondary)] truncate max-w-[150px]">{note.targetName || 'Ghi chú'}</span>
                  {note.timestamp != null && (
                    <span className="text-xs font-mono bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-1.5 py-0.5 rounded ml-1">
                      {formatTime(note.timestamp)}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setIsEditing(note.id); setEditContent(note.content); }} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 p-1.5 rounded">Sửa</button>
                  <button onClick={() => handleDeleteNote(note.id)} className="text-xs font-bold text-rose-600 hover:bg-rose-50 p-1.5 rounded">Xóa</button>
                </div>
              </div>

              {isEditing === note.id ? (
                <div className="mt-2 flex-1 flex flex-col">
                  <textarea 
                    value={editContent} 
                    onChange={e => setEditContent(e.target.value)} 
                    className="w-full h-24 p-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg outline-none focus:border-indigo-500 resize-none flex-1"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setIsEditing(null)} className="px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--border)] rounded">Hủy</button>
                    <button onClick={() => handleUpdateNote(note.id)} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded shadow-sm">Lưu</button>
                  </div>
                </div>
              ) : (
                <p className="text-[var(--text-primary)] text-sm whitespace-pre-wrap flex-1">{note.content}</p>
              )}
              
              <div className="text-[10px] text-[var(--text-muted)] mt-4 font-medium">
                {new Date(note.updatedAt).toLocaleDateString('vi-VN')} {new Date(note.updatedAt).toLocaleTimeString('vi-VN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
