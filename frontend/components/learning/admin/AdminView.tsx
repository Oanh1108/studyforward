"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  adminApi,
  AdminStats,
  AdminUserItem,
  CurriculumVocabItem,
  AdminLogItem,
} from '@/lib/adminApi';
import { useAuth } from '@/lib/authContext';
import { LANGUAGE_LIST, SupportedLanguage, getLanguageInfo } from '@/lib/languages';
import { Select } from '@/components/ui/Select';

export function AdminView() {
  const { user } = useAuth();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'curriculum' | 'logs'>('overview');

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // User management state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [usersLoading, setUsersLoading] = useState(false);

  // Curriculum Vocab state
  const [curriculumWords, setCurriculumWords] = useState<CurriculumVocabItem[]>([]);
  const [vocabTotal, setVocabTotal] = useState(0);
  const [vocabPage, setVocabPage] = useState(1);
  const [vocabTotalPages, setVocabTotalPages] = useState(1);
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabTopicFilter, setVocabTopicFilter] = useState('all');
  const [vocabLanguageFilter, setVocabLanguageFilter] = useState<string>('all');
  const [vocabLoading, setVocabLoading] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  // Modal Dialogs
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    actionType: 'danger' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionLabel: '',
    actionType: 'primary',
    onConfirm: async () => {},
  });

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Vocab Modal (Add/Edit)
  const [vocabModal, setVocabModal] = useState<{
    isOpen: boolean;
    wordToEdit: CurriculumVocabItem | null;
  }>({
    isOpen: false,
    wordToEdit: null,
  });

  const [vocabForm, setVocabForm] = useState<{
    topic: string;
    word: string;
    meaning: string;
    language: SupportedLanguage;
    ipa: string;
    pinyin: string;
    kana: string;
    romaji: string;
    romaja: string;
    thaiReading: string;
    partOfSpeech: string;
    exampleEn: string;
    exampleVi: string;
  }>({
    topic: 'Business & Finance',
    word: '',
    meaning: '',
    language: 'en',
    ipa: '',
    pinyin: '',
    kana: '',
    romaji: '',
    romaja: '',
    thaiReading: '',
    partOfSpeech: 'noun',
    exampleEn: '',
    exampleVi: '',
  });

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Overview Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải thống kê', 'error');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await adminApi.getUsers({
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
        page: usersPage,
        limit: 10,
      });
      setUsers(data.users);
      setUsersTotal(data.total);
      setUsersTotalPages(data.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách tài khoản', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter, usersPage]);

  // Fetch Curriculum Vocab
  const fetchCurriculum = useCallback(async () => {
    setVocabLoading(true);
    try {
      const data = await adminApi.getCurriculumVocab({
        search: vocabSearch,
        topic: vocabTopicFilter,
        language: vocabLanguageFilter,
        page: vocabPage,
        limit: 12,
      });
      setCurriculumWords(data.words);
      setVocabTotal(data.total);
      setVocabTotalPages(data.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải từ vựng dùng chung', 'error');
    } finally {
      setVocabLoading(false);
    }
  }, [vocabSearch, vocabTopicFilter, vocabLanguageFilter, vocabPage]);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await adminApi.getAuditLogs({
        page: logsPage,
        limit: 15,
      });
      setLogs(data.logs);
      setLogsTotal(data.total);
      setLogsTotalPages(data.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải nhật ký thao tác', 'error');
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage]);

  // Initial & Tab Switch Loader
  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'curriculum') fetchCurriculum();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchStats, fetchUsers, fetchCurriculum, fetchLogs]);

  // Handle User Lock / Unlock
  const handleToggleLock = (targetUser: AdminUserItem) => {
    const isLocking = !targetUser.isLocked;
    setConfirmModal({
      isOpen: true,
      title: isLocking ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản',
      message: isLocking
        ? `Bạn có chắc chắn muốn khóa tài khoản "${targetUser.name}" (${targetUser.email})? Người dùng này sẽ bị chấm dứt phiên đăng nhập ngay lập tức.`
        : `Bạn có muốn mở khóa cho tài khoản "${targetUser.name}" (${targetUser.email}) để họ có thể đăng nhập bình thường?`,
      actionLabel: isLocking ? 'Khóa tài khoản' : 'Mở khóa',
      actionType: isLocking ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          setIsSubmittingAction(true);
          await adminApi.setUserLock(targetUser.id, isLocking);
          showToast(isLocking ? `Đã khóa tài khoản ${targetUser.email}` : `Đã mở khóa tài khoản ${targetUser.email}`);
          fetchUsers();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          showToast(err.message || 'Thao tác thất bại', 'error');
        } finally {
          setIsSubmittingAction(false);
        }
      },
    });
  };

  // Handle Change Role
  const handleChangeRole = (targetUser: AdminUserItem) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    setConfirmModal({
      isOpen: true,
      title: `Xác nhận đổi vai trò tài khoản`,
      message: `Bạn có chắc muốn chuyển vai trò của "${targetUser.name}" (${targetUser.email}) từ ${targetUser.role.toUpperCase()} sang ${newRole.toUpperCase()}? Quyền hạn mới sẽ có hiệu lực ngay lập tức.`,
      actionLabel: `Chuyển thành ${newRole.toUpperCase()}`,
      actionType: newRole === 'user' ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          setIsSubmittingAction(true);
          await adminApi.setUserRole(targetUser.id, newRole);
          showToast(`Đã đổi vai trò của ${targetUser.email} thành ${newRole.toUpperCase()}`);
          fetchUsers();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          showToast(err.message || 'Thao tác thất bại', 'error');
        } finally {
          setIsSubmittingAction(false);
        }
      },
    });
  };

  // Handle Save Curriculum Word
  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabForm.word.trim() || !vocabForm.meaning.trim()) {
      showToast('Vui lòng nhập từ / cụm từ và nghĩa tiếng Việt', 'error');
      return;
    }

    try {
      setIsSubmittingAction(true);
      if (vocabModal.wordToEdit) {
        await adminApi.updateCurriculumWord(vocabModal.wordToEdit.id, {
          topic: vocabForm.topic,
          word: vocabForm.word.trim(),
          meaning: vocabForm.meaning.trim(),
          language: vocabForm.language,
          ipa: vocabForm.ipa.trim(),
          pinyin: vocabForm.pinyin.trim(),
          kana: vocabForm.kana.trim(),
          romaji: vocabForm.romaji.trim(),
          romaja: vocabForm.romaja.trim(),
          thaiReading: vocabForm.thaiReading.trim(),
          partOfSpeech: vocabForm.partOfSpeech,
          exampleEn: vocabForm.exampleEn.trim(),
          exampleVi: vocabForm.exampleVi.trim(),
          example: vocabForm.exampleEn.trim(),
          exampleTranslation: vocabForm.exampleVi.trim(),
        });
        showToast(`Đã cập nhật từ "${vocabForm.word}"`);
      } else {
        await adminApi.createCurriculumWord({
          topic: vocabForm.topic,
          word: vocabForm.word.trim(),
          meaning: vocabForm.meaning.trim(),
          language: vocabForm.language,
          ipa: vocabForm.ipa.trim(),
          pinyin: vocabForm.pinyin.trim(),
          kana: vocabForm.kana.trim(),
          romaji: vocabForm.romaji.trim(),
          romaja: vocabForm.romaja.trim(),
          thaiReading: vocabForm.thaiReading.trim(),
          partOfSpeech: vocabForm.partOfSpeech,
          exampleEn: vocabForm.exampleEn.trim(),
          exampleVi: vocabForm.exampleVi.trim(),
          example: vocabForm.exampleEn.trim(),
          exampleTranslation: vocabForm.exampleVi.trim(),
        });
        showToast(`Đã thêm từ vựng khóa học "${vocabForm.word}"`);
      }
      setVocabModal({ isOpen: false, wordToEdit: null });
      fetchCurriculum();
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu từ vựng', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Delete Curriculum Word
  const handleDeleteVocab = (item: CurriculumVocabItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa từ vựng khóa học',
      message: `Bạn có chắc muốn xóa từ "${item.word}" khỏi bộ từ vựng dùng chung?`,
      actionLabel: 'Xóa từ vựng',
      actionType: 'danger',
      onConfirm: async () => {
        try {
          setIsSubmittingAction(true);
          await adminApi.deleteCurriculumWord(item.id);
          showToast(`Đã xóa từ "${item.word}"`);
          fetchCurriculum();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          showToast(err.message || 'Không thể xóa từ vựng', 'error');
        } finally {
          setIsSubmittingAction(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-fade-up">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-xs md:text-sm font-bold flex items-center gap-2 animate-bounce-short ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-rose-600 text-white shadow-rose-500/20'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <span>🛡️ Trung tâm Quản trị (Admin Portal)</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Admin: {user?.email}
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-0.5">
            Quản lý tài khoản người dùng, giám sát an toàn hệ thống và bộ từ vựng khóa học dùng chung.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => {
            if (activeTab === 'overview') fetchStats();
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'curriculum') fetchCurriculum();
            if (activeTab === 'logs') fetchLogs();
          }}
          className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-secondary)] self-start sm:self-auto flex items-center gap-1.5 transition-all shadow-sm"
        >
          <span>🔄</span>
          <span>Làm mới</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Tổng quan', icon: '📊' },
          { id: 'users', label: 'Tài khoản', icon: '👥' },
          { id: 'curriculum', label: 'Nội dung dùng chung', icon: '📚' },
          { id: 'logs', label: 'Nhật ký thao tác', icon: '📝' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================
          SUB-TAB 1: TỔNG QUAN (OVERVIEW & STATS)
         ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-2">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-[var(--text-muted)]">Đang tải số liệu thống kê...</p>
            </div>
          ) : stats ? (
            <>
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-center">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Tổng tài khoản</div>
                  <div className="text-2xl md:text-3xl font-black text-blue-600 mt-1">{stats.totalUsers}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Người học đăng ký</div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-center">
                  <div className="text-[11px] font-bold text-indigo-500 uppercase">Quản trị viên</div>
                  <div className="text-2xl md:text-3xl font-black text-indigo-600 mt-1">{stats.totalAdmins}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Quyền Admin</div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-center">
                  <div className="text-[11px] font-bold text-rose-500 uppercase">Tài khoản bị khóa</div>
                  <div className="text-2xl md:text-3xl font-black text-rose-600 mt-1">{stats.totalLockedUsers}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Đã thu hồi phiên</div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-center">
                  <div className="text-[11px] font-bold text-amber-500 uppercase">Thư mục từ vựng</div>
                  <div className="text-2xl md:text-3xl font-black text-amber-600 mt-1">{stats.totalFolders}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Bộ sưu tập cá nhân</div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-center">
                  <div className="text-[11px] font-bold text-emerald-500 uppercase">Từ vựng cá nhân</div>
                  <div className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">{stats.totalCustomWords}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Người dùng tự tạo/Excel</div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-center">
                  <div className="text-[11px] font-bold text-cyan-500 uppercase">Từ vựng khóa học</div>
                  <div className="text-2xl md:text-3xl font-black text-cyan-600 mt-1">{stats.totalCurriculumWords}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Nội dung dùng chung</div>
                </div>
              </div>

              {/* Privacy Notice Alert */}
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-[var(--text-secondary)] flex items-start gap-3">
                <span className="text-xl">🔒</span>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-[var(--text-primary)]">
                    Chính sách bảo mật dữ liệu riêng tư
                  </h4>
                  <p>
                    Hệ thống chỉ cung cấp số liệu tổng hợp về số lượng thư mục và từ vựng của người dùng. Admin không thể xem hoặc can thiệp vào các thư mục từ vựng cá nhân riêng tư của người dùng khác. Mật khẩu, token và thông tin nhạy cảm được bảo mật tuyệt đối.
                  </p>
                </div>
              </div>

              {/* Recent Audit Logs in Overview */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <span>🕒</span>
                    <span>10 thao tác quản trị gần đây</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Xem tất cả →
                  </button>
                </div>

                {stats.recentLogs.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                    Chưa có nhật ký thao tác nào.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="text-[var(--text-muted)] font-bold border-b border-[var(--border)]">
                        <tr>
                          <th className="py-2 px-3">Thời gian</th>
                          <th className="py-2 px-3">Admin</th>
                          <th className="py-2 px-3">Hành động</th>
                          <th className="py-2 px-3">Đối tượng</th>
                          <th className="py-2 px-3">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {stats.recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                            <td className="py-2.5 px-3 text-[var(--text-muted)] whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                              {log.adminEmail}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                              {log.targetType} #{log.targetId}
                            </td>
                            <td className="py-2.5 px-3 text-[var(--text-muted)] max-w-xs truncate">
                              {log.details || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: QUẢN LÝ TÀI KHOẢN (USER MANAGEMENT)
         ======================================================== */}
      {activeTab === 'users' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)]">🔍</span>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUsersPage(1);
                }}
                placeholder="Tìm kiếm theo họ tên hoặc email..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Role Filter */}
            <div>
              <Select
                value={userRoleFilter}
                onChange={(val) => {
                  setUserRoleFilter(val);
                  setUsersPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả vai trò' },
                  { value: 'admin', label: 'Quản trị viên (ADMIN)' },
                  { value: 'user', label: 'Người dùng (USER)' },
                ]}
                className="w-full text-xs md:text-sm font-medium"
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={userStatusFilter}
                onChange={(val) => {
                  setUserStatusFilter(val);
                  setUsersPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Hoạt động bình thường' },
                  { value: 'locked', label: 'Bị khóa (Locked)' },
                ]}
                className="w-full text-xs md:text-sm font-medium"
              />
            </div>
          </div>

          {/* User Table */}
          {usersLoading ? (
            <div className="p-8 text-center space-y-2">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-[var(--text-muted)]">Đang tải danh sách tài khoản...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Không tìm thấy tài khoản nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3 w-12 text-center">ID</th>
                    <th className="p-3 min-w-[160px]">Họ và Tên</th>
                    <th className="p-3 min-w-[180px]">Email</th>
                    <th className="p-3 min-w-[100px]">Vai trò</th>
                    <th className="p-3 min-w-[110px]">Trạng thái</th>
                    <th className="p-3 min-w-[120px]">Ngày tạo</th>
                    <th className="p-3 min-w-[150px] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                      <td className="p-3 text-center text-[var(--text-muted)] font-mono">
                        {u.id}
                      </td>
                      <td className="p-3 font-bold text-[var(--text-primary)]">
                        {u.name}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)] font-medium">
                        {u.email}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                            u.isLocked
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isLocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span>{u.isLocked ? 'Bị khóa' : 'Hoạt động'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Lock Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleLock(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              u.isLocked
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600'
                            }`}
                            title={u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          >
                            {u.isLocked ? '🔓 Mở khóa' : '🔒 Khóa'}
                          </button>

                          {/* Change Role Button */}
                          <button
                            type="button"
                            onClick={() => handleChangeRole(u)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--bg-subtle)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                            title="Đổi vai trò USER ↔ ADMIN"
                          >
                            {u.role === 'admin' ? 'Hạ quyền USER' : 'Nâng ADMIN'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <div>
              Tổng số: <strong>{usersTotal}</strong> tài khoản
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={usersPage <= 1}
                onClick={() => setUsersPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 font-semibold"
              >
                ← Trước
              </button>
              <span className="font-bold">
                Trang {usersPage} / {usersTotalPages || 1}
              </span>
              <button
                disabled={usersPage >= usersTotalPages}
                onClick={() => setUsersPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 font-semibold"
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: NỘI DUNG DÙNG CHUNG (CURRICULUM VOCABULARY)
         ======================================================== */}
      {activeTab === 'curriculum' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
          {/* Top Filter and Add button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)]">🔍</span>
                <input
                  type="text"
                  value={vocabSearch}
                  onChange={(e) => {
                    setVocabSearch(e.target.value);
                    setVocabPage(1);
                  }}
                  placeholder="Tìm từ vựng khóa học..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Language Filter */}
              <div className="w-full sm:w-44 shrink-0">
                <Select
                  value={vocabLanguageFilter}
                  onChange={(val) => {
                    setVocabLanguageFilter(val);
                    setVocabPage(1);
                  }}
                  options={[
                    { value: 'all', label: '🌐 Tất cả ngôn ngữ' },
                    ...LANGUAGE_LIST.map((l) => ({
                      value: l.code,
                      label: `${l.flag} ${l.name}`,
                    })),
                  ]}
                  className="w-full text-xs md:text-sm font-medium"
                />
              </div>

              {/* Topic */}
              <div className="w-full sm:w-44 shrink-0">
                <Select
                  value={vocabTopicFilter}
                  onChange={(val) => {
                    setVocabTopicFilter(val);
                    setVocabPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'Tất cả chủ đề' },
                    { value: 'Business & Finance', label: 'Business & Finance' },
                    { value: 'Human Resources', label: 'Human Resources' },
                    { value: 'Marketing', label: 'Marketing' },
                    { value: 'Office & Technology', label: 'Office & Technology' },
                    { value: 'Travel & Transportation', label: 'Travel & Transportation' },
                    { value: 'Daily Life', label: 'Giao tiếp hàng ngày' },
                  ]}
                  className="w-full text-xs md:text-sm font-medium"
                />
              </div>
            </div>

            <button
              onClick={() => {
                const targetLang = (vocabLanguageFilter !== 'all' ? vocabLanguageFilter : 'en') as SupportedLanguage;
                setVocabForm({
                  topic: 'Business & Finance',
                  word: '',
                  meaning: '',
                  language: targetLang,
                  ipa: '',
                  pinyin: '',
                  kana: '',
                  romaji: '',
                  romaja: '',
                  thaiReading: '',
                  partOfSpeech: 'noun',
                  exampleEn: '',
                  exampleVi: '',
                });
                setVocabModal({ isOpen: true, wordToEdit: null });
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <span>+</span>
              <span>Thêm từ vựng khóa học</span>
            </button>
          </div>

          {/* Curriculum Table */}
          {vocabLoading ? (
            <div className="p-8 text-center space-y-2">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-[var(--text-muted)]">Đang tải danh sách từ vựng dùng chung...</p>
            </div>
          ) : curriculumWords.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Không tìm thấy từ vựng nào trong danh mục này.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Nội dung chưa tạo hiển thị trạng thái trống rõ ràng, không tạo dữ liệu giả.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3 w-12 text-center">ID</th>
                    <th className="p-3 min-w-[100px]">Ngôn ngữ</th>
                    <th className="p-3 min-w-[120px]">Chủ đề</th>
                    <th className="p-3 min-w-[140px]">Từ / Cụm từ</th>
                    <th className="p-3 min-w-[110px]">Cách đọc / Phiên âm</th>
                    <th className="p-3 min-w-[80px]">Từ loại</th>
                    <th className="p-3 min-w-[160px]">Nghĩa tiếng Việt</th>
                    <th className="p-3 min-w-[200px]">Ví dụ & Dịch</th>
                    <th className="p-3 min-w-[90px] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {curriculumWords.map((item) => {
                    const itemLang = (item.language || 'en') as SupportedLanguage;
                    const langCfg = getLanguageInfo(itemLang);
                    const primaryReading =
                      item.ipa ||
                      item.pinyin ||
                      item.kana ||
                      item.romaji ||
                      item.romaja ||
                      item.thaiReading ||
                      item.phonetic ||
                      '';

                    return (
                      <tr key={item.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="p-3 text-center text-[var(--text-muted)] font-mono">
                          {item.id}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                            <span>{langCfg.flag}</span>
                            <span>{langCfg.name}</span>
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-secondary)]">
                            {item.topic}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-[var(--text-primary)] text-sm">
                          {item.word}
                        </td>
                        <td className="p-3 font-mono text-[var(--text-muted)]">
                          {primaryReading ? `[${primaryReading}]` : '-'}
                        </td>
                        <td className="p-3">
                          <span className="italic text-[var(--text-secondary)]">
                            {item.partOfSpeech || '—'}
                          </span>
                        </td>
                        <td className="p-3 text-[var(--text-primary)] font-medium">
                          {item.meaning}
                        </td>
                        <td className="p-3 max-w-xs space-y-0.5">
                          <p className="text-[var(--text-secondary)] italic truncate" title={item.example || item.exampleEn}>
                            {item.example || item.exampleEn || '-'}
                          </p>
                          {(item.exampleTranslation || item.exampleVi) && (
                            <p className="text-[var(--text-muted)] text-[11px] truncate" title={item.exampleTranslation || item.exampleVi}>
                              ↳ {item.exampleTranslation || item.exampleVi}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setVocabForm({
                                  topic: item.topic,
                                  word: item.word,
                                  meaning: item.meaning,
                                  language: (item.language || 'en') as SupportedLanguage,
                                  ipa: item.ipa || item.phonetic || '',
                                  pinyin: item.pinyin || '',
                                  kana: item.kana || '',
                                  romaji: item.romaji || '',
                                  romaja: item.romaja || '',
                                  thaiReading: item.thaiReading || '',
                                  partOfSpeech: item.partOfSpeech || 'noun',
                                  exampleEn: item.example || item.exampleEn || '',
                                  exampleVi: item.exampleTranslation || item.exampleVi || '',
                                });
                                setVocabModal({ isOpen: true, wordToEdit: item });
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-blue-600 hover:bg-[var(--bg-subtle)]"
                              title="Sửa từ"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVocab(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10"
                              title="Xóa từ"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Vocab Pagination */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <div>
              Tổng số: <strong>{vocabTotal}</strong> từ khóa học
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={vocabPage <= 1}
                onClick={() => setVocabPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 font-semibold"
              >
                ← Trước
              </button>
              <span className="font-bold">
                Trang {vocabPage} / {vocabTotalPages || 1}
              </span>
              <button
                disabled={vocabPage >= vocabTotalPages}
                onClick={() => setVocabPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 font-semibold"
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 4: NHẬT KÝ THAO TÁC (AUDIT LOGS)
         ======================================================== */}
      {activeTab === 'logs' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Nhật ký kiểm toán hệ thống ({logsTotal} bản ghi)
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              Ghi lại mọi thao tác của quản trị viên theo thời gian thực
            </span>
          </div>

          {logsLoading ? (
            <div className="p-8 text-center space-y-2">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-[var(--text-muted)]">Đang tải nhật ký...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Chưa có nhật ký nào được ghi lại.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3 w-12 text-center">ID</th>
                    <th className="p-3 min-w-[150px]">Thời gian</th>
                    <th className="p-3 min-w-[180px]">Quản trị viên</th>
                    <th className="p-3 min-w-[140px]">Hành động</th>
                    <th className="p-3 min-w-[110px]">Đối tượng</th>
                    <th className="p-3 min-w-[200px]">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                      <td className="p-3 text-center text-[var(--text-muted)] font-mono">
                        {log.id}
                      </td>
                      <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3 font-semibold text-[var(--text-primary)]">
                        {log.adminEmail}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-secondary)] font-mono">
                        {log.targetType} #{log.targetId}
                      </td>
                      <td className="p-3 text-[var(--text-muted)] max-w-sm truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Logs Pagination */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <div>
              Tổng số: <strong>{logsTotal}</strong> bản ghi
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={logsPage <= 1}
                onClick={() => setLogsPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 font-semibold"
              >
                ← Trước
              </button>
              <span className="font-bold">
                Trang {logsPage} / {logsTotalPages || 1}
              </span>
              <button
                disabled={logsPage >= logsTotalPages}
                onClick={() => setLogsPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 font-semibold"
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRMATION MODAL
         ======================================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-sm md:text-base text-[var(--text-primary)]">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                disabled={isSubmittingAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
                  confirmModal.actionType === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {isSubmittingAction ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  confirmModal.actionLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD/EDIT CURRICULUM VOCAB MODAL
         ======================================================== */}
      {vocabModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
              <h3 className="font-bold text-sm md:text-base text-[var(--text-primary)]">
                {vocabModal.wordToEdit ? 'Chỉnh sửa từ vựng khóa học' : 'Thêm từ vựng khóa học'}
              </h3>
              <button
                onClick={() => setVocabModal({ isOpen: false, wordToEdit: null })}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVocab} className="p-4 md:p-5 space-y-3.5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Ngôn ngữ học <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={vocabForm.language}
                    onChange={(val) => setVocabForm({ ...vocabForm, language: val as SupportedLanguage })}
                    options={LANGUAGE_LIST.map((l) => ({
                      value: l.code,
                      label: `${l.flag} ${l.name} (${l.code})`,
                    }))}
                    className="w-full text-xs md:text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Chủ đề (Topic) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vocabForm.topic}
                    onChange={(e) => setVocabForm({ ...vocabForm, topic: e.target.value })}
                    placeholder="Ví dụ: Business & Finance, Marketing..."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Từ / Cụm từ ({getLanguageInfo(vocabForm.language).name}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vocabForm.word}
                    onChange={(e) => setVocabForm({ ...vocabForm, word: e.target.value })}
                    placeholder={
                      vocabForm.language === 'en'
                        ? 'negotiate'
                        : vocabForm.language === 'zh'
                        ? '谈判'
                        : vocabForm.language === 'ja'
                        ? '交渉'
                        : vocabForm.language === 'ko'
                        ? '협상'
                        : 'เจรจา'
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    {vocabForm.language === 'en'
                      ? 'Phiên âm IPA'
                      : vocabForm.language === 'zh'
                      ? 'Bính âm Pinyin'
                      : vocabForm.language === 'ja'
                      ? 'Cách đọc Kana'
                      : vocabForm.language === 'ko'
                      ? 'Phiên âm Romaja'
                      : 'Cách đọc tiếng Thái'}
                  </label>
                  <input
                    type="text"
                    value={
                      vocabForm.language === 'en'
                        ? vocabForm.ipa
                        : vocabForm.language === 'zh'
                        ? vocabForm.pinyin
                        : vocabForm.language === 'ja'
                        ? vocabForm.kana
                        : vocabForm.language === 'ko'
                        ? vocabForm.romaja
                        : vocabForm.thaiReading
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (vocabForm.language === 'en') setVocabForm({ ...vocabForm, ipa: val });
                      else if (vocabForm.language === 'zh') setVocabForm({ ...vocabForm, pinyin: val });
                      else if (vocabForm.language === 'ja') setVocabForm({ ...vocabForm, kana: val });
                      else if (vocabForm.language === 'ko') setVocabForm({ ...vocabForm, romaja: val });
                      else setVocabForm({ ...vocabForm, thaiReading: val });
                    }}
                    placeholder={
                      vocabForm.language === 'en'
                        ? '/nɪˈɡoʊʃieɪt/'
                        : vocabForm.language === 'zh'
                        ? 'tánpàn'
                        : vocabForm.language === 'ja'
                        ? 'こうしょう'
                        : vocabForm.language === 'ko'
                        ? 'hyeopsang'
                        : 'chēn-ra-chā'
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm font-mono"
                  />
                </div>
              </div>

              {vocabForm.language === 'ja' && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Romaji (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={vocabForm.romaji}
                    onChange={(e) => setVocabForm({ ...vocabForm, romaji: e.target.value })}
                    placeholder="koushou"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Nghĩa tiếng Việt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vocabForm.meaning}
                    onChange={(e) => setVocabForm({ ...vocabForm, meaning: e.target.value })}
                    placeholder="đàm phán, thương lượng"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Từ loại
                  </label>
                  <input
                    type="text"
                    value={vocabForm.partOfSpeech}
                    onChange={(e) => setVocabForm({ ...vocabForm, partOfSpeech: e.target.value })}
                    placeholder="Danh từ, Động từ..."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Câu ví dụ ({getLanguageInfo(vocabForm.language).name})
                </label>
                <input
                  type="text"
                  value={vocabForm.exampleEn}
                  onChange={(e) => setVocabForm({ ...vocabForm, exampleEn: e.target.value })}
                  placeholder="Ví dụ minh họa ngữ cảnh..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Bản dịch ví dụ tiếng Việt
                </label>
                <input
                  type="text"
                  value={vocabForm.exampleVi}
                  onChange={(e) => setVocabForm({ ...vocabForm, exampleVi: e.target.value })}
                  placeholder="Dịch nghĩa của câu ví dụ..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setVocabModal({ isOpen: false, wordToEdit: null })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  {isSubmittingAction ? 'Đang lưu...' : vocabModal.wordToEdit ? 'Cập nhật' : 'Thêm từ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
