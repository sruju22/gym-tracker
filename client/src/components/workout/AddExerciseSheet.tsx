import React, { useState, useEffect, useMemo } from 'react';
import { Dumbbell, BookOpen, Sparkles, Plus, Check, Info } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { FilterChip } from '../ui/FilterChip';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Exercise, MuscleGroup, MuscleArea, Equipment, ExerciseType, PersonalRecord } from '../../types';
import { MUSCLE_GROUPS, getMuscleAreaName } from '../../data/muscleGroups';
import { getLegSection, isLegSubArea } from '../../utils/legSection';
import { matchExerciseSearch, scoreExerciseSearch } from '../../utils/search';
import { getRecommendedExercises, ScoredRecommendation } from '../../utils/recommendationEngine';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface AddExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  targetMuscleGroup?: MuscleGroup;
  targetSubAreas?: MuscleArea[];
  targetSectionName?: string;
  onBrowseLibrary?: () => void;
}

const EMPTY_PERSONAL_RECORDS: PersonalRecord[] = [];

export const AddExerciseSheet: React.FC<AddExerciseSheetProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
  targetMuscleGroup,
  targetSubAreas,
  targetSectionName,
  onBrowseLibrary,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const {
    getExercises,
    addCustomExercise,
    getActiveSession,
    getEditingSession,
    getHistory,
    settings,
  } = useWorkoutStore();

  const exercises = getExercises(userId);
  const currentSession = getEditingSession(userId) || getActiveSession(userId);
  const currentExercises = currentSession?.exercises || [];
  const rawPastSessions = getHistory(userId);
  const userRecords = useWorkoutStore((state) => state.userDataMap[userId]?.personalRecords);
  const personalRecords = userRecords || EMPTY_PERSONAL_RECORDS;
  const rotationWindowDays = settings?.rotationWindowDays || 30;

  // Sanitize past sessions: exclude the workout currently being edited or active so it is not treated as past history
  const pastSessions = useMemo(() => {
    if (!currentSession?.id) return rawPastSessions;
    return rawPastSessions.filter(
      (s) =>
        s.id !== currentSession.id &&
        (!currentSession.clientSessionId || s.clientSessionId !== currentSession.clientSessionId)
    );
  }, [rawPastSessions, currentSession?.id, currentSession?.clientSessionId]);

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    targetMuscleGroup || 'all'
  );
  const [selectedSubArea, setSelectedSubArea] = useState<MuscleArea | 'all'>('all');
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>('recommended');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedMuscle(targetMuscleGroup || 'all');
      setSelectedSubArea('all');
      setSearch('');
      setActiveTab('recommended');
    }
  }, [isOpen, targetMuscleGroup]);

  // Custom Exercise Form state
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>(targetMuscleGroup || 'chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('dumbbell');
  const [customType, setCustomType] = useState<ExerciseType>('isolation');
  const [customArea, setCustomArea] = useState<MuscleArea>('mid_chest');

  const targetLegKey = isLegSubArea(targetSubAreas, targetSectionName);
  const trimmedSearch = search.trim();

  // Calculate intelligent recommendations
  const recommendations: ScoredRecommendation[] = useMemo(() => {
    return getRecommendedExercises({
      targetMuscleGroup: selectedMuscle !== 'all' ? selectedMuscle : targetMuscleGroup,
      targetSubAreas: selectedSubArea !== 'all' ? [selectedSubArea] : targetSubAreas,
      targetSectionName,
      currentExercises,
      currentSessionId: currentSession?.id,
      allExercises: exercises,
      pastSessions,
      personalRecords,
      userGoal: currentUser?.fitnessGoal,
      equipmentPreference: currentUser?.equipmentPreference,
      experienceLevel: currentUser?.experienceLevel,
      rotationWindowDays,
      maxRecommendations: 5,
    });
  }, [
    selectedMuscle,
    selectedSubArea,
    targetMuscleGroup,
    targetSubAreas,
    targetSectionName,
    currentExercises,
    currentSession?.id,
    exercises,
    pastSessions,
    personalRecords,
    currentUser?.fitnessGoal,
    currentUser?.equipmentPreference,
    currentUser?.experienceLevel,
    rotationWindowDays,
  ]);

  // Filtered exercises for the full library tab / search
  const filteredExercises = useMemo(() => {
    return exercises
      .filter((ex) => {
        const matchesSearch = matchExerciseSearch(ex, trimmedSearch);

        if (
          targetLegKey &&
          (selectedMuscle === 'all' || selectedMuscle === targetMuscleGroup) &&
          selectedSubArea === 'all'
        ) {
          return matchesSearch && getLegSection(ex) === targetLegKey;
        }

        let matchesMuscle = true;
        if (selectedMuscle !== 'all') {
          matchesMuscle =
            ex.primaryMuscle === selectedMuscle ||
            (ex.secondaryMuscles && ex.secondaryMuscles.includes(selectedMuscle));
        }

        let matchesSubArea = true;
        if (selectedSubArea !== 'all') {
          matchesSubArea = ex.muscleAreaEmphasis.includes(selectedSubArea);
        }

        return matchesSearch && matchesMuscle && matchesSubArea;
      })
      .sort((a, b) => {
        if (!trimmedSearch) return 0;
        return scoreExerciseSearch(b, trimmedSearch) - scoreExerciseSearch(a, trimmedSearch);
      });
  }, [exercises, trimmedSearch, targetLegKey, selectedMuscle, targetMuscleGroup, selectedSubArea]);

  const handleCreateCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEx = addCustomExercise(userId, {
      name: customName,
      primaryMuscle: customMuscle,
      muscleAreaEmphasis: [customArea],
      equipment: customEquipment,
      exerciseType: customType,
    });

    onSelectExercise(newEx);
    setShowCreateCustom(false);
    setCustomName('');
    onClose();
  };

  const handleSelect = (ex: Exercise) => {
    onSelectExercise(ex);
    onClose();
  };

  // Determine whether to show search results immediately
  const isSearching = trimmedSearch.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={targetSectionName ? `Add ${targetSectionName} Exercise` : 'Add Exercise'}
    >
      {!showCreateCustom ? (
        <div className="space-y-3">
          {/* Search bar */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search exercises, muscles, equipment..."
          />

          {/* Muscle filter horizontal scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <FilterChip
              label="All Muscles"
              active={selectedMuscle === 'all'}
              onClick={() => {
                setSelectedMuscle('all');
                setSelectedSubArea('all');
              }}
            />
            {Object.values(MUSCLE_GROUPS).map((mg) => (
              <FilterChip
                key={mg.id}
                label={mg.name}
                active={selectedMuscle === mg.id}
                onClick={() => {
                  setSelectedMuscle(mg.id);
                  setSelectedSubArea('all');
                }}
              />
            ))}
          </div>

          {/* Sub-area filter chips */}
          {selectedMuscle !== 'all' && MUSCLE_GROUPS[selectedMuscle]?.areas && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-[var(--border-subtle)]">
              <FilterChip
                label="All Target Areas"
                active={selectedSubArea === 'all'}
                onClick={() => setSelectedSubArea('all')}
              />
              {MUSCLE_GROUPS[selectedMuscle].areas.map((area) => (
                <FilterChip
                  key={area.id}
                  label={area.name}
                  active={selectedSubArea === area.id}
                  onClick={() => setSelectedSubArea(area.id)}
                />
              ))}
            </div>
          )}

          {/* View Mode Toggle: Recommended vs All Library (when not actively searching) */}
          {!isSearching && (
            <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setActiveTab('recommended')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'recommended'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Recommended ({recommendations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[var(--bg-surface)] text-white shadow-sm border border-[var(--border-subtle)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>All Exercises ({filteredExercises.length})</span>
              </button>
            </div>
          )}

          {/* Action: Create Custom Exercise */}
          <button
            onClick={() => setShowCreateCustom(true)}
            className="w-full bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] rounded-xl p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-black text-xs">
                +
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-main)]">Create Custom Exercise</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Add to your personal library</div>
              </div>
            </div>
          </button>

          {/* TAB CONTENT: RECOMMENDATIONS */}
          {!isSearching && activeTab === 'recommended' && (
            <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
              {recommendations.length > 0 ? (
                recommendations.map((rec, index) => {
                  const ex = rec.exercise;
                  const isFirstPick = index === 0;

                  return (
                    <div
                      key={ex.id}
                      className={`bg-[var(--bg-surface)] rounded-xl p-3 border transition-all ${
                        isFirstPick
                          ? 'border-red-500/50 shadow-[0_4px_16px_rgba(220,38,38,0.12)]'
                          : 'border-[var(--border-subtle)] hover:border-white/20'
                      }`}
                    >
                      {/* Top Header: Exercise Name & Score Tag */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {!imgErrors[ex.id] ? (
                            <img
                              src={ex.imageUrl}
                              alt={ex.name}
                              loading="lazy"
                              className="w-11 h-11 rounded-lg object-cover bg-[var(--bg-card)] border border-[var(--border-subtle)] shrink-0"
                              onError={() => setImgErrors((prev) => ({ ...prev, [ex.id]: true }))}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                              <Dumbbell className="w-4 h-4 opacity-40" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-[var(--text-main)] truncate">
                              {ex.name}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] capitalize truncate mt-0.5">
                              {ex.primaryMuscle} • {ex.equipmentName || ex.equipment} • {ex.exerciseType}
                            </div>
                          </div>
                        </div>

                        {/* Match indicator */}
                        <div className="shrink-0 flex flex-col items-end">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isFirstPick
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-white/10 text-zinc-300 border border-white/10'
                            }`}
                          >
                            Match score: {rec.score}
                          </span>
                        </div>
                      </div>

                      {/* Evidence Badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rec.explanation.badges.map((b) => (
                          <span
                            key={b}
                            className="bg-black/30 border border-white/10 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      {/* Trainer Rationale */}
                      <div className="bg-[#0e1017] rounded-lg p-2 border border-white/5 mb-2.5">
                        <div className="flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" />
                          <p className="text-[11px] text-zinc-300 leading-snug">
                            {rec.explanation.primary}
                          </p>
                        </div>

                        {rec.explanation.factors.lastRecordedPerformance && (
                          <div className="text-[10px] font-semibold text-emerald-400 mt-1 pl-5">
                            Previous best: {rec.explanation.factors.lastRecordedPerformance}
                          </div>
                        )}
                      </div>

                      {/* Explicit Add Action */}
                      <button
                        type="button"
                        onClick={() => handleSelect(ex)}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add to Workout</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 px-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                  <Sparkles className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[var(--text-main)]">
                    No recommendations found for this section.
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 mb-3">
                    You may have already added all matching exercises to today's workout.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="text-xs text-[var(--primary)] font-bold hover:underline cursor-pointer"
                  >
                    Browse full exercise library →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: ALL EXERCISES / SEARCH RESULTS */}
          {(isSearching || activeTab === 'all') && (
            <div className="space-y-1.5 max-h-[48vh] overflow-y-auto pr-1">
              {filteredExercises.length > 0 ? (
                filteredExercises.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => handleSelect(ex)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      {!imgErrors[ex.id] ? (
                        <img
                          src={ex.imageUrl}
                          alt={ex.name}
                          loading="lazy"
                          className="w-10 h-10 rounded-lg object-cover bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                          onError={() => setImgErrors((prev) => ({ ...prev, [ex.id]: true }))}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                          <Dumbbell className="w-4 h-4 opacity-40" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)]">{ex.name}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] capitalize">
                          {ex.primaryMuscle} • {ex.muscleAreaEmphasis.map((a) => getMuscleAreaName(a)).join(', ')} • {ex.equipmentName || ex.equipment}
                        </div>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--primary)] flex items-center justify-center font-black text-xs shrink-0">
                      +
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[var(--text-secondary)] py-6 text-center font-medium">
                  No matching exercises found in library.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Create Custom Exercise Form */
        <form onSubmit={handleCreateCustomSubmit} className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase">New Custom Exercise</h4>
            <button
              type="button"
              onClick={() => setShowCreateCustom(false)}
              className="text-xs text-[var(--primary)] font-semibold hover:opacity-80 cursor-pointer"
            >
              Back to Library
            </button>
          </div>

          <Input
            label="Exercise Name"
            placeholder="e.g. Incline Cable Press"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
              Muscle Group
            </label>
            <select
              value={customMuscle}
              onChange={(e) => {
                const mg = e.target.value as MuscleGroup;
                setCustomMuscle(mg);
                const info = MUSCLE_GROUPS[mg];
                if (info && info.areas.length > 0) {
                  setCustomArea(info.areas[0].id);
                }
              }}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              {Object.values(MUSCLE_GROUPS).map((mg) => (
                <option key={mg.id} value={mg.id}>
                  {mg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
              Muscle Area Emphasis
            </label>
            <select
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value as MuscleArea)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              {(MUSCLE_GROUPS[customMuscle]?.areas || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                Equipment
              </label>
              <select
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value as Equipment)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="barbell">Barbell</option>
                <option value="dumbbell">Dumbbell</option>
                <option value="cable">Cable</option>
                <option value="machine">Machine</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="ez_bar">EZ-Bar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                Exercise Type
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as ExerciseType)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
                <option value="machine">Machine</option>
                <option value="cable">Cable</option>
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth size="md">
            Save & Add to Workout
          </Button>
        </form>
      )}
    </Modal>
  );
};
