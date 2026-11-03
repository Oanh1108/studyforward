"use client";

import React, { useEffect, useState } from 'react';
import { ArrowRight, FolderOpen, FolderPlus, Library, MoreVertical, Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { VocabularyFolder } from '@/lib/myVocabApi';
import { Select } from '@/components/ui/Select';
import { EmptyState, Skeleton } from '../hub/primitives';

export type FolderSort = 'recent' | 'az' | 'count';

interface FolderListProps {
  languageName: string;
  languageFlag: string;
  isLoaded: boolean;
  folders: VocabularyFolder[];
  /** `folders` after search and sorting. */
  visibleFolders: VocabularyFolder[];
  totalWords: number;
  unassignedCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  sortBy: FolderSort;
  onSortChange: (value: FolderSort) => void;
  onSelect: (target: number | 'all' | 'unassigned') => void;
  onCreate: () => void;
  onEdit: (folder: VocabularyFolder, mode: 'edit' | 'delete') => void;
  onReanalyze: () => void;
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';
const card = 'rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)]';

function SummaryTile({
  icon: Icon, tone, title, detail, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 ${card} p-4 text-left transition-colors hover:border-indigo-400 ${focusRing}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-[var(--text-primary)]">{title}</span>
        <span className="block truncate text-sm text-[var(--text-secondary)]">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function FolderList({
  languageName, languageFlag, isLoaded, folders, visibleFolders, totalWords, unassignedCount,
  query, onQueryChange, sortBy, onSortChange, onSelect, onCreate, onEdit, onReanalyze,
}: FolderListProps) {
  const [menuFolderId, setMenuFolderId] = useState<number | null>(null);
  const searching = query.trim() !== '';
  const largest = Math.max(1, ...folders.map((f) => f.wordCount));

  useEffect(() => {
    if (menuFolderId === null) return;
    const close = () => setMenuFolderId(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuFolderId]);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Từ vựng của tôi</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            <span aria-hidden="true">{languageFlag}</span> {languageName} · {totalWords} từ trong {folders.length} thư mục
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReanalyze}
            title="Phân tích lại dữ liệu từ vựng đã nhập (có xem trước và xác nhận trước khi lưu)"
            className={`inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ${focusRing}`}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Phân tích lại dữ liệu</span>
            <span className="sm:hidden">Phân tích lại</span>
          </button>
          <button
            type="button"
            onClick={onCreate}
            className={`inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold text-[var(--text-inverse)] transition hover:brightness-95 ${focusRing}`}
          >
            <FolderPlus className="h-4 w-4" /> Tạo thư mục
          </button>
        </div>
      </header>

      {/* Aggregate views */}
      <section aria-label="Xem theo nhóm" className={`grid gap-3 ${unassignedCount > 0 ? 'sm:grid-cols-2' : ''}`}>
        <SummaryTile
          icon={Library}
          tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
          title="Tất cả từ vựng"
          detail={`${totalWords} từ · toàn bộ từ ${languageName}`}
          onClick={() => onSelect('all')}
        />
        {unassignedCount > 0 && (
          <SummaryTile
            icon={FolderOpen}
            tone="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
            title="Chưa phân loại"
            detail={`${unassignedCount} từ chưa xếp vào thư mục`}
            onClick={() => onSelect('unassigned')}
          />
        )}
      </section>

      {/* Folders */}
      <section aria-label="Thư mục" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Thư mục{' '}
            <span className="font-medium text-[var(--text-muted)]">
              ({searching ? `${visibleFolders.length}/${folders.length}` : folders.length})
            </span>
          </h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Tìm theo tên thư mục..."
                aria-label="Tìm theo tên thư mục"
                className={`min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] pl-9 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/15`}
              />
              {searching && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  aria-label="Xóa tìm kiếm"
                  className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ${focusRing}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select
              value={sortBy}
              onChange={(val) => onSortChange(val as FolderSort)}
              options={[
                { value: 'recent', label: 'Cập nhật gần nhất' },
                { value: 'az', label: 'Tên A–Z' },
                { value: 'count', label: 'Số từ (nhiều nhất)' },
              ]}
              ariaLabel="Sắp xếp thư mục"
              variant="filter"
              className="w-full sm:w-56"
            />
          </div>
        </div>

        {!isLoaded ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Đang tải thư mục">
            {[1, 2, 3].map((n) => <Skeleton key={n} className="h-32 w-full rounded-[20px]" />)}
          </div>
        ) : folders.length === 0 ? (
          <EmptyState
            icon={<FolderPlus className="h-5 w-5" />}
            title="Chưa có thư mục từ vựng nào"
            description={`Tạo thư mục đầu tiên để quản lý từ vựng ${languageName}, hoặc nhập nhanh danh sách từ file Excel.`}
            action={
              <button type="button" onClick={onCreate} className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 ${focusRing}`}>
                <FolderPlus className="h-4 w-4" /> Tạo thư mục ngay
              </button>
            }
          />
        ) : visibleFolders.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="Không tìm thấy thư mục nào"
            description={`Không có thư mục nào khớp với "${query}".`}
            action={
              <button type="button" onClick={() => onQueryChange('')} className={`inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 ${focusRing}`}>
                Xóa tìm kiếm
              </button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleFolders.map((folder) => {
              const menuOpen = menuFolderId === folder.id;
              return (
                <li key={folder.id} className={`group relative ${card} transition-colors hover:border-indigo-400`}>
                  {/* The whole card opens the folder; the menu button sits above it. */}
                  <button
                    type="button"
                    onClick={() => onSelect(folder.id)}
                    className={`absolute inset-0 rounded-[20px] ${focusRing}`}
                  >
                    <span className="sr-only">Mở thư mục {folder.name}, {folder.wordCount} từ</span>
                  </button>

                  <div className="pointer-events-none flex h-full gap-4 p-4 pl-5">
                    <span
                      aria-hidden="true"
                      className="w-1.5 shrink-0 self-stretch rounded-full"
                      style={{ backgroundColor: folder.color || '#6366f1' }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <h3 className="line-clamp-2 break-words pr-8 text-base font-bold leading-snug text-[var(--text-primary)]">
                        {folder.name}
                      </h3>
                      {folder.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-[var(--text-secondary)]">{folder.description}</p>
                      )}
                      <div className="mt-auto pt-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-extrabold leading-none text-[var(--text-primary)]">{folder.wordCount}</span>
                          <span className="text-sm text-[var(--text-muted)]">từ</span>
                        </div>
                        <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(4, (folder.wordCount / largest) * 100)}%`, backgroundColor: folder.color || '#6366f1' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-2 top-2 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFolderId(menuOpen ? null : folder.id);
                      }}
                      aria-label={`Tùy chọn thư mục ${folder.name}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ${focusRing}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <div
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-10 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-lg animate-scale-in"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { setMenuFolderId(null); onEdit(folder, 'edit'); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                        >
                          <Pencil className="h-4 w-4" /> Đổi tên
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { setMenuFolderId(null); onEdit(folder, 'delete'); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" /> Xóa thư mục
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
