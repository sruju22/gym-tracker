import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Gauge,
  Heart,
  Flame,
  Edit3,
  Trash2,
  CloudOff,
  RotateCw,
  FileText,
  Activity,
  Footprints,
  Bike,
  Timer,
  Zap,
  Waves,
  TrendingUp,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CardioSession, CardioActivityType } from '../../types';
import {
  getActivityLabel,
  formatPace,
  formatSpeed,
  formatDuration,
} from '../../utils/cardioMetrics';
import { formatDateShort } from '../../utils/formatters';

interface CardioSessionDetailModalProps {
  session: CardioSession | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (session: CardioSession) => void;
  onDelete: (session: CardioSession) => void;
  onSyncNow?: (session: CardioSession) => Promise<void>;
}

const getActivityVisuals = (type: CardioActivityType) => {
  switch (type) {
    case 'running':
      return {
        icon: <Flame className="w-5 h-5 text-orange-400" />,
        bg: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
      };
    case 'walking':
      return {
        icon: <Footprints className="w-5 h-5 text-emerald-400" />,
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      };
    case 'cycling':
      return {
        icon: <Bike className="w-5 h-5 text-sky-400" />,
        bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
      };
    case 'treadmill':
      return {
        icon: <Timer className="w-5 h-5 text-purple-400" />,
        bg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
      };
    case 'elliptical':
      return {
        icon: <Zap className="w-5 h-5 text-yellow-400" />,
        bg: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
      };
    case 'rowing':
      return {
        icon: <Waves className="w-5 h-5 text-blue-400" />,
        bg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      };
    case 'stair_climber':
      return {
        icon: <TrendingUp className="w-5 h-5 text-rose-400" />,
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      };
    case 'other':
    default:
      return {
        icon: <Activity className="w-5 h-5 text-neutral-400" />,
        bg: 'bg-neutral-500/15 border-neutral-500/30 text-neutral-300',
      };
  }
};

export const CardioSessionDetailModal: React.FC<CardioSessionDetailModalProps> = ({
  session,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSyncNow,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen || !session) return null;

  const visuals = getActivityVisuals(session.activityType);
  const activityTitle = getActivityLabel(session.activityType, session.customActivityName);

  let formattedDate = 'Today';
  let formattedTime = '';
  try {
    const d = new Date(session.date);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      formattedTime = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    formattedDate = session.date ? formatDateShort(session.date) : 'Today';
  }

  const paceDisplay = formatPace(session.paceMinutesPerUnit, session.distanceUnit);
  const speedDisplay = formatSpeed(session.speedPerHour, session.distanceUnit);

  const handleSyncClick = async () => {
    if (!onSyncNow || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncNow(session);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${formatDateShort(session.date)} — ${activityTitle.toUpperCase()}`}
    >
      <div className="space-y-4">
        {/* Offline sync banner if pending */}
        {session.syncedToBackend === false && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold min-w-0">
              <CloudOff className="w-4 h-4 shrink-0" />
              <span className="truncate">Saved on device • Cloud sync pending</span>
            </div>
            {onSyncNow && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncClick}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}
          </div>
        )}

        {/* Activity & Date Banner */}
        <div className="flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-3.5">
          <div className={`p-3 rounded-xl border shrink-0 ${visuals.bg}`}>
            {visuals.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[var(--text-main)] truncate">
                {activityTitle}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] uppercase">
                {session.activityType.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
              {formattedTime && <span>• {formattedTime}</span>}
            </div>
          </div>
        </div>

        {/* Primary Metrics Grid (4-box layout) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Duration */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-orange-400" />
              Duration
            </div>
            <div className="text-lg font-black text-[var(--text-main)] mt-1">
              {formatDuration(session.durationMinutes)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">Session time</div>
          </div>

          {/* Distance */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Distance</div>
            <div className="text-lg font-black text-[var(--text-main)] mt-1">
              {session.distance !== null && session.distance !== undefined && session.distance > 0
                ? `${session.distance} ${session.distanceUnit || 'km'}`
                : '—'}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">
              {session.distance !== null && session.distance !== undefined && session.distance > 0
                ? 'Measured distance'
                : 'Not recorded'}
            </div>
          </div>

          {/* Average Pace */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Avg Pace</div>
            <div className="text-lg font-black text-[var(--primary)] mt-1 truncate">
              {paceDisplay}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">
              {session.paceMinutesPerUnit ? `per ${session.distanceUnit || 'km'}` : 'Pace rate'}
            </div>
          </div>

          {/* Average Speed */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-center gap-1">
              <Gauge className="w-3 h-3 text-sky-400" />
              Avg Speed
            </div>
            <div className="text-lg font-black text-[var(--text-main)] mt-1 truncate">
              {speedDisplay}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">Velocity rate</div>
          </div>
        </div>

        {/* Secondary Metrics: Heart Rate & Calories if present */}
        {(session.averageHeartRate || session.maxHeartRate || session.caloriesBurned) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Heart Rate Card */}
            {(session.averageHeartRate || session.maxHeartRate) && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Heart Rate</div>
                  <div className="text-sm font-black text-[var(--text-main)]">
                    {session.averageHeartRate ? `${session.averageHeartRate} bpm avg` : '—'}
                    {session.maxHeartRate ? ` • ${session.maxHeartRate} max` : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Calories Card */}
            {session.caloriesBurned && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Energy Output</div>
                  <div className="text-sm font-black text-[var(--text-main)]">
                    {session.caloriesBurned} kcal
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">Manually logged</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session Notes */}
        {session.notes && session.notes.trim() && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Session Notes
            </div>
            <p className="text-xs text-[var(--text-main)] leading-relaxed italic pl-1">
              "{session.notes}"
            </p>
          </div>
        )}

        {/* Actions: Edit Session & Delete Session */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => onEdit(session)}
            className="font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Cardio Session</span>
          </Button>

          <button
            type="button"
            onClick={() => onDelete(session)}
            className="w-full text-center text-xs font-bold text-[var(--danger)] hover:opacity-80 py-2 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete this cardio session</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
