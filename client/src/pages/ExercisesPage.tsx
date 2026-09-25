import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { ExerciseFilter } from '../components/exercises/ExerciseFilter';
import { ExerciseLibraryCard } from '../components/exercises/ExerciseLibraryCard';
import { ExerciseDetail } from '../components/exercises/ExerciseDetail';
import { AddExerciseSheet } from '../components/workout/AddExerciseSheet';
import { Button } from '../components/ui/Button';
import { useWorkoutStore } from '../store/workoutStore';
import { Exercise, MuscleGroup, Equipment, ExerciseType } from '../types';

export const ExercisesPage: React.FC = () => {
  const { exercises, addExerciseToWorkout, activeSession } = useWorkoutStore();

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ExerciseType | 'all'>('all');

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  const filteredExercises = exercises.filter((ex) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      ex.name.toLowerCase().includes(query) ||
      ex.primaryMuscle.toLowerCase().includes(query) ||
      ex.tags.some((t) => t.toLowerCase().includes(query)) ||
      ex.muscleAreaEmphasis.some((area) => area.replace(/_/g, ' ').toLowerCase().includes(query));

    const matchesMuscle = selectedMuscle === 'all' || ex.primaryMuscle === selectedMuscle;
    const matchesEquipment = selectedEquipment === 'all' || ex.equipment === selectedEquipment;
    const matchesType = selectedType === 'all' || ex.exerciseType === selectedType;

    return matchesSearch && matchesMuscle && matchesEquipment && matchesType;
  });

  const handleOpenDetail = (ex: Exercise) => {
    setSelectedExercise(ex);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-3 max-w-full overflow-x-hidden">
      <Header
        title="Exercise Library"
        subtitle={`${filteredExercises.length} Exercises`}
      />

      {/* Exercise Filters */}
      <ExerciseFilter
        search={search}
        onSearchChange={setSearch}
        selectedMuscle={selectedMuscle}
        onMuscleChange={setSelectedMuscle}
        selectedEquipment={selectedEquipment}
        onEquipmentChange={setSelectedEquipment}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />

      {/* Visual Exercise Cards Grid (2-column on iPhone) */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredExercises.map((ex) => (
          <ExerciseLibraryCard
            key={ex.id}
            exercise={ex}
            onSelectDetail={handleOpenDetail}
            onAddToWorkout={activeSession ? addExerciseToWorkout : undefined}
          />
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-[#121827]">
          <p className="text-xs font-semibold text-slate-400 mb-2">No exercises match your filter</p>
          <Button variant="secondary" size="sm" onClick={() => setIsAddCustomOpen(true)}>
            + Create Custom Exercise
          </Button>
        </div>
      )}

      {/* Exercise Detail Modal */}
      <ExerciseDetail
        exercise={selectedExercise}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onAddToWorkout={activeSession ? addExerciseToWorkout : undefined}
      />

      {/* Add Custom Exercise Sheet */}
      <AddExerciseSheet
        isOpen={isAddCustomOpen}
        onClose={() => setIsAddCustomOpen(false)}
        onSelectExercise={(ex) => {
          if (activeSession) addExerciseToWorkout(ex);
        }}
      />
    </div>
  );
};
