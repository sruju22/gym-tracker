import React, { useState, useEffect } from 'react';
import { Target, Dumbbell, TrendingUp, TrendingDown, Calendar, Star, Trophy, Search } from 'lucide-react';
import { Goal, GoalType, MuscleGroup } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchBar } from '../ui/SearchBar';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';
import { matchExerciseSearch, scoreExerciseSearch } from '../../utils/search';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface GoalModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (goalData: Partial<Goal>) => Promise<void> | void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, goal, onClose, onSave }) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { getExercises, getExercisePR, getHistory } = useWorkoutStore();
  const exercises = getExercises(userId);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<GoalType>('weight_gain');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [startValue, setStartValue] = useState<number | ''>('');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [unit, setUnit] = useState<'kg' | 'lbs' | 'workouts'>('kg');
  const [targetDate, setTargetDate] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate or reset state on open
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setExerciseSearch('');
    setIsSubmitting(false);

    if (goal) {
      setTitle(goal.title);
      // Map legacy types if present
      let resolvedType = goal.type;
      if ((resolvedType as any) === 'body_weight') {
        resolvedType = goal.targetValue >= goal.startValue ? 'weight_gain' : 'weight_loss';
      } else if ((resolvedType as any) === 'exercise_strength') {
        resolvedType = 'strength';
      }
      setType(resolvedType);
      setSelectedExerciseId(goal.exerciseId || exercises[0]?.id || '');
      setStartValue(goal.startValue);
      setTargetValue(goal.targetValue);
      setUnit(goal.unit);
      setTargetDate(goal.targetDate ? goal.targetDate.slice(0, 10) : '');
      setIsPrimary(Boolean(goal.isPrimary));
      setNotes(goal.notes || '');
    } else {
      // Default to Muscle Building / Weight Gain or Strength
      setType('weight_loss');
      const currentWeight = currentUser?.currentWeight ?? 75;
      const prefUnit = currentUser?.weightUnit || 'kg';
      setTitle('Target Weight Loss');
      setStartValue(currentWeight);
      setTargetValue(Math.max(20, Math.round((currentWeight - 5) * 10) / 10));
      setUnit(prefUnit);
      setSelectedExerciseId(exercises[0]?.id || '');
      setTargetDate('');
      setIsPrimary(false);
      setNotes('');
    }
  }, [isOpen, goal, currentUser]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: GoalType) => {
    setType(newType);
    setError(null);

    const currentWeight = currentUser?.currentWeight ?? 75;
    const prefUnit = currentUser?.weightUnit || 'kg';

    if (newType === 'weight_loss') {
      setTitle('Target Weight Loss');
      setStartValue(currentWeight);
      setTargetValue(Math.max(20, Math.round((currentWeight - 5) * 10) / 10));
      setUnit(prefUnit);
    } else if (newType === 'weight_gain') {
      setTitle('Target Muscle Gain');
      setStartValue(currentWeight);
      setTargetValue(Math.round((currentWeight + 3) * 10) / 10);
      setUnit(prefUnit);
    } else if (newType === 'strength') {
      const ex = exercises.find((e) => e.id === selectedExerciseId) || exercises[0];
      const pr = ex ? getExercisePR(userId, ex.id) : undefined;
      const baseStart = pr ? pr.weight : 50;
      setTitle(`${ex?.name || 'Strength'} Target`);
      setStartValue(baseStart);
      setTargetValue(Math.round((baseStart + 10) * 10) / 10);
      setUnit(prefUnit);
    } else if (newType === 'consistency') {
      const history = getHistory(userId);
      const currentCount = history.length;
      setTitle('Workout Consistency');
      setStartValue(currentCount);
      setTargetValue(currentCount + 20);
      setUnit('workouts');
    }
  };

  const handleExerciseChange = (exId: string) => {
    setSelectedExerciseId(exId);
    const ex = exercises.find((e) => e.id === exId);
    if (ex) {
      const pr = getExercisePR(userId, ex.id);
      setTitle(`${ex.name} Target`);
      if (pr) {
        setStartValue(pr.weight);
        setTargetValue(Math.round((pr.weight + 5) * 10) / 10);
      }
    }
  };

  const trimmedExerciseSearch = exerciseSearch.trim();
  const filteredExercises = exercises
    .filter((ex) => matchExerciseSearch(ex, trimmedExerciseSearch))
    .sort((a, b) => {
      if (!trimmedExerciseSearch) return 0;
      return scoreExerciseSearch(b, trimmedExerciseSearch) - scoreExerciseSearch(a, trimmedExerciseSearch);
    });

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  const selectedExPR = selectedExercise ? getExercisePR(userId, selectedExercise.id) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startValue === '' || targetValue === '') {
      setError('Please provide valid starting and target values.');
      return;
    }

    const sVal = Number(startValue);
    const tVal = Number(targetValue);

    if (isNaN(sVal) || isNaN(tVal)) {
      setError('Values must be numbers.');
      return;
    }

    if (type === 'weight_loss' && tVal >= sVal) {
      setError('For Weight Loss, the target weight must be less than your starting weight.');
      return;
    }

    if (type === 'weight_gain' && tVal <= sVal) {
      setError('For Weight Gain, the target weight must be greater than your starting weight.');
      return;
    }

    if (type === 'strength' && tVal <= sVal) {
      setError('For Strength goals, the target weight must be higher than your starting weight.');
      return;
    }

    if (type === 'consistency' && tVal <= sVal) {
      setError('For Consistency goals, the target workout count must be greater than starting workouts.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSave({
        title: title.trim() || 'Fitness Goal',
        type,
        exerciseId: type === 'strength' ? selectedExerciseId : undefined,
        exerciseName: type === 'strength' ? selectedExercise?.name : undefined,
        startValue: sVal,
        targetValue: tVal,
        unit,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        isPrimary,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving goal:', err);
      setError(err?.message || 'Failed to save goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goal ? 'Edit Fitness Goal' : 'Create Fitness Goal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Goal Type Selection */}
        <div>
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
            Select Goal Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('weight_loss')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                type === 'weight_loss'
                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-main)] shadow-xs'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  type === 'weight_loss' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface)]'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight">Weight Loss</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">Target body cut</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('weight_gain')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                type === 'weight_gain'
                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-main)] shadow-xs'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  type === 'weight_gain' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface)]'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight">Weight Gain</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">Muscle & mass</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('strength')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                type === 'strength'
                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-main)] shadow-xs'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  type === 'strength' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface)]'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight">Strength / PR</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">Exercise lift target</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('consistency')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                type === 'consistency'
                  ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-main)] shadow-xs'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  type === 'consistency' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface)]'
                }`}
              >
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight">Consistency</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">Workout count</div>
              </div>
            </button>
          </div>
        </div>

        {/* Strength Exercise Selection */}
        {type === 'strength' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                Target Exercise
              </label>
              {selectedExPR && (
                <span className="text-[11px] text-amber-400 font-bold">
                  Current PR: {selectedExPR.weight} {unit}
                </span>
              )}
            </div>
            <SearchBar
              value={exerciseSearch}
              onChange={setExerciseSearch}
              placeholder="Search exercise..."
            />
            <div className="max-h-40 overflow-y-auto bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl p-1.5 space-y-1">
              {filteredExercises.length > 0 ? (
                filteredExercises.map((ex) => {
                  const isSelected = ex.id === selectedExerciseId;
                  const muscleMeta = MUSCLE_GROUPS[ex.primaryMuscle as MuscleGroup];
                  const muscleName = muscleMeta ? muscleMeta.name : ex.primaryMuscle;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleExerciseChange(ex.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--primary)] text-white font-bold'
                          : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <span className="truncate pr-2">{ex.name}</span>
                      <span
                        className={`text-[10px] capitalize shrink-0 ${
                          isSelected ? 'text-white/80 font-normal' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {muscleName}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-[var(--text-secondary)] py-4 text-center font-medium">
                  No exercises matched
                </div>
              )}
            </div>
          </div>
        )}

        {/* Title Input */}
        <Input
          label="Goal Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Reach 70kg, Bench 100kg"
          required
        />

        {/* Target & Start Values */}
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label={type === 'consistency' ? 'Starting Count' : 'Starting Value'}
            type="number"
            step={type === 'consistency' ? '1' : '0.5'}
            value={startValue}
            onChange={(e) => setStartValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
            unit={unit}
            required
          />
          <Input
            label={type === 'consistency' ? 'Target Count' : 'Target Value'}
            type="number"
            step={type === 'consistency' ? '1' : '0.5'}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
            unit={unit}
            required
          />
        </div>

        {/* Target Date (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            Target Completion Date <span className="font-normal text-[var(--text-muted)] lowercase">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
            />
            <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>

        {/* Set as Primary Goal Toggle */}
        <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-all">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="w-4 h-4 text-[var(--primary)] rounded border-[var(--border-subtle)] bg-[var(--bg-input)] focus:ring-[var(--primary)] cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Star className={`w-3.5 h-3.5 ${isPrimary ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'}`} />
              <span className="text-xs font-bold text-[var(--text-main)]">Featured Primary Goal</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Highlights this goal at the top of your progress dashboard
            </p>
          </div>
        </label>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            Notes / Strategy <span className="font-normal text-[var(--text-muted)] lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 500 kcal deficit, progressive overload"
            maxLength={100}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 font-bold text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1 font-bold text-xs"
          >
            {isSubmitting ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
