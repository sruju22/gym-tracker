import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Trash2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface PhotoPrivacyTrustModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const PhotoPrivacyTrustModal: React.FC<PhotoPrivacyTrustModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      title="Privacy & Security Guarantee"
    >
      <div className="space-y-4 py-1 text-[var(--text-main)]">
        {/* Shield Icon Badge */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mx-auto shadow-md shadow-emerald-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-main)]">
            Your Photos Are 100% Private & Secure
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
            Your physique check-ins are strictly confidential. We protect your body transformation photos with bank-grade privacy standards.
          </p>
        </div>

        {/* 4 Trust Points */}
        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <EyeOff className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                Never Publicly Visible
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed block mt-0.5">
                No public feeds, no social profiles, and no discovery. Nobody else can ever search, browse, or see your photos.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                Encrypted Cloud Storage
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed block mt-0.5">
                Stored in your private, authenticated cloud storage vault protected by encrypted JWT user tokens.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                No AI Training or Data Sharing
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed block mt-0.5">
                Your photos are exclusively for your personal tracking. They are never shared, sold, or used to train public AI models.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                Permanent 1-Tap Deletion
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed block mt-0.5">
                You retain full ownership. You can permanently delete any individual photo or entire check-in at any time.
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            fullWidth
            onClick={onConfirm}
            className="gap-2 h-12 min-h-[48px] rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-red-600/20 justify-center cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>I Understand — Continue to Photos</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
