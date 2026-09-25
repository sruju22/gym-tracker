import React from 'react';
import { Award, Dumbbell } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useWorkoutStore } from '../store/workoutStore';
import { formatDateShort } from '../utils/formatters';

export const ProgressPage: React.FC = () => {
  const { history, personalRecords } = useWorkoutStore();

  const totalVolume = history.reduce((acc, h) => acc + h.totalVolume, 0);
  const totalSets = history.reduce((acc, h) => acc + h.totalSets, 0);

  // Exercise frequency calculation (Section 23)
  const frequencyMap: Record<string, number> = {};
  history.forEach((session) => {
    session.exercises.forEach((ex) => {
      frequencyMap[ex.exercise.name] = (frequencyMap[ex.exercise.name] || 0) + 1;
    });
  });

  const sortedFrequency = Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="w-full max-w-full min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-5">
      <Header title="Progress & Stats" subtitle="Personal Records & History" />

      {/* Main Stats Summary Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <Card className="bg-[#121827] border-slate-800 p-4">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            Total Sessions
          </div>
          <div className="text-3xl font-black text-slate-100">{history.length}</div>
          <div className="text-[11px] text-sky-400 font-semibold mt-0.5">{totalSets} total sets</div>
        </Card>

        <Card className="bg-[#121827] border-slate-800 p-4">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            Volume Lifted
          </div>
          <div className="text-3xl font-black text-sky-400">
            {Math.round(totalVolume / 1000)}k <span className="text-sm font-normal text-slate-400">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">Lifetime total</div>
        </Card>
      </div>

      {/* Personal Records (PR) Wall (Section 18) */}
      <Card className="flex-1 flex flex-col justify-between bg-[#121827] border-slate-800 p-4 sm:p-5 rounded-2xl min-h-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                Personal Records
              </h3>
            </div>
            <Badge variant="warning">{personalRecords.length} Hit</Badge>
          </div>

          <div className="space-y-2">
            {personalRecords.map((pr) => (
              <div
                key={pr.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-black text-slate-100">{pr.exerciseName}</div>
                  <div className="text-[11px] text-amber-400 font-semibold">{pr.details}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-sky-400">{pr.value} kg</div>
                  <div className="text-[10px] text-slate-500">{formatDateShort(pr.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Exercise Frequency List (Section 23) */}
      <Card className="flex-1 flex flex-col justify-between bg-[#121827] border-slate-800 p-4 sm:p-5 rounded-2xl min-h-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                Monthly Frequency
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Top 5</span>
          </div>

          <div className="space-y-2">
            {sortedFrequency.map(([name, count]) => (
              <div
                key={name}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-slate-200">{name}</span>
                <span className="text-xs font-black bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2.5 py-0.5 rounded-md">
                  {count} sessions
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
