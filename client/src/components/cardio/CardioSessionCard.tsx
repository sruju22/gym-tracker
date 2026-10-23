import React from 'react';
import {
  Flame,
  Footprints,
  Bike,
  Timer,
  Zap,
  Waves,
  TrendingUp,
  Activity,
  Heart,
  Clock,
  Gauge,
  Edit3,
  Trash2,
  Calendar,
  CloudOff,
} from 'lucide-react';
import { CardioSession, CardioActivityType } from '../../types';
import {
  getActivityLabel,
  formatPace,
  formatSpeed,
  formatDuration,
} from '../../utils/cardioMetrics';
import { formatDateShort } from '../../utils/formatters';

interface CardioSessionCardProps {
  session: CardioSession;
  onEdit: (session: CardioSession) => void;
  onDelete: (session: CardioSession) => void;
}

const getActivityVisuals = (type: CardioActivityType) => {
  switch (type) {
    case 'running':
      return {
        icon: <Flame className="w-4 h-4 text-orange-400" />,
        bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      };
    case 'walking':
      return {
        icon: <Footprints className="w-4 h-4 text-emerald-400" />,
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      };
    case 'cycling':
      return {
        icon: <Bike className="w-4 h-4 text-sky-400" />,
        bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
      };
    case 'treadmill':
      return {
        icon: <Timer className="w-4 h-4 text-purple-400" />,
        bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      };
    case 'elliptical':
      return {
        icon: <Zap className="w-4 h-4 text-yellow-400" />,
        bg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      };
    case 'rowing':
      return {
        icon: <Waves className="w-4 h-4 text-blue-400" />,
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      };
    case 'stair_climber':
      return {
        icon: <TrendingUp className="w-4 h-4 text-rose-400" />,
        bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      };
    case 'other':
    default:
      return {
        icon: <Activity className="w-4 h-4 text-neutral-400" />,
        bg: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-300',
      };
  }
};

export const CardioSessionCard: React.FC<CardioSessionCardProps> = ({
  session,
  onEdit,
  onDelete,
}) => {
  const visuals = getActivityVisuals(session.activityType);
  const activityTitle = getActivityLabel(session.activityType, session.customActivityName);

  const formattedDate = session.date ? formatDateShort(session.date) : 'Today';
  const paceDisplay = formatPace(session.paceMinutesPerUnit, session.distanceUnit);
  const speedDisplay = formatSpeed(session.speedPerHour, session.distanceUnit);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-4 transition-all shadow-sm">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-2 rounded-xl border flex items-center justify-center ${visuals.bg}`}>
            {visuals.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-main)] truncate">
              {activityTitle}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </span>
              {session.syncedToBackend === false && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  <CloudOff className="w-2.5 h-2.5" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(session)}
            aria-label="Edit cardio session"
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(session)}
            aria-label="Delete cardio session"
            className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] text-center">
        {/* Duration */}
        <div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Duration
          </div>
          <div className="text-sm font-black text-[var(--text-main)] mt-0.5">
            {formatDuration(session.durationMinutes)}
          </div>
        </div>

        {/* Distance */}
        <div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Distance</div>
          <div className="text-sm font-black text-[var(--text-main)] mt-0.5">
            {session.distance !== null && session.distance !== undefined && session.distance > 0
              ? `${session.distance} ${session.distanceUnit || 'km'}`
              : '—'}
          </div>
        </div>

        {/* Pace */}
        <div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Avg Pace</div>
          <div className="text-sm font-black text-[var(--primary)] mt-0.5 truncate">
            {paceDisplay}
          </div>
        </div>

        {/* Speed */}
        <div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3" />
            Avg Speed
          </div>
          <div className="text-sm font-black text-[var(--text-main)] mt-0.5 truncate">
            {speedDisplay}
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Heart Rate & Calories if present */}
      {(session.averageHeartRate || session.caloriesBurned) && (
        <div className="mt-2.5 flex items-center gap-3 px-3 py-1.5 bg-[var(--bg-surface)]/60 rounded-lg text-xs text-[var(--text-secondary)]">
          {session.averageHeartRate && (
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>
                <strong className="text-[var(--text-main)] font-bold">{session.averageHeartRate}</strong> bpm
                {session.maxHeartRate ? ` (max ${session.maxHeartRate})` : ''}
              </span>
            </div>
          )}
          {session.averageHeartRate && session.caloriesBurned && (
            <span className="text-[var(--border-subtle)]">•</span>
          )}
          {session.caloriesBurned && (
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>
                <strong className="text-[var(--text-main)] font-bold">{session.caloriesBurned}</strong> kcal
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {session.notes && session.notes.trim() && (
        <p className="mt-2 text-xs text-[var(--text-secondary)] italic bg-[var(--bg-surface)]/40 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]/50">
          "{session.notes}"
        </p>
      )}
    </div>
  );
};
