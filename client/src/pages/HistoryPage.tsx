import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Edit3,
  Lock,
  LogIn,
  Search,
  X,
  RotateCcw,
  Calendar,
  Filter,
  Trash2,
  Dumbbell,
  AlertTriangle,
  Flame,
  Layers,
  Plus,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { formatDateShort, formatDayName } from '../utils/formatters';
import { WorkoutSession, CardioSession } from '../types';
import { useNavigate } from 'react-router-dom';
import { normalizeCombinationExercises } from '../utils/combinationNormalizer';
import { LogCardioModal } from '../components/cardio/LogCardioModal';
import { CardioSessionCard } from '../components/cardio/CardioSessionCard';
import { CARDIO_ACTIVITIES, formatDuration } from '../utils/cardioMetrics';

type DateRangeFilter = 'all' | 'week' | 'month' | '3months';
type HistoryTab = 'all' | 'strength' | 'cardio';

interface FeedItem {
  id: string;
  kind: 'strength' | 'cardio';
  date: string;
  strengthSession?: WorkoutSession;
  cardioSession?: CardioSession;
}

const isDateInRange = (dateStr: string, range: DateRangeFilter): boolean => {
  if (range === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (isNaN(d.getTime())) return true;

  if (range === 'week') {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return d >= monday;
  }

  if (range === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  if (range === '3months') {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);
    return d >= threeMonthsAgo;
  }

  return true;
};

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const { startEditingWorkout, deleteWorkout, deleteCardioSession } = useWorkoutStore();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');

  // Strength session modal state
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cardio modal & delete state
  const [isLogCardioOpen, setIsLogCardioOpen] = useState(false);
  const [cardioToEdit, setCardioToEdit] = useState<CardioSession | null>(null);
  const [cardioToDelete, setCardioToDelete] = useState<CardioSession | null>(null);
  const [isDeleteCardioConfirmOpen, setIsDeleteCardioConfirmOpen] = useState(false);
  const [isDeletingCardio, setIsDeletingCardio] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCardioActivity, setSelectedCardioActivity] = useState<string>('all');

  // Pagination / Incremental loading
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const userId = currentUser?.id || 'guest';

  // 1. Raw Strength Workouts
  const rawHistory = useWorkoutStore((state) =>
    currentUser?.id ? state.userDataMap[currentUser.id]?.history : state.userDataMap['guest']?.history
  );
  const history = useMemo(() => {
    if (!rawHistory) return [];
    return rawHistory
      .filter((s) => s.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime());
  }, [rawHistory]);

  // 2. Raw Cardio Sessions
  const rawCardio = useWorkoutStore((state) =>
    currentUser?.id ? state.userDataMap[currentUser.id]?.cardioSessions : state.userDataMap['guest']?.cardioSessions
  );
  const cardioSessions = useMemo(() => {
    if (!rawCardio) return [];
    return [...rawCardio].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [rawCardio]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setVisibleCount(PAGE_SIZE);
  };

  const handleDateRangeChange = (range: DateRangeFilter) => {
    setDateRange(range);
    setVisibleCount(PAGE_SIZE);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setVisibleCount(PAGE_SIZE);
  };

  const handleCardioActivityChange = (act: string) => {
    setSelectedCardioActivity(act);
    setVisibleCount(PAGE_SIZE);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateRange('all');
    setSelectedType('all');
    setSelectedCardioActivity('all');
    setVisibleCount(PAGE_SIZE);
  };

  // Unique Strength Workout Types
  const uniqueWorkoutTypes = useMemo(() => {
    const types = new Set<string>();
    history.forEach((s) => {
      if (s.workoutName && s.workoutName.trim()) {
        types.add(s.workoutName.trim());
      }
    });
    return Array.from(types);
  }, [history]);

  // Unique Cardio Activity Types Logged
  const uniqueCardioActivities = useMemo(() => {
    const acts = new Set<string>();
    cardioSessions.forEach((s) => {
      if (s.activityType) {
        acts.add(s.activityType);
      }
    });
    return Array.from(acts);
  }, [cardioSessions]);

  // Filtered Strength History
  const filteredHistory = useMemo(() => {
    return history.filter((session) => {
      if (!isDateInRange(session.completedAt || session.date, dateRange)) {
        return false;
      }
      if (selectedType !== 'all') {
        if ((session.workoutName || '').trim().toLowerCase() !== selectedType.trim().toLowerCase()) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const workoutMatch = (session.workoutName || '').toLowerCase().includes(q);
        const muscleMatch = (session.muscleGroups || []).some((m) => m.toLowerCase().includes(q));
        const exerciseMatch = (session.exercises || []).some(
          (ex) =>
            (ex.exercise?.name || '').toLowerCase().includes(q) ||
            (ex.notes || '').toLowerCase().includes(q)
        );
        if (!workoutMatch && !muscleMatch && !exerciseMatch) {
          return false;
        }
      }
      return true;
    });
  }, [history, dateRange, selectedType, searchQuery]);

  // Filtered Cardio Sessions
  const filteredCardio = useMemo(() => {
    return cardioSessions.filter((session) => {
      if (!isDateInRange(session.date, dateRange)) {
        return false;
      }
      if (selectedCardioActivity !== 'all') {
        if (session.activityType !== selectedCardioActivity) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const typeMatch = session.activityType.toLowerCase().includes(q);
        const customMatch = (session.customActivityName || '').toLowerCase().includes(q);
        const notesMatch = (session.notes || '').toLowerCase().includes(q);
        if (!typeMatch && !customMatch && !notesMatch) {
          return false;
        }
      }
      return true;
    });
  }, [cardioSessions, dateRange, selectedCardioActivity, searchQuery]);

  // Unified Chronological Feed (When activeTab === 'all')
  const unifiedFeed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    filteredHistory.forEach((s) => {
      items.push({
        id: `strength_${s.id}`,
        kind: 'strength',
        date: s.completedAt || s.date,
        strengthSession: s,
      });
    });

    filteredCardio.forEach((c) => {
      items.push({
        id: `cardio_${c.id}`,
        kind: 'cardio',
        date: c.date,
        cardioSession: c,
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredHistory, filteredCardio]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    dateRange !== 'all' ||
    selectedType !== 'all' ||
    selectedCardioActivity !== 'all';

  // Strength Summary statistics
  const totalVolume = useMemo(() => {
    return history.reduce((acc, s) => acc + (s.totalVolume || 0), 0);
  }, [history]);

  const totalSets = useMemo(() => {
    return history.reduce((acc, s) => acc + (s.totalSets || 0), 0);
  }, [history]);

  // Cardio Summary statistics
  const totalCardioMinutes = useMemo(() => {
    return cardioSessions.reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
  }, [cardioSessions]);

  const totalCardioDistance = useMemo(() => {
    return cardioSessions.reduce((acc, c) => acc + (c.distance || 0), 0);
  }, [cardioSessions]);

  // Paginated Slices
  const paginatedHistory = useMemo(() => {
    return filteredHistory.slice(0, visibleCount);
  }, [filteredHistory, visibleCount]);

  const paginatedCardio = useMemo(() => {
    return filteredCardio.slice(0, visibleCount);
  }, [filteredCardio, visibleCount]);

  const paginatedUnifiedFeed = useMemo(() => {
    return unifiedFeed.slice(0, visibleCount);
  }, [unifiedFeed, visibleCount]);

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    setIsDeleting(true);
    await deleteWorkout(userId, selectedSession.id);
    setIsDeleting(false);
    setIsDeleteConfirmOpen(false);
    setSelectedSession(null);
  };

  const handleDeleteCardioConfirm = async () => {
    if (!cardioToDelete) return;
    setIsDeletingCardio(true);
    await deleteCardioSession(userId, cardioToDelete.id);
    setIsDeletingCardio(false);
    setIsDeleteCardioConfirmOpen(false);
    setCardioToDelete(null);
  };

  if (!currentUser) {
    return (
      <div className="space-y-4 pb-12">
        <Header title="Workout History" subtitle="Your Past Workouts" />
        <div className="text-center py-12 px-5 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
            <Lock className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-main)]">Sign in to View Training History</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            Your workout history, strength PRs, and cardio conditioning sessions are securely linked to your account.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/login')}
              className="gap-2 mx-auto font-bold px-6"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In or Register</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Helper to render strength card
  const renderStrengthCard = (session: WorkoutSession) => (
    <Card
      key={session.id}
      hoverable
      onClick={() => setSelectedSession(session)}
      className="flex items-center justify-between border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)]/50 transition-all cursor-pointer p-4 rounded-2xl"
    >
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-[var(--primary)]">
            {formatDateShort(session.completedAt || session.date)}
          </span>
          <span className="text-xs text-[var(--text-muted)]">•</span>
          <span className="text-xs text-[var(--text-secondary)] font-medium capitalize">
            {formatDayName(session.dayOfWeek)}
          </span>
          {session.syncedToBackend === false && (
            <>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                On-device
              </span>
            </>
          )}
        </div>

        <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight truncate mb-1">
          {session.workoutName || session.muscleGroups.join(' + ')}
        </h3>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)] font-medium">
          <span>{session.exercises.length} exercises</span>
          <span>•</span>
          <span>{session.totalSets} sets</span>
          <span>•</span>
          <span className="text-[var(--primary)] font-bold">{session.totalVolume} kg</span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
    </Card>
  );

  return (
    <div className="space-y-4 pb-16 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <Header title="Workout History" subtitle="Your Training Archive" />
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setCardioToEdit(null);
            setIsLogCardioOpen(true);
          }}
          className="gap-1.5 font-bold shadow-sm"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Log Cardio</span>
        </Button>
      </div>

      {/* Category Segmented Selector: All | Strength | Cardio */}
      <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-subtle)] gap-1">
        <button
          onClick={() => {
            setActiveTab('all');
            setVisibleCount(PAGE_SIZE);
          }}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All ({history.length + cardioSessions.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('strength');
            setVisibleCount(PAGE_SIZE);
          }}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'strength'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Strength ({history.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('cardio');
            setVisibleCount(PAGE_SIZE);
          }}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'cardio'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Cardio ({cardioSessions.length})</span>
        </button>
      </div>

      {/* Top Summary Row based on Active Tab */}
      {activeTab === 'strength' && (
        <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center shadow-sm">
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Workouts</div>
            <div className="text-base sm:text-lg font-black text-[var(--text-main)]">{history.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Volume</div>
            <div className="text-base sm:text-lg font-black text-[var(--primary)]">{totalVolume.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Sets</div>
            <div className="text-base sm:text-lg font-black text-[var(--text-main)]">{totalSets}</div>
          </div>
        </div>
      )}

      {activeTab === 'cardio' && (
        <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center shadow-sm">
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Cardio Sessions</div>
            <div className="text-base sm:text-lg font-black text-[var(--text-main)]">{cardioSessions.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Duration</div>
            <div className="text-base sm:text-lg font-black text-orange-400">{formatDuration(totalCardioMinutes)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Distance</div>
            <div className="text-base sm:text-lg font-black text-[var(--text-main)]">
              {Math.round(totalCardioDistance * 10) / 10} km
            </div>
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center shadow-sm">
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Sessions</div>
            <div className="text-base sm:text-lg font-black text-[var(--text-main)]">
              {history.length + cardioSessions.length}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Strength Volume</div>
            <div className="text-base sm:text-lg font-black text-[var(--primary)]">{totalVolume.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Cardio Time</div>
            <div className="text-base sm:text-lg font-black text-orange-400">{formatDuration(totalCardioMinutes)}</div>
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={
              activeTab === 'cardio'
                ? 'Search cardio activity or notes...'
                : activeTab === 'strength'
                ? 'Search workout or exercise...'
                : 'Search workouts, cardio, or exercises...'
            }
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-8 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-main)] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date-Range Pills */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[var(--primary)]" />
              Date Range
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] font-bold text-[var(--primary)] hover:opacity-80 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: '3months', label: '3 Months' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleDateRangeChange(tab.id)}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/25'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Strength Workout-Type Filter */}
        {(activeTab === 'strength' || activeTab === 'all') && uniqueWorkoutTypes.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[var(--primary)]" />
              Strength Workout Type
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleTypeChange('all')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-[var(--primary)]/15 border border-[var(--primary)] text-[var(--primary)]'
                    : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                All ({history.length})
              </button>
              {uniqueWorkoutTypes.map((type) => {
                const count = history.filter((s) => (s.workoutName || '').trim() === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      selectedType === type
                        ? 'bg-[var(--primary)]/15 border border-[var(--primary)] text-[var(--primary)]'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {type} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cardio Activity Filter */}
        {(activeTab === 'cardio' || (activeTab === 'all' && uniqueCardioActivities.length > 0)) && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              Cardio Activity
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleCardioActivityChange('all')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedCardioActivity === 'all'
                    ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400'
                    : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                All Activities ({cardioSessions.length})
              </button>
              {CARDIO_ACTIVITIES.map((act) => {
                const count = cardioSessions.filter((c) => c.activityType === act.type).length;
                if (count === 0 && activeTab === 'all') return null;
                return (
                  <button
                    key={act.type}
                    onClick={() => handleCardioActivityChange(act.type)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      selectedCardioActivity === act.type
                        ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {act.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter Results Status */}
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] px-1">
        <span>
          {activeTab === 'all' && `Showing ${unifiedFeed.length} training sessions`}
          {activeTab === 'strength' &&
            `Showing ${filteredHistory.length} ${filteredHistory.length === 1 ? 'workout' : 'workouts'}`}
          {activeTab === 'cardio' &&
            `Showing ${filteredCardio.length} ${filteredCardio.length === 1 ? 'cardio session' : 'cardio sessions'}`}
          {hasActiveFilters && ' (filtered)'}
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="text-[var(--primary)] hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* LIST SECTION: CARDIO */}
      {activeTab === 'cardio' && (
        <div className="space-y-3">
          {paginatedCardio.map((session) => (
            <CardioSessionCard
              key={session.id}
              session={session}
              onEdit={(s) => {
                setCardioToEdit(s);
                setIsLogCardioOpen(true);
              }}
              onDelete={(s) => {
                setCardioToDelete(s);
                setIsDeleteCardioConfirmOpen(true);
              }}
            />
          ))}

          {/* Empty State: Cardio */}
          {filteredCardio.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-orange-400">
                <Flame className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  {cardioSessions.length === 0 ? 'No Cardio Sessions Logged Yet' : 'No Matching Cardio Found'}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto mt-1 leading-relaxed">
                  {cardioSessions.length === 0
                    ? 'Log running, cycling, rowing, or walking sessions to track pace, distance, and conditioning.'
                    : 'Try adjusting your search keywords, date range, or activity filter.'}
                </p>
              </div>
              {cardioSessions.length === 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setCardioToEdit(null);
                    setIsLogCardioOpen(true);
                  }}
                  className="gap-1.5 mx-auto font-bold mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log First Cardio Session</span>
                </Button>
              ) : (
                hasActiveFilters && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResetFilters}
                    className="gap-1.5 mx-auto font-bold mt-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </Button>
                )
              )}
            </div>
          )}

          {/* Load More Cardio */}
          {visibleCount < filteredCardio.length && (
            <div className="pt-2 text-center">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="font-bold border-[var(--border-subtle)] hover:border-[var(--primary)]/60 transition-all"
              >
                Load More Cardio ({filteredCardio.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* LIST SECTION: STRENGTH */}
      {activeTab === 'strength' && (
        <div className="space-y-2">
          {paginatedHistory.map(renderStrengthCard)}

          {/* Empty State: Strength */}
          {filteredHistory.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <Dumbbell className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  {history.length === 0 ? 'No Workouts Saved Yet' : 'No Matching Workouts Found'}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto mt-1 leading-relaxed">
                  {history.length === 0
                    ? 'Complete your first workout to start tracking your progress and personal records.'
                    : 'Try adjusting your search keywords, date range, or workout type filter.'}
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-1.5 mx-auto font-bold mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </Button>
              )}
            </div>
          )}

          {/* Load More Strength */}
          {visibleCount < filteredHistory.length && (
            <div className="pt-2 text-center">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="font-bold border-[var(--border-subtle)] hover:border-[var(--primary)]/60 transition-all"
              >
                Load More Workouts ({filteredHistory.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* LIST SECTION: ALL (Unified Chronological Feed) */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          {paginatedUnifiedFeed.map((item) => {
            if (item.kind === 'strength' && item.strengthSession) {
              return renderStrengthCard(item.strengthSession);
            }
            if (item.kind === 'cardio' && item.cardioSession) {
              return (
                <CardioSessionCard
                  key={item.id}
                  session={item.cardioSession}
                  onEdit={(s) => {
                    setCardioToEdit(s);
                    setIsLogCardioOpen(true);
                  }}
                  onDelete={(s) => {
                    setCardioToDelete(s);
                    setIsDeleteCardioConfirmOpen(true);
                  }}
                />
              );
            }
            return null;
          })}

          {/* Empty State: All */}
          {unifiedFeed.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <Layers className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  {history.length + cardioSessions.length === 0
                    ? 'No Training Sessions Logged Yet'
                    : 'No Matching Sessions Found'}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto mt-1 leading-relaxed">
                  {history.length + cardioSessions.length === 0
                    ? 'Complete a workout or log a cardio session to build your training history.'
                    : 'Try clearing your filters or search keywords.'}
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-1.5 mx-auto font-bold mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </Button>
              )}
            </div>
          )}

          {/* Load More All */}
          {visibleCount < unifiedFeed.length && (
            <div className="pt-2 text-center">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="font-bold border-[var(--border-subtle)] hover:border-[var(--primary)]/60 transition-all"
              >
                Load More Sessions ({unifiedFeed.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Strength Workout Details Modal */}
      {selectedSession && (
        <Modal
          isOpen={Boolean(selectedSession)}
          onClose={() => {
            setSelectedSession(null);
            setIsDeleteConfirmOpen(false);
          }}
          title={`${formatDateShort(selectedSession.completedAt || selectedSession.date)} — ${(
            selectedSession.workoutName || selectedSession.muscleGroups.join(' + ')
          ).toUpperCase()}`}
        >
          <div className="space-y-3">
            {selectedSession.syncedToBackend === false && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 text-xs text-amber-400 font-semibold flex items-center justify-between">
                <span>Stored locally on this device • Cloud sync pending</span>
                <button
                  type="button"
                  onClick={() => {
                    useWorkoutStore.getState().syncPendingWorkouts(userId);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-bold text-amber-300 transition-colors cursor-pointer"
                >
                  Sync Now
                </button>
              </div>
            )}

            {/* Session Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Exercises</div>
                <div className="text-sm font-black text-[var(--text-main)]">
                  {selectedSession.exercises.length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Sets</div>
                <div className="text-sm font-black text-[var(--text-main)]">{selectedSession.totalSets}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Volume</div>
                <div className="text-sm font-black text-[var(--primary)]">
                  {selectedSession.totalVolume} kg
                </div>
              </div>
            </div>

            {/* Exercises & Sets Breakdown */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {normalizeCombinationExercises(selectedSession.exercises).map((ex, exIdx) => {
                const hasNestedStages = ex.sets && ex.sets.some((s) => s.stages && s.stages.length > 0);

                return (
                  <div
                    key={ex.id || exIdx}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3"
                  >
                    <div className="text-xs font-bold text-[var(--text-main)] mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{ex.combinationName || ex.exercise?.name || (ex as any).exerciseName || 'Exercise'}</span>
                        {ex.stageDescription && (
                          <span className="text-[10px] text-[var(--text-secondary)] font-normal">
                            ({ex.stageDescription})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ex.combinationName && (
                          <span className="text-[9px] font-black uppercase text-[var(--primary)] bg-[var(--primary)]/15 px-1.5 py-0.5 rounded border border-[var(--primary)]/30">
                            {ex.techniqueLabel || 'COMBINATION'}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                          {ex.sets.length} sets
                        </span>
                      </div>
                    </div>

                    {hasNestedStages ? (
                      <div className="space-y-1.5 mt-2">
                        {ex.sets.map((s) => (
                          <div key={s.id || s.setNumber} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-2">
                            <div className="text-[11px] font-black text-[var(--text-main)] mb-1">
                              Set {s.setNumber} {s.completed ? <span className="text-[var(--success)]">✓</span> : ''}
                            </div>
                            <div className="space-y-1 pl-1">
                              {(s.stages || []).map((st, stIdx) => (
                                <div key={st.id || stIdx} className="flex items-center justify-between text-[11px]">
                                  <span className="text-[var(--text-secondary)] truncate mr-2">
                                    Stage {st.stageOrder || stIdx + 1}: {st.exerciseName}{' '}
                                    {st.movementDescription ? `[${st.movementDescription}]` : ''}
                                  </span>
                                  <span className={st.completed ? 'text-[var(--success)] font-bold shrink-0' : 'text-[var(--text-muted)] shrink-0'}>
                                    {st.weight ?? 0}kg × {st.reps ?? 0}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {ex.sets.map((s, idx) => (
                          <span
                            key={idx}
                            className={`border px-2 py-0.5 rounded text-[11px] font-semibold ${
                              s.completed
                                ? 'bg-[var(--success)]/10 border-[var(--success)]/40 text-[var(--success)]'
                                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                            }`}
                          >
                            Set {s.setNumber}: {s.weight ?? 0}kg × {s.reps ?? 0}
                          </span>
                        ))}
                      </div>
                    )}

                    {ex.notes && (
                      <div className="mt-1.5 text-[11px] text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/30 italic">
                        "{ex.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions: Edit Workout & Delete Workout */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  startEditingWorkout(userId, selectedSession);
                  setSelectedSession(null);
                  navigate('/workout');
                }}
                className="font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Workout</span>
              </Button>

              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full text-center text-xs font-bold text-[var(--danger)] hover:opacity-80 py-2 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete this workout</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Strength Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Workout Session?"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--danger)]/15 border border-[var(--danger)]/30 flex items-center justify-center shrink-0 text-[var(--danger)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[var(--text-main)]">Confirm Deletion</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Are you sure you want to delete this workout from your history? If this was today's workout, today's completion status will be cleared. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="font-bold"
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="md"
              fullWidth
              disabled={isDeleting}
              onClick={handleDeleteSession}
              className="font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Delete Workout'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Log / Edit Cardio Modal */}
      <LogCardioModal
        isOpen={isLogCardioOpen}
        onClose={() => {
          setIsLogCardioOpen(false);
          setCardioToEdit(null);
        }}
        sessionToEdit={cardioToEdit}
      />

      {/* Cardio Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteCardioConfirmOpen}
        onClose={() => {
          setIsDeleteCardioConfirmOpen(false);
          setCardioToDelete(null);
        }}
        title="Delete Cardio Session?"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--danger)]/15 border border-[var(--danger)]/30 flex items-center justify-center shrink-0 text-[var(--danger)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[var(--text-main)]">Confirm Deletion</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Are you sure you want to delete this cardio session from your history? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              disabled={isDeletingCardio}
              onClick={() => {
                setIsDeleteCardioConfirmOpen(false);
                setCardioToDelete(null);
              }}
              className="font-bold"
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="md"
              fullWidth
              disabled={isDeletingCardio}
              onClick={handleDeleteCardioConfirm}
              className="font-bold"
            >
              {isDeletingCardio ? 'Deleting...' : 'Delete Session'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
