import React from 'react';
import { Check, Award } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { useNavigate } from 'react-router-dom';

interface WorkoutSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { activeSession, finishWorkout, personalRecords } = useWorkoutStore();

  if (!activeSession) return null;

  let totalVolume = 0;
  let totalCompletedSets = 0;
  activeSession.exercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (s.completed && s.weight && s.reps) {
        totalVolume += s.weight * s.reps;
        totalCompletedSets++;
      }
    });
  });

  const handleFinish = () => {
    finishWorkout();
    onClose();
    navigate('/');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workout Summary">
      <div className="text-center py-2 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">
            Workout Complete
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Your workout session data has been recorded.
          </p>
        </div>

        {/* Key Metrics grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Exercises</div>
            <div className="text-lg font-black text-slate-100">{activeSession.exercises.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Sets</div>
            <div className="text-lg font-black text-slate-100">{totalCompletedSets}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Volume</div>
            <div className="text-lg font-black text-sky-400">{totalVolume} kg</div>
          </div>
        </div>

        {/* PR Alert if achieved */}
        {personalRecords.length > 0 && (
          <div className="bg-amber-950/60 border border-amber-800/60 rounded-xl p-3 flex items-center gap-2.5 text-left">
            <Award className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-amber-400 uppercase">
                New Personal Record
              </div>
              <div className="text-xs text-slate-200 font-semibold">
                {personalRecords[personalRecords.length - 1].exerciseName}: {personalRecords[personalRecords.length - 1].details}
              </div>
            </div>
          </div>
        )}

        <Button variant="success" size="lg" fullWidth onClick={handleFinish}>
          <Check className="w-5 h-5 mr-2 stroke-[3]" />
          <span>SAVE WORKOUT SESSION</span>
        </Button>
      </div>
    </Modal>
  );
};
