import React, { useState, useRef, useMemo } from 'react';
import {
  Camera,
  Calendar,
  Scale,
  Plus,
  Trash2,
  Maximize2,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Info,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { uploadImageApi } from '../../api/uploadApi';
import { ProgressPhotoEntry, PhotoAngle } from '../../types';
import { formatDateLabel } from '../../utils/formatters';

interface ProgressPhotosViewProps {
  onClose?: () => void;
  isModal?: boolean;
}

const ANGLE_CONFIG: {
  angle: PhotoAngle;
  title: string;
  shortLabel: string;
  hint: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    angle: 'front',
    title: 'Front Photo',
    shortLabel: 'FRONT',
    hint: 'Face camera with arms slightly flared or relaxed',
    badgeBg: 'bg-blue-500/15 border-blue-500/30',
    badgeText: 'text-blue-400',
  },
  {
    angle: 'side_left',
    title: 'Left Side Photo',
    shortLabel: 'LEFT SIDE',
    hint: 'Turn 90° left; profile view of chest, posture & legs',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeText: 'text-emerald-400',
  },
  {
    angle: 'side_right',
    title: 'Right Side Photo',
    shortLabel: 'RIGHT SIDE',
    hint: 'Turn 90° right; check lateral symmetry and torso depth',
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeText: 'text-amber-400',
  },
  {
    angle: 'back',
    title: 'Back Photo',
    shortLabel: 'BACK PHOTO',
    hint: 'Turn away from camera; showcase lats, traps & rear delts',
    badgeBg: 'bg-purple-500/15 border-purple-500/30',
    badgeText: 'text-purple-400',
  },
];

