"use client";

import React, { useState, useEffect } from 'react';
import { learningPathsApi, LearningPath, LearningPathSection, LearningPathItem } from '@/lib/learningPathsApi';
import { IconPlus, IconClose, IconBook, IconCheck, IconPlay, IconLock } from '../icons';

export function LearningPathsView() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [mode, setMode] = useState<'list' | 'detail' | 'create'>('list');
  const [loading, setLoading] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [expectedLevel, setExpectedLevel] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);

  // Edit item/section state
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<'youtube' | 'vocab' | 'dictation' | 'shadowing'>('youtube');
  const [newItemRef, setNewItemRef] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    setLoading(true);
    try {
      const data = await learningPathsApi.getMyPaths();
      setPaths(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPathDetails = async (id: number) => {
    setLoading(true);
    try {
      const data = await learningPathsApi.getPath(id);
      setSelectedPath(data);
      setMode('detail');
    } catch (e) {
      alert("Không thể tải lộ trình. Có thể nó đã bị xóa hoặc không có quyền truy cập.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePath = async () => {
    if (!title.trim()) return;
    try {
      await learningPathsApi.createPath({ title, description, goal, expectedLevel, isPrivate });
      setTitle('');
      setDescription('');
      setGoal('');
      setExpectedLevel('');
      setMode('list');
      loadPaths();
    } catch (e) {
      alert("Lỗi khi tạo lộ trình.");
    }
  };

  const handleCreateSection = async (pathId: number) => {
    const sTitle = prompt("Tên phần học mới (Ví dụ: Chương 1, Tuần 1):");
    if (!sTitle) return;
    try {
      await learningPathsApi.createSection(pathId, sTitle);
      loadPathDetails(pathId);
    } catch (e) {
      alert("Lỗi khi tạo phần học");
    }
  };

  const handleCreateItem = async (sectionId: number) => {
    if (!newItemTitle.trim()) return;
    try {
      await learningPathsApi.createItem(sectionId, {
        title: newItemTitle,
        type: newItemType,
        referenceId: newItemRef
      });
      setNewItemTitle('');
      setNewItemRef('');
      setActiveSectionId(null);
      if (selectedPath) loadPathDetails(selectedPath.id);
    } catch (e) {
      alert("Lỗi khi thêm bài học");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Xóa bài học này?")) return;
    try {
      await learningPathsApi.deleteItem(itemId);
      if (selectedPath) loadPathDetails(selectedPath.id);
    } catch (e) {
      alert("Lỗi khi xóa bài học");
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm("Xóa phần học này và toàn bộ bài học bên trong?")) return;
    try {
      await learningPathsApi.deleteSection(sectionId);
      if (selectedPath) loadPathDetails(selectedPath.id);
    } catch (e) {
      alert("Lỗi khi xóa phần học");
    }
  };

  const handleDeletePath = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lộ trình này?")) return;
    try {
      await learningPathsApi.deletePath(id);
      setMode('list');
      loadPaths();
    } catch (e) {
      alert("Lỗi khi xóa lộ trình");
    }
  };

  const toggleItemCompletion = async (item: LearningPathItem) => {
    try {
      if (item.completed) {
        await learningPathsApi.unmarkItemCompleted(item.id);
      } else {
        await learningPathsApi.markItemCompleted(item.id);
      }
      if (selectedPath) loadPathDetails(selectedPath.id);
    } catch (e) {
      console.warn(e);
    }
  };

  const renderIconForType = (type: string) => {
    switch (type) {
      case 'youtube': return <IconPlay className="w-4 h-4 text-rose-500" />;
      case 'vocab': return <IconBook className="w-4 h-4 text-blue-500" />;
      case 'dictation': return <IconBook className="w-4 h-4 text-emerald-500" />;
      case 'shadowing': return <IconPlay className="w-4 h-4 text-indigo-500" />;
      default: return <IconBook className="w-4 h-4 text-slate-500" />;
    }
  };

  const renderTypeLabel = (type: string) => {
    switch (type) {
      case 'youtube': return 'Video YouTube';
      case 'vocab': return 'Từ vựng';
      case 'dictation': return 'Chép chính tả';
      case 'shadowing': return 'Shadowing';
      default: return 'Khác';
    }
  };

  if (mode === 'create') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">Tạo lộ trình học mới</h2>
          <button onClick={() => setMode('list')} className="p-2 hover:bg-[var(--bg-subtle)] rounded-full transition-colors"><IconClose /></button>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Tên lộ trình *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Luyện nghe 30 ngày..." className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Mô tả</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Chi tiết lộ trình..." className="input w-full h-24 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Mục tiêu (VD: TOEIC 600)</label>
              <input type="text" value={goal} onChange={e => setGoal(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Trình độ dự kiến</label>
              <input type="text" value={expectedLevel} onChange={e => setExpectedLevel(e.target.value)} className="input w-full" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="isPrivate" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            <label htmlFor="isPrivate" className="text-sm font-medium">Bảo mật: Chỉ mình tôi có thể xem lộ trình này</label>
          </div>
          <button onClick={handleCreatePath} disabled={!title.trim()} className="btn-primary w-full py-3 rounded-xl font-bold mt-4">
            Tạo lộ trình
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'detail' && selectedPath) {
    const progressTotal = selectedPath.sections?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0;
    const progressCompleted = selectedPath.sections?.reduce((acc, s) => acc + (s.items?.filter(i => i.completed)?.length || 0), 0) || 0;
    const progressPct = progressTotal === 0 ? 0 : Math.round((progressCompleted / progressTotal) * 100);

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('list')} className="p-2 hover:bg-[var(--bg-subtle)] rounded-full transition-colors bg-[var(--bg-card)] border border-[var(--border)] font-bold text-sm">
            ← Quay lại
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-black flex items-center gap-2">
              {selectedPath.title}
              {selectedPath.isPrivate && <IconLock className="w-5 h-5 text-slate-400" />}
            </h2>
            <div className="text-sm text-[var(--text-secondary)] mt-1">{selectedPath.description || 'Không có mô tả'}</div>
          </div>
          <button onClick={() => handleDeletePath(selectedPath.id)} className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg hover:bg-rose-100 transition-colors text-sm">
            Xóa lộ trình
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm">Tiến độ hoàn thành</span>
            <span className="font-black text-indigo-600">{progressCompleted}/{progressTotal} ({progressPct}%)</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>

        {/* Sections & Items */}
        <div className="space-y-4">
          {selectedPath.sections?.map(section => (
            <div key={section.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-[var(--bg-subtle)] px-5 py-3 border-b border-[var(--border)] flex justify-between items-center">
                <h3 className="font-bold text-lg">{section.title}</h3>
                <button onClick={() => handleDeleteSection(section.id)} className="text-xs text-rose-500 font-bold hover:underline">Xóa phần</button>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {section.items?.map(item => (
                  <div key={item.id} className={`p-4 flex items-center justify-between transition-colors ${item.completed ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-[var(--bg-subtle)]'}`}>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleItemCompletion(item)} 
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400'}`}
                      >
                        <IconCheck className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <div className={`font-bold ${item.completed ? 'text-emerald-700 dark:text-emerald-400 line-through opacity-70' : ''}`}>{item.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-muted)]">
                          {renderIconForType(item.type)} {renderTypeLabel(item.type)} {item.referenceId && `(Nguồn: ${item.referenceId})`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* Navigate button placeholder - Would typically route to the specific practice view */}
                      {!item.completed && (
                        <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                          Học
                        </button>
                      )}
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add Item Form */}
                {activeSectionId === section.id ? (
                  <div className="p-4 bg-[var(--bg-subtle)] space-y-3">
                    <input type="text" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Tên bài học (VD: Luyện nghe Unit 1)..." className="input w-full text-sm py-2" />
                    <div className="flex gap-2">
                      <select value={newItemType} onChange={(e: any) => setNewItemType(e.target.value)} className="input text-sm py-2 w-1/3">
                        <option value="youtube">Video YouTube</option>
                        <option value="vocab">Từ vựng</option>
                        <option value="dictation">Chép chính tả</option>
                        <option value="shadowing">Shadowing</option>
                      </select>
                      <input type="text" value={newItemRef} onChange={e => setNewItemRef(e.target.value)} placeholder="ID video hoặc Link liên kết..." className="input text-sm py-2 flex-1" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setActiveSectionId(null)} className="px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--border)] rounded-lg">Hủy</button>
                      <button onClick={() => handleCreateItem(section.id)} disabled={!newItemTitle.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm">Thêm bài</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setActiveSectionId(section.id)} className="w-full p-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-2 transition-colors">
                    <IconPlus className="w-4 h-4" /> Thêm bài học mới
                  </button>
                )}
              </div>
            </div>
          ))}

          <button onClick={() => handleCreateSection(selectedPath.id)} className="w-full p-4 rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--text-secondary)] font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all flex items-center justify-center gap-2">
            <IconPlus className="w-5 h-5" /> Thêm phần học mới
          </button>
        </div>
      </div>
    );
  }

  // LIST MODE
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Lộ trình học của tôi</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Tự thiết kế con đường học tập hoặc lưu lại các lộ trình hay.</p>
        </div>
        <button onClick={() => setMode('create')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
          <IconPlus className="w-4 h-4" /> Tạo lộ trình
        </button>
      </div>

      {loading && paths.length === 0 ? (
        <div className="py-20 text-center text-[var(--text-muted)] font-bold animate-pulse">Đang tải...</div>
      ) : paths.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold mb-2">Chưa có lộ trình nào</h3>
          <p className="text-[var(--text-secondary)] mb-6 text-sm">Bạn chưa tạo hoặc tham gia lộ trình học nào.</p>
          <button onClick={() => setMode('create')} className="px-6 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold transition-colors hover:bg-indigo-200 dark:hover:bg-indigo-900/60">
            Tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paths.map(path => (
            <div key={path.id} onClick={() => loadPathDetails(path.id)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold group-hover:text-indigo-600 transition-colors line-clamp-1">{path.title}</h3>
                {path.isPrivate && <IconLock className="w-4 h-4 text-slate-400 shrink-0 ml-2" />}
              </div>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 flex-1">{path.description || 'Không có mô tả'}</p>
              
              <div className="flex gap-2">
                {path.goal && <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs font-bold">Mục tiêu: {path.goal}</span>}
                {path.expectedLevel && <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-bold">Trình độ: {path.expectedLevel}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
