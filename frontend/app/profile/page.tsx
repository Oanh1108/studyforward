"use client";

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/authContext";
import { userStatsApi } from "@/lib/userStatsApi";
import { profileApi } from "@/lib/profileApi";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Tab = "profile" | "password";

interface ProfileData {
  name: string;
  avatar: string;
  coverImage: string;
  hasPassword: boolean;
  email: string;
}

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File ảnh không được vượt quá 5 MB.";
  }
  return null;
}

export default function ProfileSettingsPage() {
  const { user, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile state
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    avatar: "",
    coverImage: "",
    hasPassword: true,
    email: "",
  });
  const [nameValue, setNameValue] = useState("");
  const [nameError, setNameError] = useState("");
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileError, setProfileError] = useState("");

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Cover state
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passErrors, setPassErrors] = useState<{current?: string; new?: string; confirm?: string}>({});
  const [passStatus, setPassStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passError, setPassError] = useState("");

  // Load user stats
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const stats = await userStatsApi.getMyStats();
        setProfileData({
          name: stats.name,
          avatar: stats.avatar,
          coverImage: stats.coverImage || "",
          hasPassword: stats.hasPassword !== false,
          email: stats.email,
        });
        setNameValue(stats.name);
      } catch {
        // fallback to auth context
        if (user) {
          setProfileData(prev => ({ ...prev, name: user.name, email: user.email }));
          setNameValue(user.name || "");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── Avatar Upload ──────────────────────────────────────────────────────────

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      setAvatarError(err);
      return;
    }
    setAvatarError("");

    // Optimistic preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarUploading(true);

    try {
      const { avatarUrl } = await profileApi.uploadAvatar(file);
      setProfileData(prev => ({ ...prev, avatar: avatarUrl }));
      setAvatarPreview(null);
      await refreshSession();
    } catch (err: any) {
      setAvatarError(err.message || "Tải ảnh đại diện thất bại");
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Cover Upload ───────────────────────────────────────────────────────────

  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      setCoverError(err);
      return;
    }
    setCoverError("");

    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    setCoverUploading(true);

    try {
      const { coverUrl } = await profileApi.uploadCover(file);
      setProfileData(prev => ({ ...prev, coverImage: coverUrl }));
      setCoverPreview(null);
    } catch (err: any) {
      setCoverError(err.message || "Tải ảnh nền thất bại");
      setCoverPreview(null);
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // ── Save display name ─────────────────────────────────────────────────────

  const handleSaveName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nameValue.trim()) {
      setNameError("Tên hiển thị không được để trống.");
      return;
    }
    if (nameValue.trim().length > 50) {
      setNameError("Tên hiển thị tối đa 50 ký tự.");
      return;
    }
    setNameError("");
    setProfileStatus("saving");
    setProfileError("");

    try {
      await userStatsApi.updateProfile({ name: nameValue.trim() });
      setProfileData(prev => ({ ...prev, name: nameValue.trim() }));
      await refreshSession();
      setProfileStatus("saved");
      setTimeout(() => setProfileStatus("idle"), 3000);
    } catch (err: any) {
      setProfileError(err.message || "Cập nhật tên thất bại");
      setProfileStatus("error");
    }
  };

  // ── Change Password ────────────────────────────────────────────────────────

  const validatePassword = () => {
    const errors: {current?: string; new?: string; confirm?: string} = {};
    if (!currentPassword) errors.current = "Vui lòng nhập mật khẩu hiện tại.";
    if (!newPassword) errors.new = "Vui lòng nhập mật khẩu mới.";
    else if (newPassword.length < 8) errors.new = "Mật khẩu mới phải có ít nhất 8 ký tự.";
    if (!confirmPassword) errors.confirm = "Vui lòng xác nhận mật khẩu mới.";
    else if (confirmPassword !== newPassword) errors.confirm = "Mật khẩu xác nhận không khớp.";
    setPassErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setPassStatus("saving");
    setPassError("");

    try {
      await profileApi.changePassword(currentPassword, newPassword);
      setPassStatus("saved");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPassStatus("idle"), 3000);
    } catch (err: any) {
      setPassError(err.message || "Đổi mật khẩu thất bại");
      setPassStatus("error");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const displayAvatar = avatarPreview || profileData.avatar;
  const displayCover = coverPreview || profileData.coverImage;
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileData.name || "U")}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-16">
      {/* Cover image section */}
      <div className="relative h-40 sm:h-52 overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600">
        {displayCover && (
          <Image
            src={displayCover}
            alt="Ảnh nền hồ sơ"
            fill
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* Cover upload button */}
        <div className="absolute bottom-3 right-3">
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white text-xs font-semibold backdrop-blur-sm transition-all disabled:opacity-60"
          >
            {coverUploading ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Đang tải...</span></>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg><span>Đổi ảnh nền</span></>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={handleCoverChange}
          />
        </div>
      </div>

      {/* Avatar + name header */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative -mt-14 sm:-mt-16 flex items-end gap-4 pb-4">
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-4 ring-[var(--bg-base)] overflow-hidden bg-[var(--bg-card)]">
              <Image
                src={displayAvatar || defaultAvatar}
                alt={profileData.name || "Avatar"}
                width={112}
                height={112}
                className="w-full h-full object-cover"
                unoptimized
              />
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition-all disabled:opacity-60"
              title="Đổi ảnh đại diện"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" />
              </svg>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="pb-1">
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-tight">{profileData.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">{profileData.email}</p>
          </div>
        </div>

        {/* Upload error banners */}
        {avatarError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
            <span>⚠️</span> {avatarError}
          </div>
        )}
        {coverError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
            <span>⚠️</span> {coverError}
          </div>
        )}

        {/* File size hint */}
        <p className="text-xs text-[var(--text-muted)] mb-5">
          Ảnh đại diện & ảnh nền: JPG, PNG, WebP hoặc GIF · Tối đa 5 MB
        </p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl mb-6">
          {([["profile", "👤 Hồ sơ"], ["password", "🔒 Bảo mật"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t
                ? "bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)] border border-[var(--border)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ──────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Thông tin hiển thị</h2>
              <p className="text-xs text-[var(--text-muted)]">Tên hiển thị xuất hiện trong hồ sơ và bảng xếp hạng của bạn.</p>
            </div>

            {/* Success / error banners */}
            {profileStatus === "saved" && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2 animate-fade-up">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Cập nhật tên thành công!
              </div>
            )}
            {profileStatus === "error" && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 animate-fade-up" role="alert">
                <span>⚠️</span> {profileError}
              </div>
            )}

            <form onSubmit={handleSaveName} noValidate className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Tên hiển thị
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={nameValue}
                  maxLength={50}
                  onChange={(e) => {
                    setNameValue(e.target.value);
                    if (nameError) setNameError("");
                    if (profileStatus === "error") setProfileStatus("idle");
                  }}
                  className={`input w-full ${nameError ? "border-rose-500" : ""}`}
                  placeholder="Tên của bạn"
                  disabled={profileStatus === "saving"}
                />
                {nameError && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"><span>•</span> {nameError}</p>}
                <p className="text-xs text-[var(--text-muted)] mt-1">{nameValue.length}/50 ký tự</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="input w-full opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Email không thể thay đổi.</p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileStatus === "saving" || nameValue.trim() === profileData.name}
                  className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  {profileStatus === "saving" ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Đang lưu...</span></>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>

            {/* Avatar & Cover instructions */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Ảnh đại diện & Ảnh nền</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-indigo-400 hover:bg-[var(--brand-light)] transition-all group disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--border)] group-hover:border-indigo-400 transition-colors">
                    <Image
                      src={displayAvatar || defaultAvatar}
                      alt="Avatar"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {avatarUploading ? "Đang tải..." : "Đổi ảnh đại diện"}
                  </span>
                </button>

                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-indigo-400 hover:bg-[var(--brand-light)] transition-all group disabled:opacity-60 overflow-hidden relative"
                >
                  {displayCover && (
                    <div className="absolute inset-0">
                      <Image src={displayCover} alt="Cover" fill className="object-cover opacity-30" unoptimized />
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 15l5-5 4 4 3-3 5 5" />
                    </svg>
                    <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {coverUploading ? "Đang tải..." : "Đổi ảnh nền"}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Password Tab ─────────────────────────────────────── */}
        {activeTab === "password" && (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Bảo mật tài khoản</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {profileData.hasPassword
                  ? "Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn."
                  : "Tài khoản của bạn chưa có mật khẩu. Vui lòng dùng tính năng quên mật khẩu để đặt mật khẩu qua email."}
              </p>
            </div>

            {!profileData.hasPassword && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2">
                <span className="text-lg">ℹ️</span>
                <div>
                  <strong className="font-bold">Tài khoản đăng nhập qua mạng xã hội</strong>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    Bạn có thể đặt mật khẩu bằng tính năng <a href="/forgot-password" className="underline font-semibold">quên mật khẩu</a>.
                  </p>
                </div>
              </div>
            )}

            {/* Success / error banners */}
            {passStatus === "saved" && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2 animate-fade-up">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Đổi mật khẩu thành công!
              </div>
            )}
            {passStatus === "error" && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 animate-fade-up" role="alert">
                <span>⚠️</span> {passError}
              </div>
            )}

            {profileData.hasPassword && (
              <form onSubmit={handleChangePassword} noValidate className="space-y-4">
                {/* Current password */}
                <div>
                  <label htmlFor="change-current-pass" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      id="change-current-pass"
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => { setCurrentPassword(e.target.value); if (passErrors.current) setPassErrors(p => ({...p, current: undefined})); if (passStatus === "error") setPassStatus("idle"); }}
                      disabled={passStatus === "saving"}
                      className={`input w-full pr-11 ${passErrors.current ? "border-rose-500" : ""}`}
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <EyeToggle show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
                  </div>
                  {passErrors.current && <FieldError msg={passErrors.current} />}
                </div>

                {/* New password */}
                <div>
                  <label htmlFor="change-new-pass" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      id="change-new-pass"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); if (passErrors.new) setPassErrors(p => ({...p, new: undefined})); }}
                      disabled={passStatus === "saving"}
                      className={`input w-full pr-11 ${passErrors.new ? "border-rose-500" : ""}`}
                      placeholder="Tối thiểu 8 ký tự"
                    />
                    <EyeToggle show={showNew} onToggle={() => setShowNew(!showNew)} />
                  </div>
                  {passErrors.new && <FieldError msg={passErrors.new} />}
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="change-confirm-pass" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <input
                      id="change-confirm-pass"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); if (passErrors.confirm) setPassErrors(p => ({...p, confirm: undefined})); }}
                      disabled={passStatus === "saving"}
                      className={`input w-full pr-11 ${passErrors.confirm ? "border-rose-500" : ""}`}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
                  </div>
                  {passErrors.confirm && <FieldError msg={passErrors.confirm} />}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passStatus === "saving"}
                    className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    {passStatus === "saving" ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Đang lưu...</span></>
                    ) : (
                      <span>Đổi mật khẩu</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Small helper components
function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
    >
      {show ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
      <span>•</span> {msg}
    </p>
  );
}
