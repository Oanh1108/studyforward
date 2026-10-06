import { useState, useEffect } from 'react';
import { Plus, LayoutTemplate, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { studyBoardsApi } from '@/lib/studyBoardsApi';

export function StudyBoardManagerView({ onOpenBoard }: { onOpenBoard: (boardId: string) => void }) {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await studyBoardsApi.getBoards();
      setBoards(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    const name = prompt('Nhập tên bảng học:');
    if (!name) return;
    try {
      const res = await studyBoardsApi.createBoard(name);
      setBoards([res, ...boards]);
      onOpenBoard(res.id);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa bảng này không?')) return;
    try {
      await studyBoardsApi.deleteBoard(id);
      setBoards(boards.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Bảng học từ</h1>
          <p className="text-[var(--text-secondary)] mt-1">Không gian tự do để bạn vẽ, viết và ghi nhớ từ vựng.</p>
        </div>
        <button onClick={createBoard} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md">
          <Plus className="w-5 h-5" /> Bảng mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map(board => (
          <div key={board.id} onClick={() => onOpenBoard(board.id)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-indigo-400 cursor-pointer group transition-all hover:shadow-lg flex flex-col">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                <LayoutTemplate className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <button onClick={(e) => deleteBoard(board.id, e)} className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-bold text-lg text-[var(--text-primary)] mt-4 mb-1 line-clamp-1">{board.name}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-6">Cập nhật lúc: {new Date(board.updatedAt).toLocaleString()}</p>
            <div className="mt-auto flex items-center text-sm font-bold text-indigo-600 gap-1 group-hover:gap-2 transition-all">
              Mở bảng <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}

        {boards.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <LayoutTemplate className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Chưa có bảng nào</h3>
            <p className="text-[var(--text-secondary)] mb-6">Tạo bảng đầu tiên để bắt đầu học nhé!</p>
            <button onClick={createBoard} className="px-6 py-2 bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">Tạo ngay</button>
          </div>
        )}
      </div>
    </div>
  );
}
