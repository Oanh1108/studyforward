'use client';
import { useToastStore } from '@/lib/toastStore';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[80px] right-4 left-4 md:left-auto md:bottom-5 md:right-5 z-[10000] flex flex-col gap-2 pointer-events-none md:max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto bg-[var(--bg-card)] border border-[var(--border)] shadow-xl rounded-xl p-3 flex items-start gap-3 animate-slide-up transition-all">
          <div className="shrink-0 mt-0.5 text-lg">
            {t.type === 'success' && <span className="text-emerald-500">✓</span>}
            {t.type === 'error' && <span className="text-rose-500">✕</span>}
            {t.type === 'warning' && <span className="text-amber-500">⚠</span>}
            {t.type === 'info' && <span className="text-blue-500">ℹ</span>}
          </div>
          <div className="flex-1 text-sm font-medium text-[var(--text-primary)]">
            {t.message}
          </div>
          <button 
            onClick={() => removeToast(t.id)} 
            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