export const ProgressPhotosView: React.FC<ProgressPhotosViewProps> = ({
  onClose,
  isModal = false,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const {
    getProgressPhotos,
    saveProgressPhoto,
    deleteProgressPhotoAngle,
    deleteProgressPhotoEntry,
    getUserData,
  } = useWorkoutStore();

  const entries = getProgressPhotos(userId);
  const userData = getUserData(userId);
  const currentWeight = userData.currentWeight || 70;
  const weightUnit = (currentUser?.weightUnit || 'kg') as 'kg' | 'lbs';

  // Check-in Creation / Editor State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(entries.length === 0);
  const [checkinDate, setCheckinDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [checkinWeight, setCheckinWeight] = useState<string>(currentWeight ? String(currentWeight) : '');
  const [checkinNotes, setCheckinNotes] = useState<string>('');
  const [activeUploadAngle, setActiveUploadAngle] = useState<PhotoAngle | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Lightbox Preview State
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    angleTitle: string;
    date: string;
    weight?: number;
    unit?: string;
  } | null>(null);

  // Hidden File Inputs per angle
  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side_left: useRef<HTMLInputElement>(null),
    side_right: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  // Find or create active entry for the selected date
  const activeEntry = useMemo(() => {
    if (selectedEntryId) {
      return entries.find((e) => e.id === selectedEntryId) || null;
    }
    return entries.find((e) => e.date === checkinDate) || null;
  }, [entries, checkinDate, selectedEntryId]);

  const handleAngleFileSelect = async (
    angle: PhotoAngle,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setActiveUploadAngle(angle);
      setUploadError(null);

      // Upload directly to Cloudinary
      const uploaded = await uploadImageApi(file, 'progress_photos');

      // Persist in workoutStore
      const numWeight = checkinWeight ? parseFloat(checkinWeight) : undefined;
      await saveProgressPhoto(userId, {
        id: activeEntry?.id,
        date: checkinDate,
        weight: !isNaN(numWeight as number) ? numWeight : undefined,
        unit: weightUnit,
        notes: checkinNotes.trim() || undefined,
        angle,
        url: uploaded.url,
      });
    } catch (err: any) {
      console.error(`[ProgressPhotos] Upload failed for ${angle}:`, err);
      setUploadError(err.message || 'Failed to upload photo to cloud storage.');
    } finally {
      setActiveUploadAngle(null);
      if (fileInputRefs[angle].current) {
        fileInputRefs[angle].current.value = '';
      }
    }
  };

  const handleStartNewCheckin = () => {
    setSelectedEntryId(null);
    setCheckinDate(new Date().toISOString().slice(0, 10));
    setCheckinWeight(currentWeight ? String(currentWeight) : '');
    setCheckinNotes('');
    setUploadError(null);
    setIsEditorOpen(true);
  };

  const handleEditEntry = (entry: ProgressPhotoEntry) => {
    setSelectedEntryId(entry.id);
    setCheckinDate(entry.date);
    setCheckinWeight(entry.weight ? String(entry.weight) : '');
    setCheckinNotes(entry.notes || '');
    setUploadError(null);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Banner & Quick Action */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-[var(--text-main)]">
                Physique Progress Photos
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                {entries.length} Check-in{entries.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Upload Front, Side, and Back photos to visually compare your progress
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartNewCheckin}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Check-in</span>
        </button>
      </div>

      {/* 2. Check-in Editor (Upload Grid for 4 Angles) */}
      {isEditorOpen && (
        <div className="bg-[var(--bg-card)] border border-[var(--primary)]/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md animate-fade-in">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              <span className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                {selectedEntryId ? 'Update Check-in Photos' : 'Add Physique Photos'}
              </span>
            </div>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                Close Editor
              </button>
            )}
          </div>

          {/* Date & Weight Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                Check-in Date
              </label>
              <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-main)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <input
                  type="date"
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                  className="bg-transparent text-xs text-[var(--text-main)] focus:outline-none w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                Body Weight <span className="text-[9px] lowercase font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-main)]">
                <Scale className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 70.5"
                  value={checkinWeight}
                  onChange={(e) => setCheckinWeight(e.target.value)}
                  className="bg-transparent text-xs text-[var(--text-main)] focus:outline-none w-full"
                />
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">{weightUnit}</span>
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400 font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* The 4 Angle Upload Boxes (Neatly Bannered) */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
              Select or Take Photos for Each Angle
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {ANGLE_CONFIG.map(({ angle, title, shortLabel, hint, badgeBg, badgeText }) => {
                const photoUrl = activeEntry?.photos[angle];
                const isUploadingThis = activeUploadAngle === angle;

                return (
                  <div
                    key={angle}
                    className="relative flex flex-col justify-between rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden transition-all group"
                  >
                    {/* Hidden input */}
                    <input
                      ref={fileInputRefs[angle]}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                      className="hidden"
                      onChange={(e) => handleAngleFileSelect(angle, e)}
                    />

                    {/* Top Angle Banner Pill */}
                    <div className="p-2 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${badgeBg} ${badgeText}`}>
                        {shortLabel}
                      </span>
                      {photoUrl && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>

                    {/* Photo Content Area */}
                    <div className="relative aspect-[3/4] flex items-center justify-center bg-[var(--bg-card-subtle)] overflow-hidden">
                      {photoUrl ? (
                        <>
                          <img
                            src={photoUrl}
                            alt={title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-102 cursor-pointer"
                            onClick={() =>
                              setLightboxPhoto({
                                url: photoUrl,
                                angleTitle: title,
                                date: checkinDate,
                                weight: activeEntry?.weight,
                                unit: activeEntry?.unit,
                              })
                            }
                          />

                          {/* Action Overlay */}
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxPhoto({
                                  url: photoUrl,
                                  angleTitle: title,
                                  date: checkinDate,
                                  weight: activeEntry?.weight,
                                  unit: activeEntry?.unit,
                                })
                              }
                              title="Full Screen View"
                              className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/90 cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isUploadingThis}
                                onClick={() => fileInputRefs[angle].current?.click()}
                                title="Change Photo"
                                className="p-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                              {activeEntry && (
                                <button
                                  type="button"
                                  onClick={() => deleteProgressPhotoAngle(userId, activeEntry.id, angle)}
                                  title="Delete Photo"
                                  className="p-1.5 rounded-lg bg-rose-500/80 text-white hover:bg-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isUploadingThis}
                          onClick={() => fileInputRefs[angle].current?.click()}
                          className="w-full h-full flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-[var(--bg-input)]/70 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] mb-2 transition-colors shadow-xs">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-[var(--text-main)] block">
                            Upload {title}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)] leading-tight mt-1 line-clamp-2">
                            {hint}
                          </span>
                        </button>
                      )}

                      {/* Loading Indicator */}
                      {isUploadingThis && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-3 text-center z-10">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                          <span className="text-[11px] font-bold text-white">Uploading...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">
              Photos stream securely into Cloudinary with automated optimization.
            </span>
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Done Check-in
            </button>
          </div>
        </div>
      )}

      {/* 3. Check-ins History Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
            Check-in History ({entries.length})
          </span>
          {entries.length > 1 && (
            <span className="text-[11px] text-[var(--text-muted)]">
              Chronological order (newest first)
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-xs">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="max-w-xs mx-auto space-y-1">
              <h3 className="text-sm font-black text-[var(--text-main)]">No Progress Photos Logged Yet</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Take photos from the front, sides, and back under consistent lighting to document your muscle growth and fat loss over time.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartNewCheckin}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Log Your First Photo Check-in</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const photoCount = Object.values(entry.photos).filter(Boolean).length;

              return (
                <div
                  key={entry.id}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs hover:border-[var(--border-strong)] transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                            {formatDateLabel(entry.date)}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            ({entry.date})
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.weight && (
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                          {entry.weight} {entry.unit || 'kg'}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-lg border border-[var(--border-subtle)]">
                        {photoCount}/4 angles
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEditEntry(entry)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                        title="Add/Edit photos for this date"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProgressPhotoEntry(userId, entry.id)}
                        className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete check-in"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 4 Angle Banners / Boxes Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                    {ANGLE_CONFIG.map(({ angle, title, shortLabel, badgeBg, badgeText }) => {
                      const url = entry.photos[angle];

                      if (!url) {
                        return (
                          <div
                            key={angle}
                            onClick={() => handleEditEntry(entry)}
                            className="aspect-[3/4] rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 hover:bg-[var(--bg-surface)] p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
                          >
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${badgeBg} ${badgeText} mb-2`}>
                              {shortLabel}
                            </span>
                            <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                            <span className="text-[10px] font-semibold text-[var(--text-muted)] mt-1">
                              Add {shortLabel}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={angle}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border border-[var(--border-subtle)] group cursor-pointer bg-black/40"
                          onClick={() =>
                            setLightboxPhoto({
                              url,
                              angleTitle: title,
                              date: entry.date,
                              weight: entry.weight,
                              unit: entry.unit,
                            })
                          }
                        >
                          <img
                            src={url}
                            alt={`${title} - ${entry.date}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-103"
                          />

                          {/* Top Angle Banner */}
                          <div className="absolute top-1.5 left-1.5 z-10">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border backdrop-blur-md ${badgeBg} ${badgeText} shadow-xs`}>
                              {shortLabel}
                            </span>
                          </div>

                          {/* Hover Zoom Icon */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center backdrop-blur-xs">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Full-Screen Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[92vh] flex flex-col bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]">
              <div>
                <span className="text-xs font-black text-[var(--text-main)] block">
                  {lightboxPhoto.angleTitle}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {formatDateLabel(lightboxPhoto.date)} ({lightboxPhoto.date})
                  {lightboxPhoto.weight && ` • ${lightboxPhoto.weight} ${lightboxPhoto.unit || 'kg'}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Res Image Display */}
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/95 p-2">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.angleTitle}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
