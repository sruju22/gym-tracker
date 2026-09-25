import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useWorkoutStore } from '../store/workoutStore';
import { formatDateShort, formatDayName } from '../utils/formatters';
import { WorkoutSession } from '../types';

export const HistoryPage: React.FC = () => {
  const { history } = useWorkoutStore();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  return (
    <div className="space-y-3">
      <Header title="Workout History" subtitle={`${history.length} Saved Sessions`} />

      <div className="space-y-2">
        {history.map((session) => (
          <Card
            key={session.id}
            hoverable
            onClick={() => setSelectedSession(session)}
            className="flex items-center justify-between border border-slate-800 bg-[#121827]"
          >
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-sky-400">
                  {formatDateShort(session.date)}
                </span>
                <span className="text-xs text-slate-600">•</span>
                <span className="text-xs text-slate-400 font-medium capitalize">
                  {formatDayName(session.dayOfWeek)}
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight mb-1">
                {session.muscleGroups.join(' + ')}
              </h3>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                <span>{session.exercises.length} exercises</span>
                <span>•</span>
                <span>{session.totalSets} sets</span>
                <span>•</span>
                <span className="text-sky-400 font-bold">{session.totalVolume} kg</span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-500" />
          </Card>
        ))}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          isOpen={Boolean(selectedSession)}
          onClose={() => setSelectedSession(null)}
          title={`${formatDateShort(selectedSession.date)} — ${selectedSession.muscleGroups.join(' + ').toUpperCase()}`}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Exercises</div>
                <div className="text-sm font-black text-slate-100">{selectedSession.exercises.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Sets</div>
                <div className="text-sm font-black text-slate-100">{selectedSession.totalSets}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Volume</div>
                <div className="text-sm font-black text-sky-400">{selectedSession.totalVolume} kg</div>
              </div>
            </div>

            <div className="space-y-2">
              {selectedSession.exercises.map((ex) => (
                <div key={ex.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs font-bold text-slate-100 mb-1.5">{ex.exercise.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {ex.sets.map((s, idx) => (
                      <span key={idx} className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-300">
                        Set {s.setNumber}: {s.weight}kg × {s.reps}
                      </span>
                    ))}
                  </div>
                  {ex.notes && (
                    <div className="mt-1.5 text-[11px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-800/60 italic">
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
