import { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { studyBoardsApi } from '@/lib/studyBoardsApi';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, LayoutGrid } from 'lucide-react';

export function StudyBoardCanvasView({ boardId, onBack }: { boardId: string, onBack: () => void }) {
  const [boardData, setBoardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [boardName, setBoardName] = useState('');
  const [editor, setEditor] = useState<any>(null);
  const [isGrid, setIsGrid] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    studyBoardsApi.getBoard(boardId).then(res => {
      setBoardData(res.data || {});
      setBoardName(res.name);
      setLoading(false);
    });
  }, [boardId]);

  const saveToBackend = useCallback(
    (editor: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        setSavingStatus('saving');
        try {
          const data = editor.store.getSnapshot();
          await studyBoardsApi.updateBoardData(boardId, data, 0);
          setSavingStatus('saved');
          setTimeout(() => setSavingStatus('idle'), 2000);
        } catch (err) {
          setSavingStatus('error');
        }
      }, 2000);
    },
    [boardId]
  );

  const toggleGrid = () => {
    if (!editor) return;
    const next = !isGrid;
    editor.updateInstanceState({ isGridMode: next });
    setIsGrid(next);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div></div>;

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)] flex flex-col">
      <div className="h-14 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-[var(--bg-subtle)] rounded-xl text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-bold text-[var(--text-primary)]">{boardName}</div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <button 
            onClick={toggleGrid} 
            title="Bật/Tắt nền kẻ ô vuông"
            className={`p-2 rounded-xl transition-all flex items-center gap-2 ${isGrid ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-[var(--border)] mx-1"></div>
          
          {savingStatus === 'saving' && <span className="flex items-center gap-1.5 text-amber-500"><Save className="w-4 h-4 animate-pulse" /> Đang lưu...</span>}
          {savingStatus === 'saved' && <span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 className="w-4 h-4" /> Đã lưu</span>}
          {savingStatus === 'error' && <span className="flex items-center gap-1.5 text-rose-500"><AlertCircle className="w-4 h-4" /> Lỗi lưu!</span>}
        </div>
      </div>
      
      <div className="flex-1 relative">
        <Tldraw
          persistenceKey={`studyboard-${boardId}`}
          onMount={(editor) => {
            setEditor(editor);
            setIsGrid(editor.getInstanceState().isGridMode);
            if (Object.keys(boardData).length > 0) {
              // @ts-ignore
              editor.store.loadSnapshot(boardData);
            }
            editor.store.listen(() => {
              saveToBackend(editor);
            });
          }}
        />
      </div>
    </div>
  );
}
