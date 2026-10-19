import React, { useState, useEffect, useMemo } from 'react';
import { Scale, Plus, TrendingUp, TrendingDown, Minus, Trash2, Calendar, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { LogWeightModal } from './LogWeightModal';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { WeightLog } from '../../types';

export const BodyWeightCard: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { getWeightLogs, fetchWeightLogs, deleteWeightLog } = useWorkoutStore();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [deletingLog, setDeletingLog] = useState<WeightLog | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Fetch weight logs on mount or user change
  useEffect(() => {
    if (currentUser) {
      fetchWeightLogs(userId);
    }
  }, [currentUser, userId]);

  const rawLogs = getWeightLogs(userId);

  // Sort logs by date descending
  const sortedLogs = useMemo(() => {
    return [...rawLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [rawLogs]);

  const latestLog = sortedLogs[0];
  const unit = latestLog?.unit || currentUser?.weightUnit || 'kg';
  const currentWeight = latestLog?.weight ?? currentUser?.currentWeight ?? null;

  // Calculate 30-day change
  const thirtyDayChange = useMemo(() => {
    if (sortedLogs.length < 2) return null;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find log closest to 30 days ago
    const olderLogs = sortedLogs.filter(
      (l) => new Date(l.date) <= thirtyDaysAgo
    );
    const referenceLog = olderLogs.length > 0 ? olderLogs[0] : sortedLogs[sortedLogs.length - 1];

    if (!referenceLog || referenceLog.id === latestLog.id) return null;

    const diff = latestLog.weight - referenceLog.weight;
    return Math.round(diff * 10) / 10;
  }, [sortedLogs, latestLog]);

  const formatDateLabel = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return 'Today';
      }
      if (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      ) {
        return 'Yesterday';
      }

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenDelete = (log: WeightLog) => {
    setDeletingLog(log);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingLog) {
      await deleteWeightLog(userId, deletingLog.id || (deletingLog as any)._id);
      setIsDeleteModalOpen(false);
      setDeletingLog(null);
    }
  };

  const displayedLogs = showAllHistory ? sortedLogs : sortedLogs.slice(0, 5);

  return (
    <>
      <Card className="flex flex-col bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-xs">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
                Body Weight
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                Log entries & historical trends
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsLogModalOpen(true)}
            className="gap-1.5 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Weight</span>
          </Button>
        </div>

        {/* Current Weight & Key Metrics */}
        {currentWeight !== null ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3.5 sm:p-4">
              <div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Current Weight
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
                    {currentWeight}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    {unit}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {latestLog ? `Logged ${formatDateLabel(latestLog.date)}` : 'From Profile'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  30-Day Change
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  {thirtyDayChange !== null ? (
                    <>
                      {thirtyDayChange > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-400 font-bold text-base sm:text-lg">
                          <TrendingUp className="w-4 h-4" />
                          <span>+{thirtyDayChange} {unit}</span>
                        </div>
                      ) : thirtyDayChange < 0 ? (
                        <div className="flex items-center gap-1 text-blue-400 font-bold text-base sm:text-lg">
                          <TrendingDown className="w-4 h-4" />
                          <span>{thirtyDayChange} {unit}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[var(--text-muted)] font-bold text-base sm:text-lg">
                          <Minus className="w-4 h-4" />
                          <span>0.0 {unit}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)] font-medium">
                      Need more entries
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {thirtyDayChange !== null ? 'Net variation' : 'Log regularly to view'}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Total Entries
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight mt-0.5">
                  {sortedLogs.length}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Chronological logs
                </div>
              </div>
            </div>

            {/* Recent Logs List */}
            {sortedLogs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] px-1">
                  <span>Recent Logs</span>
                  {sortedLogs.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer font-bold"
                    >
                      {showAllHistory ? 'Show Fewer' : `View All (${sortedLogs.length})`}
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {displayedLogs.map((log, idx) => {
                    const prevLog = sortedLogs[idx + 1];
                    const diff = prevLog ? Math.round((log.weight - prevLog.weight) * 10) / 10 : null;

                    return (
                      <div
                        key={log.id || (log as any)._id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--text-main)]">
                                {formatDateLabel(log.date)}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                ({log.date})
                              </span>
                            </div>
                            {log.notes && (
                              <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[200px] sm:max-w-xs">
                                {log.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                              {log.weight} {log.unit}
                            </div>
                            {diff !== null && (
                              <div
                                className={`text-[10px] font-bold ${
                                  diff > 0
                                    ? 'text-emerald-400'
                                    : diff < 0
                                    ? 'text-blue-400'
                                    : 'text-[var(--text-muted)]'
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff} {log.unit}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(log)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg hover:bg-red-500/10"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-8 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--primary)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">
                No Body Weight Recorded Yet
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 max-w-xs mx-auto">
                Log your body weight to track weight changes over time and power weight-loss or muscle-gain goals.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsLogModalOpen(true)}
              className="gap-1.5 text-xs font-bold mx-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Weight</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Log Weight Modal */}
      <LogWeightModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        initialWeight={currentWeight}
        initialUnit={unit}
      />

      {/* Confirm Delete Weight Log */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Weight Entry"
        message={`Are you sure you want to delete the weight record of ${deletingLog?.weight} ${deletingLog?.unit} for ${deletingLog?.date}?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingLog(null);
        }}
      />
    </>
  );
};
