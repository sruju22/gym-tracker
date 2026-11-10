import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  User as UserIcon,
  LogOut,
  ShieldCheck,
  LogIn,
  Settings,
  CheckCircle2,
  ChevronRight,
  Camera,
  Loader2,
  Sliders,
  Flame,
} from 'lucide-react';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { GoogleSignInButton } from './GoogleSignInButton';
import { uploadImageApi } from '../../api/uploadApi';
import { ProgressPhotosModal } from '../progress/ProgressPhotosModal';
import { PhotoPrivacyTrustModal } from '../progress/PhotoPrivacyTrustModal';

interface UserModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const isAccountModalOpen = useAuthStore((state) => state.isAccountModalOpen);
  const closeAccountModal = useAuthStore((state) => state.closeAccountModal);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const handleOpenPhotos = () => {
    const hasAcknowledged = localStorage.getItem('gymtrackie_photo_privacy_acknowledged');
    if (!hasAcknowledged) {
      setIsPrivacyModalOpen(true);
    } else {
      setIsPhotosModalOpen(true);
    }
  };

  const handleConfirmPrivacy = () => {
    localStorage.setItem('gymtrackie_photo_privacy_acknowledged', 'true');
    setIsPrivacyModalOpen(false);
    setIsPhotosModalOpen(true);
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      setAvatarError(null);
      const uploaded = await uploadImageApi(file, 'avatars');
      await updateProfile({ avatarUrl: uploaded.url });
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setAvatarError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isQueryOpen = searchParams.get('account') === 'open';
  const isOpen = propIsOpen !== undefined ? propIsOpen : (isAccountModalOpen || isQueryOpen);

  React.useEffect(() => {
    if (isOpen) {
      const img = new Image();
      img.src = '/images/gymtrackie-signin-bg.jpg';
    }
  }, [isOpen]);
  const onClose = propOnClose !== undefined ? propOnClose : () => {
    closeAccountModal();
    if (isQueryOpen) {
      searchParams.delete('account');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNavigateToAuth = (mode?: 'signup' | 'signin') => {
    closeAccountModal();
    const target = mode === 'signup' ? '/login?mode=signup' : '/login';
    navigate(target);
  };

  const goToSettings = (tab?: 'split' | 'cardio' | 'app') => {
    closeAccountModal();
    navigate(typeof tab === 'string' ? `/settings?tab=${tab}` : '/settings');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
      title={currentUser ? 'My Account' : 'User Account'}
    >
      <div className="flex justify-center pb-2">
        <GymTrackieLogo variant="compact" height={26} />
      </div>

      <div className="space-y-3.5 sm:space-y-4">
        {currentUser ? (
          /* ================= AUTHENTICATED ACCOUNT PANEL ================= */
          <div className="space-y-3.5 sm:space-y-4">
            <div className="space-y-3 sm:space-y-3.5">
              {/* User Identity Card */}
              <div className="flex items-center gap-3.5 bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border-subtle)]">
                {/* Hidden file input for Cloudinary upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                  className="hidden"
                  onChange={handleAvatarFileSelect}
                />

                {/* Avatar with Cloudinary upload button overlay */}
                <div
                  className="relative group cursor-pointer shrink-0"
                  onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                  title="Click camera icon or avatar to change profile photo"
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[var(--primary)]/50 shrink-0 shadow-sm transition-all group-hover:brightness-90 group-hover:scale-102"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-black shadow-sm shrink-0 border border-red-400 transition-all group-hover:scale-102">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Upload Spinner Overlay */}
                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-xs">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  )}

                  {/* Sole Camera Badge on Profile */}
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--primary)] border-2 border-[var(--bg-card)] text-white flex items-center justify-center shadow-md group-hover:scale-110 active:scale-95 transition-transform"
                    title="Change profile photo"
                  >
                    <Camera className="w-3 h-3" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-black text-[var(--text-main)] truncate">
                      {currentUser.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Signed In
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                    {currentUser.email}
                  </p>

                  {isUploadingAvatar ? (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-[var(--primary)] animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Uploading new photo...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--text-muted)]">
                      <ShieldCheck className="w-3 h-3 text-[var(--success)]" />
                      <span>MongoDB Atlas Cloud Sync Active</span>
                    </div>
                  )}

                  {avatarError && (
                    <div className="text-[10px] text-rose-400 font-semibold mt-1">
                      {avatarError}
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Accounts Status */}
              {currentUser.googleLinked ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Google Account Connected</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/15 px-1.5 py-0.5 rounded">
                    1-Tap Ready
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)]">Link Google Account</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      Connect Google for 1-tap sign-in next time
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <GoogleSignInButton
                      mode="link"
                      text="continue_with"
                      onSuccess={() => {}}
                    />
                  </div>
                </div>
              )}

              {/* Categorized Preferences & Progress Photos Shortcuts */}
              <div className="space-y-2.5 sm:space-y-3 pt-1.5">
                {/* Physique & Progress Photos Direct Access */}
                <button
                  type="button"
                  onClick={handleOpenPhotos}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-[var(--bg-card)] to-[var(--bg-card)] hover:from-rose-500/15 border border-rose-500/25 hover:border-rose-500/40 transition-all cursor-pointer group text-left min-h-[60px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0 text-rose-400 group-hover:scale-105 transition-transform">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                          Physique Progress Photos
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full border border-rose-500/20">
                          Photos
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] block truncate mt-0.5">
                        Upload & view Front, Side & Back check-ins
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Workout Split & Schedule */}
                <button
                  type="button"
                  onClick={() => goToSettings('split')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer group text-left min-h-[60px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] block truncate">
                        Workout Split & Schedule
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] block truncate mt-0.5">
                        Customize training days, splits & exercises
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Cardio & Conditioning Goals */}
                <button
                  type="button"
                  onClick={() => goToSettings('cardio')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer group text-left min-h-[60px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0 text-orange-400 group-hover:scale-105 transition-transform">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] block truncate">
                        Cardio & Conditioning Goals
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] block truncate mt-0.5">
                        Weekly cardio targets & activity tracking
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Theme, Units & Preferences */}
                <button
                  type="button"
                  onClick={() => goToSettings('app')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer group text-left min-h-[60px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0 text-purple-400 group-hover:scale-105 transition-transform">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] block truncate">
                        Theme, Units & Preferences
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] block truncate mt-0.5">
                        Dark mode, kg/lbs, timers & app audio
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              </div>
            </div>

            {/* Prominent Sign Out Button */}
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                logout();
                handleClose();
              }}
              className="justify-center gap-2 h-12 min-h-[48px] rounded-2xl text-xs sm:text-sm font-bold mt-4 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </Button>
          </div>
        ) : (
          /* ================= GUEST ACCOUNT CHOOSER PANEL ================= */
          <>
            {/* Compact Guest Mode Status */}
            <div className="bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border-subtle)] space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-muted)] shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold text-[var(--text-main)]">
                      Guest Mode
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                      Local Storage
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                    Not connected to cloud
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Workouts and personal records are currently stored locally on this device. Sign in to synchronize your history and goals across all devices securely.
              </p>
            </div>

            {/* Clear Primary CTA: Dedicated Sign In or Create Account */}
            <div className="pt-1 space-y-2">
              <Button
                variant="primary"
                onClick={() => handleNavigateToAuth('signin')}
                onMouseEnter={() => {
                  const img = new Image();
                  img.src = '/images/gymtrackie-signin-bg.jpg';
                }}
                onTouchStart={() => {
                  const img = new Image();
                  img.src = '/images/gymtrackie-signin-bg.jpg';
                }}
                fullWidth
                className="gap-2 text-xs sm:text-sm h-12 min-h-[48px] rounded-xl font-extrabold shadow-md shadow-red-600/20 justify-center touch-manipulation"
              >
                <LogIn className="w-4 h-4 stroke-[2.4]" />
                <span>Sign In or Create Account</span>
              </Button>
            </div>

            {/* Preferences, Goals & Themes Row */}
            <button
              type="button"
              onClick={() => goToSettings()}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)]/70 hover:bg-[var(--bg-card)] active:bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] transition-all cursor-pointer group text-left min-h-[44px]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors truncate">
                  Preferences, Goals & Themes
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors shrink-0" />
            </button>
          </>
        )}
      </div>

      {/* Dedicated Physique Progress Photos Modal */}
      <ProgressPhotosModal
        isOpen={isPhotosModalOpen}
        onClose={() => setIsPhotosModalOpen(false)}
      />

      {/* First-time Privacy & Security Trust Modal */}
      <PhotoPrivacyTrustModal
        isOpen={isPrivacyModalOpen}
        onConfirm={handleConfirmPrivacy}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </Modal>
  );
};
