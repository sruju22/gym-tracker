import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Flame,
  Footprints,
  Bike,
  Timer,
  Zap,
  Waves,
  TrendingUp,
  Activity,
  Heart,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CardioSession, CardioActivityType, DistanceUnit } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import {
  CARDIO_ACTIVITIES,
  calculatePace,
  calculateSpeed,
  formatPace,
  formatSpeed,
} from '../../utils/cardioMetrics';

interface LogCardioModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: CardioSession | null;
  onSaved?: (session: CardioSession) => void;
}

const getActivityIcon = (type: CardioActivityType) => {
  switch (type) {
    case 'running':
      return <Flame className="w-4 h-4 text-orange-400" />;
    case 'walking':
      return <Footprints className="w-4 h-4 text-emerald-400" />;
    case 'cycling':
      return <Bike className="w-4 h-4 text-sky-400" />;
    case 'treadmill':
      return <Timer className="w-4 h-4 text-purple-400" />;
    case 'elliptical':
      return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'rowing':
      return <Waves className="w-4 h-4 text-blue-400" />;
    case 'stair_climber':
      return <TrendingUp className="w-4 h-4 text-rose-400" />;
    case 'other':
    default:
      return <Activity className="w-4 h-4 text-neutral-400" />;
  }
};

export const LogCardioModal: React.FC<LogCardioModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  onSaved,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { logCardioSession, updateCardioSession } = useWorkoutStore();

  const [activityType, setActivityType] = useState<CardioActivityType>('running');
  const [customName, setCustomName] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [avgHeartRate, setAvgHeartRate] = useState('');
  const [maxHeartRate, setMaxHeartRate] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    if (sessionToEdit) {
      setActivityType(sessionToEdit.activityType);
      setCustomName(sessionToEdit.customActivityName || '');
      let localIso = '';
      try {
        const d = sessionToEdit.date ? new Date(sessionToEdit.date) : new Date();
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        localIso = `${validDate.getFullYear()}-${pad(validDate.getMonth() + 1)}-${pad(validDate.getDate())}T${pad(validDate.getHours())}:${pad(validDate.getMinutes())}`;
      } catch {
        const now = new Date();
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      }
      setDateStr(localIso);
      setDuration(sessionToEdit.durationMinutes ? String(sessionToEdit.durationMinutes) : '');
      setDistance(sessionToEdit.distance !== null && sessionToEdit.distance !== undefined ? String(sessionToEdit.distance) : '');
      setDistanceUnit(sessionToEdit.distanceUnit || 'km');
      setAvgHeartRate(sessionToEdit.averageHeartRate ? String(sessionToEdit.averageHeartRate) : '');
      setMaxHeartRate(sessionToEdit.maxHeartRate ? String(sessionToEdit.maxHeartRate) : '');
      setCaloriesBurned(sessionToEdit.caloriesBurned ? String(sessionToEdit.caloriesBurned) : '');
      setNotes(sessionToEdit.notes || '');
      setShowAdvanced(
        Boolean(sessionToEdit.averageHeartRate || sessionToEdit.maxHeartRate || sessionToEdit.caloriesBurned)
      );
    } else {
      setActivityType('running');
      setCustomName('');
      const now = new Date();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setDateStr(localIso);
      setDuration('');
      setDistance('');
      setDistanceUnit('km');
      setAvgHeartRate('');
      setMaxHeartRate('');
      setCaloriesBurned('');
      setNotes('');
      setShowAdvanced(false);
    }
    setErrorMsg(null);
  }, [isOpen, sessionToEdit]);

  // Real-time derivation of pace & speed
  const derivedMetrics = useMemo(() => {
    const durNum = parseFloat(duration);
    const distNum = parseFloat(distance);

    if (durNum > 0 && distNum > 0) {
      const paceVal = calculatePace(durNum, distNum, distanceUnit);
      const speedVal = calculateSpeed(durNum, distNum, distanceUnit);
      return {
        hasDerivation: true,
        paceFormatted: formatPace(paceVal, distanceUnit),
        speedFormatted: formatSpeed(speedVal, distanceUnit),
      };
    }

    return {
      hasDerivation: false,
      paceFormatted: '—',
      speedFormatted: '—',
    };
  }, [duration, distance, distanceUnit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    const durNum = parseFloat(duration);
    if (!Number.isFinite(durNum) || durNum <= 0) {
      setErrorMsg('Please enter a valid duration greater than 0 minutes.');
      return;
    }

    const distNum = distance.trim() !== '' ? parseFloat(distance) : null;
    if (distNum !== null && (!Number.isFinite(distNum) || distNum < 0)) {
      setErrorMsg('Distance must be a positive number if provided.');
      return;
    }

    const avgHrNum = avgHeartRate.trim() !== '' ? parseInt(avgHeartRate, 10) : null;
    const maxHrNum = maxHeartRate.trim() !== '' ? parseInt(maxHeartRate, 10) : null;
    const calNum = caloriesBurned.trim() !== '' ? parseInt(caloriesBurned, 10) : null;

    if (avgHrNum !== null && (avgHrNum < 30 || avgHrNum > 250)) {
      setErrorMsg('Average heart rate must be between 30 and 250 bpm.');
      return;
    }

    if (maxHrNum !== null && (maxHrNum < 30 || maxHrNum > 260)) {
      setErrorMsg('Max heart rate must be between 30 and 260 bpm.');
      return;
    }

    setIsSubmitting(true);
    try {
      let dateVal: string;
      try {
        const parsed = dateStr ? new Date(dateStr) : new Date();
        dateVal = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
      } catch {
        dateVal = new Date().toISOString();
      }

      if (sessionToEdit) {
        await updateCardioSession(userId, sessionToEdit.id, {
          activityType,
          customActivityName: activityType === 'other' ? customName.trim() : undefined,
          date: dateVal,
          durationMinutes: durNum,
          distance: distNum,
          distanceUnit,
          averageHeartRate: avgHrNum,
          maxHeartRate: maxHrNum,
          caloriesBurned: calNum,
          notes: notes.trim(),
        });
        if (onSaved) {
          onSaved({
            ...sessionToEdit,
            activityType,
            customActivityName: activityType === 'other' ? customName.trim() : undefined,
            date: dateVal,
            durationMinutes: durNum,
            distance: distNum,
            distanceUnit,
            averageHeartRate: avgHrNum,
            maxHeartRate: maxHrNum,
            caloriesBurned: calNum,
            notes: notes.trim(),
          });
        }
      } else {
        const created = await logCardioSession(userId, {
          activityType,
          customActivityName: activityType === 'other' ? customName.trim() : undefined,
          date: dateVal,
          durationMinutes: durNum,
          distance: distNum,
          distanceUnit,
          averageHeartRate: avgHrNum,
          maxHeartRate: maxHrNum,
          caloriesBurned: calNum,
          notes: notes.trim(),
        });
        if (onSaved) {
          onSaved(created);
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save cardio session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)]">
                <Flame className="w-4 h-4" />
              </span>
              {sessionToEdit ? 'Edit Cardio Session' : 'Log Cardio Session'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Track duration, distance, pace, and conditioning metrics
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Activity Type Picker */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Activity Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CARDIO_ACTIVITIES.map((act) => {
                const isSelected = activityType === act.type;
                return (
                  <button
                    key={act.type}
                    type="button"
                    onClick={() => {
                      setActivityType(act.type);
                      setDistanceUnit(act.defaultUnit);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text-main)] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="mb-1">{getActivityIcon(act.type)}</div>
                    <span className="text-[11px] font-semibold truncate w-full">{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Activity Name if 'other' */}
          {activityType === 'other' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Custom Activity Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Boxing, Jump Rope, Swimming"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Primary Metrics: Duration & Distance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Duration (Required) */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Duration (minutes) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 30"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Distance & Unit (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Distance (optional)
                </label>
                <div className="flex gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-0.5">
                  {(['km', 'mi', 'm'] as DistanceUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDistanceUnit(u)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        distanceUnit === u
                          ? 'bg-[var(--primary)] text-white'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder={`e.g. 5.0 ${distanceUnit}`}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Derivation Live Preview */}
          {derivedMetrics.hasDerivation && (
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--primary)]/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-xs font-bold text-[var(--text-main)]">Calculated Pace & Speed:</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)]">Pace: </span>
                  <span className="font-bold text-[var(--text-main)]">{derivedMetrics.paceFormatted}</span>
                </div>
                <div className="text-[var(--border-subtle)]">|</div>
                <div>
                  <span className="text-[var(--text-muted)]">Speed: </span>
                  <span className="font-bold text-[var(--text-main)]">{derivedMetrics.speedFormatted}</span>
                </div>
              </div>
            </div>
          )}

          {/* Secondary / Advanced Metrics Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>{showAdvanced ? 'Hide heart rate & calories' : 'Add heart rate & calories (optional)'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Avg Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    value={avgHeartRate}
                    onChange={(e) => setAvgHeartRate(e.target.value)}
                    placeholder="e.g. 145"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Max Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="260"
                    value={maxHeartRate}
                    onChange={(e) => setMaxHeartRate(e.target.value)}
                    placeholder="e.g. 172"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Calories Burned (kcal) <span className="text-[10px] text-[var(--text-muted)] font-normal">(Manual entry only)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={caloriesBurned}
                  onChange={(e) => setCaloriesBurned(e.target.value)}
                  placeholder="e.g. 350"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Outdoor trail run, felt energized, intervals in the final 10 mins"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:opacity-90 rounded-xl transition-opacity flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <span>{sessionToEdit ? 'Save Changes' : 'Save Session'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
