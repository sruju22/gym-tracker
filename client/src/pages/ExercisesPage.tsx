import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { ExerciseFilter } from '../components/exercises/ExerciseFilter';
import { ExerciseLibraryCard } from '../components/exercises/ExerciseLibraryCard';
import { ExerciseDetail } from '../components/exercises/ExerciseDetail';
import { AddExerciseSheet } from '../components/workout/AddExerciseSheet';
import { EditCustomExerciseModal } from '../components/exercises/EditCustomExerciseModal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { Button } from '../components/ui/Button';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { Exercise, MuscleGroup, Equipment, ExerciseType } from '../types';
import { matchExerciseSearch, scoreExerciseSearch } from '../utils/search';
import { Plus } from 'lucide-react';

export const ExercisesPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const {
    getExercises,
    addExerciseToWorkout,
    getActiveSession,
    updateCustomExercise,
    deleteCustomExercise,
  } = useWorkoutStore();

  const exercises = getExercises(userId);
  const activeSession = getActiveSession(userId);

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ExerciseType | 'all'>('all');

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  // Edit / Delete State
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const filteredExercises = exercises
    .filter((ex) => {
      const query = search.trim();
      const matchesSearch = matchExerciseSearch(ex, query);
      const matchesMuscle = selectedMuscle === 'all' || ex.primaryMuscle === selectedMuscle;
      const matchesEquipment = selectedEquipment === 'all' || ex.equipment === selectedEquipment;
      const matchesType = selectedType === 'all' || ex.exerciseType === selectedType;

      return matchesSearch && matchesMuscle && matchesEquipment && matchesType;
    })
    .sort((a, b) => {
      const query = search.trim();
      if (!query) return 0;
      return scoreExerciseSearch(b, query) - scoreExerciseSearch(a, query);
    });

  const handleOpenDetail = (ex: Exercise) => {
    setSelectedExercise(ex);
    setIsDetailOpen(true);
  };

  const handleStartEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setIsEditModalOpen(true);
  };

  const handleStartDelete = (ex: Exercise) => {
    setDeletingExercise(ex);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingExercise) {
      deleteCustomExercise(userId, deletingExercise.id);
      setIsDeleteModalOpen(false);
      setDeletingExercise(null);
    }
  };

  return (
    <div className="space-y-3 max-w-full overflow-x-hidden pb-12">
      <div className="flex items-center justify-between">
        <Header
          title="Exercise Library"
          subtitle={`${filteredExercises.length} Exercises`}
        />
      </div>

      <div className="flex justify-end px-1">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddCustomOpen(true)}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Exercise</span>
        </Button>
      </div>

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

      {/* Visual Exercise Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredExercises.map((ex) => (
          <ExerciseLibraryCard
            key={ex.id}
            exercise={ex}
            onSelectDetail={handleOpenDetail}
            onAddToWorkout={
              activeSession ? (exercise) => addExerciseToWorkout(userId, exercise) : undefined
            }
          />
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-10 border border-dashed border-[#272B30] rounded-2xl bg-[#14171A]">
          <p className="text-xs font-semibold text-[#9CA3AF] mb-2">No exercises match your filter</p>
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
        onAddToWorkout={
          activeSession ? (exercise) => addExerciseToWorkout(userId, exercise) : undefined
        }
        onEditCustom={handleStartEdit}
        onDeleteCustom={handleStartDelete}
      />

      {/* Edit Custom Exercise Modal */}
      <EditCustomExerciseModal
        isOpen={isEditModalOpen}
        exercise={editingExercise}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingExercise(null);
        }}
        onSave={(updatedData) => {
          if (editingExercise) {
            updateCustomExercise(userId, editingExercise.id, updatedData);
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Custom Exercise"
        message={`Are you sure you want to delete "${deletingExercise?.name}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingExercise(null);
        }}
      />

      {/* Add Custom Exercise Sheet */}
      <AddExerciseSheet
        isOpen={isAddCustomOpen}
        onClose={() => setIsAddCustomOpen(false)}
        onSelectExercise={(ex) => {
          if (activeSession) addExerciseToWorkout(userId, ex);
        }}
      />
    </div>
  );
};
