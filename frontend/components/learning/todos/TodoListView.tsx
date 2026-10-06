"use client";

import React, { useState, useEffect } from 'react';
import { todosApi, TodoItem } from '@/lib/todosApi';
import { IconPlus, IconClose, IconCheck, IconBook } from '../icons';

export function TodoListView({ onNavigate }: { onNavigate?: (tab: string, params?: any) => void }) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    setLoading(true);
    try {
      const data = await todosApi.getMyTodos();
      setTodos(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async () => {
    if (!title.trim()) return;
    try {
      await todosApi.createTodo({
        title,
        note,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority
      });
      setTitle('');
      setNote('');
      setDueDate('');
      setPriority('medium');
      setIsCreating(false);
      loadTodos();
    } catch (e) {
      alert('Lỗi khi tạo công việc');
    }
  };

  const toggleComplete = async (todo: TodoItem) => {
    try {
      // Optimistic update
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, isCompleted: !t.isCompleted } : t));
      await todosApi.updateTodo(todo.id, { isCompleted: !todo.isCompleted });
    } catch (e) {
      loadTodos(); // revert on fail
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn xóa công việc này?')) return;
    try {
      await todosApi.deleteTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert('Lỗi khi xóa');
    }
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.isCompleted;
    if (filter === 'completed') return t.isCompleted;
    return true;
  });

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-rose-600 bg-rose-100 dark:bg-rose-900/30';
    if (p === 'medium') return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
    return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
  };

  const getPriorityLabel = (p: string) => {
    if (p === 'high') return 'Cao';
    if (p === 'medium') return 'TB';
    return 'Thấp';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">To-do List</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Lên kế hoạch và theo dõi các mục tiêu học tập.</p>
        </div>
        
        <button onClick={() => setIsCreating(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2">
          <IconPlus className="w-4 h-4" /> Thêm việc
        </button>
      </div>

      <div className="flex gap-2 bg-[var(--bg-card)] border border-[var(--border)] p-1.5 rounded-xl w-max shadow-sm">
        <button onClick={() => setFilter('active')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'active' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Đang làm</button>
        <button onClick={() => setFilter('completed')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Đã xong</button>
        <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'all' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Tất cả</button>
      </div>

      {isCreating && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Việc mới</h3>
            <button onClick={() => setIsCreating(false)} className="p-1 hover:bg-[var(--bg-subtle)] rounded-full text-[var(--text-muted)]"><IconClose className="w-5 h-5"/></button>
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Tiêu đề *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Luyện nghe Unit 1..." className="input w-full" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Ghi chú (Tùy chọn)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Chi tiết công việc..." className="input w-full h-20 resize-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Hạn hoàn thành</label>
              <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Mức ưu tiên</label>
              <select value={priority} onChange={(e: any) => setPriority(e.target.value)} className="input w-full text-sm">
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreateTodo} disabled={!title.trim()} className="btn-primary w-full py-2.5 rounded-xl font-bold mt-2">
            Lưu việc
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[var(--text-muted)] font-bold animate-pulse">Đang tải...</div>
      ) : filteredTodos.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-xl font-bold mb-2">Không có công việc nào</h3>
          <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Tất cả đều gọn gàng! Hãy thêm mục tiêu mới để tiếp tục học tập nhé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTodos.map(todo => {
            const isOverdue = todo.dueDate && !todo.isCompleted && new Date(todo.dueDate) < new Date();
            
            return (
              <div key={todo.id} className={`bg-[var(--bg-card)] border ${isOverdue ? 'border-rose-300 dark:border-rose-900/50' : 'border-[var(--border)]'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4`}>
                <button 
                  onClick={() => toggleComplete(todo)} 
                  className={`w-6 h-6 shrink-0 rounded-full border-2 mt-1 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400'}`}
                >
                  <IconCheck className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`font-bold text-lg truncate ${todo.isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                      {todo.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(todo.priority)}`}>
                      {getPriorityLabel(todo.priority)}
                    </span>
                    {todo.linkedType && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 flex items-center gap-1 cursor-pointer hover:bg-indigo-200" onClick={() => onNavigate && onNavigate(todo.linkedType === 'path' ? 'paths' : 'courses')}>
                        <IconBook className="w-3 h-3" /> Liên kết
                      </span>
                    )}
                  </div>
                  {todo.note && <p className={`text-sm mb-2 ${todo.isCompleted ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{todo.note}</p>}
                  {todo.dueDate && (
                    <div className={`text-xs font-bold ${isOverdue ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}>
                      Hạn: {new Date(todo.dueDate).toLocaleString('vi-VN')} {isOverdue && '(Quá hạn)'}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(todo.id)} className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0">
                  <IconClose className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
