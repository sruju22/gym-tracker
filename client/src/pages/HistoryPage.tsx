import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { formatDateShort, formatDayName } from '../utils/formatters';
import { WorkoutSession } from '../types';

export const HistoryPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const { getHistory } = useWorkoutStore();
  const history = getHistory(userId);

  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  return (
    <div className="space-y-3 pb-12">
      <Header title="Workout History" subtitle={`${history.length} Saved Sessions`} />

      <div className="space-y-2">
        {history.map((session) => (
          <Card
            key={session.id}
            hoverable
            onClick={() => setSelectedSession(session)}
            className="flex items-center justify-between border border-[#272B30] bg-[#14171A]"
          >
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-[#E11D48]">
                  {formatDateShort(session.date)}
                </span>
                <span className="text-xs text-[#6B7280]">•</span>
                <span className="text-xs text-[#9CA3AF] font-medium capitalize">
                  {formatDayName(session.dayOfWeek)}
                </span>
              </div>

              <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-tight mb-1">
                {session.workoutName || session.muscleGroups.join(' + ')}
              </h3>

              <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF] font-medium">
                <span>{session.exercises.length} exercises</span>
                <span>•</span>
                <span>{session.totalSets} sets</span>
                <span>•</span>
                <span className="text-[#E11D48] font-bold">{session.totalVolume} kg</span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-[#6B7280]" />
          </Card>
        ))}

        {history.length === 0 && (
          <div className="text-center py-10 border border-dashed border-[#272B30] rounded-2xl bg-[#14171A]">
            <p className="text-xs text-[#9CA3AF]">No workouts logged yet. Complete a workout to view history!</p>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          isOpen={Boolean(selectedSession)}
          onClose={() => setSelectedSession(null)}
          title={`${formatDateShort(selectedSession.date)} — ${(selectedSession.workoutName || selectedSession.muscleGroups.join(' + ')).toUpperCase()}`}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 text-center">
              <div>
                <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Exercises</div>
                <div className="text-sm font-black text-[#F5F5F5]">{selectedSession.exercises.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Total Sets</div>
                <div className="text-sm font-black text-[#F5F5F5]">{selectedSession.totalSets}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Volume</div>
                <div className="text-sm font-black text-[#E11D48]">{selectedSession.totalVolume} kg</div>
              </div>
            </div>

            <div className="space-y-2">
              {selectedSession.exercises.map((ex) => (
                <div key={ex.id} className="bg-[#1B1F23] border border-[#272B30] rounded-xl p-3">
                  <div className="text-xs font-bold text-[#F5F5F5] mb-1.5">{ex.exercise.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {ex.sets.map((s, idx) => (
                      <span key={idx} className="bg-[#14171A] border border-[#272B30] px-2 py-0.5 rounded text-[11px] font-semibold text-[#9CA3AF]">
                        Set {s.setNumber}: {s.weight}kg × {s.reps}
                      </span>
                    ))}
                  </div>
                  {ex.notes && (
                    <div className="mt-1.5 text-[11px] text-amber-300 bg-amber-500/15 p-1.5 rounded border border-amber-500/40 italic">
                      "{ex.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
