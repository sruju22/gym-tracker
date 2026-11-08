import React, { useState, useEffect, useRef } from 'react';
import { Scale, Calendar, FileText, AlertCircle, Loader2, Camera, Check, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { WeightLog } from '../../types';
import { uploadImageApi } from '../../api/uploadApi';

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number | null;
  initialUnit?: 'kg' | 'lbs';
  onSuccess?: (log: WeightLog) => void;
}

export const LogWeightModal: React.FC<LogWeightModalProps> = ({
  isOpen,
  onClose,
  initialWeight,
  initialUnit,
  onSuccess,
}) => {
  const { currentUser, updateProfile } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { logWeight } = useWorkoutStore();

  const defaultUnit: 'kg' | 'lbs' =
    initialUnit || currentUser?.weightUnit || 'kg';

  const [weight, setWeight] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(defaultUnit);
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setPhotoError(null);
      const uploaded = await uploadImageApi(file, 'progress_photos');
      setPhotoUrl(uploaded.url);
    } catch (err: any) {
      console.error('Progress photo upload failed:', err);
      setPhotoError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (photoFileInputRef.current) {
        photoFileInputRef.current.value = '';
      }
    }
  };

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      const prefUnit = initialUnit || currentUser?.weightUnit || 'kg';
      setUnit(prefUnit);

      const startWeight = initialWeight ?? currentUser?.currentWeight ?? null;
      if (startWeight !== null && startWeight !== undefined && startWeight > 0) {
        setWeight(String(startWeight));
      } else {
        setWeight('');
      }
      setNotes('');
      setPhotoUrl('');
      setPhotoError(null);
      setIsUploadingPhoto(false);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialWeight, initialUnit, currentUser]);

  if (!isOpen) return null;

  const handleUnitToggle = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === unit) return;
    const num = parseFloat(weight);
    if (!isNaN(num) && num > 0) {
      if (newUnit === 'lbs') {
        setWeight((Math.round(num * 2.20462 * 10) / 10).toString());
      } else {
        setWeight((Math.round((num / 2.20462) * 10) / 10).toString());
      }
    }
    setUnit(newUnit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weight);

    if (isNaN(val)) {
      setError('Please enter a valid weight.');
      return;
    }

    const minWeight = unit === 'kg' ? 20 : 44;
    const maxWeight = unit === 'kg' ? 500 : 1100;
    if (val < minWeight || val > maxWeight) {
      setError(`Weight must be between ${minWeight} and ${maxWeight} ${unit}.`);
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const roundedWeight = Math.round(val * 10) / 10;
      const log = await logWeight(userId, {
        weight: roundedWeight,
        unit,
        date,
        notes: notes.trim(),
        photoUrl: photoUrl.trim() || undefined,
      });

      // Synchronize with user profile
      const todayStr = new Date().toISOString().slice(0, 10);
      if (date >= todayStr) {
        try {
          await updateProfile({
            currentWeight: roundedWeight,
            weightUnit: unit,
          });
        } catch (profileErr) {
          console.warn('Could not sync weight directly to profile:', profileErr);
        }
      }

      if (onSuccess) {
        onSuccess(log);
      }
      onClose();
    } catch (err: any) {
      console.error('Error logging weight:', err);
      setError(err?.message || 'Failed to record weight entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Body Weight">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error notification banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Weight input with integrated unit toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            Body Weight
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                min={unit === 'kg' ? 20 : 44}
                max={unit === 'kg' ? 500 : 1100}
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={unit === 'kg' ? '75.0' : '165.0'}
                autoFocus
                required
                disabled={loading}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-3 text-lg font-bold text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
              <Scale className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>

            {/* Unit Segmented Control */}
            <div className="flex bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-subtle)] h-[52px] shrink-0 items-center">
              <button
                type="button"
                onClick={() => handleUnitToggle('kg')}
                className={`px-3.5 h-full rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  unit === 'kg'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                KG
              </button>
              <button
                type="button"
                onClick={() => handleUnitToggle('lbs')}
                className={`px-3.5 h-full rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  unit === 'lbs'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                LBS
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Valid range: {unit === 'kg' ? '20 - 500 kg' : '44 - 1100 lbs'}
          </p>
        </div>

        {/* Date Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            Entry Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              disabled={loading}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
            />
            <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>

        {/* Optional Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            Notes <span className="font-normal text-[var(--text-muted)] lowercase">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning fasted, post-workout"
              maxLength={80}
              disabled={loading}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
            />
            <FileText className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>

        {/* Progress Physique Photo (Cloudinary) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            Progress Photo <span className="font-normal text-[var(--text-muted)] lowercase">(optional)</span>
          </label>
          <input
            ref={photoFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {photoUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={photoUrl}
                  alt="Progress check-in"
                  className="w-12 h-12 rounded-lg object-cover border border-[var(--border-subtle)] shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Physique Photo Attached
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block truncate">
                    Saved to Cloudinary secure cloud
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => !isUploadingPhoto && photoFileInputRef.current?.click()}
              disabled={isUploadingPhoto || loading}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] bg-[var(--bg-card)]/50 hover:bg-[var(--bg-card)] flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-all cursor-pointer"
            >
              {isUploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>Attach Physique Check-in Photo</span>
                </>
              )}
            </button>
          )}
          {photoError && (
            <p className="text-[10px] text-rose-400 font-semibold">{photoError}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1 font-bold text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex-1 font-bold text-xs gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Entry</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
