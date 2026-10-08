import React, { useState, useEffect } from 'react';
import { Exercise, WorkoutSession } from '../../types';
import { Card } from '../ui/Card';
import { formatDateShort } from '../../utils/formatters';
import { TrendingUp, BarChart2 } from 'lucide-react';
import {
  fetchExerciseProgressApi,
  fetchVolumeTrendApi,
  StrengthTimelinePoint,
  VolumeTrendPoint,
} from '../../api/progressApi';

interface ProgressionChartProps {
  history: WorkoutSession[];
  exercises: Exercise[];
}

export const ProgressionChart: React.FC<ProgressionChartProps> = ({ history, exercises }) => {
  const completedSessions = history
    .filter((h) => h.status === 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Collect exercises that have performance data in completed sessions
  const performedExerciseIds = new Set<string>();
  completedSessions.forEach((s) => {
    s.exercises.forEach((ex) => performedExerciseIds.add(ex.exerciseId));
  });

  const availableExercises = exercises.filter((ex) => performedExerciseIds.has(ex.id));

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    availableExercises[0]?.id || exercises[0]?.id || 'ex_bench_press'
  );

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  const [backendStrengthPoints, setBackendStrengthPoints] = useState<StrengthTimelinePoint[] | null>(null);
  const [backendVolumePoints, setBackendVolumePoints] = useState<VolumeTrendPoint[] | null>(null);

  useEffect(() => {
    fetchVolumeTrendApi()
      .then((res) => {
        if (res && Array.isArray(res.volumeTrend)) {
          setBackendVolumePoints(res.volumeTrend);
        }
      })
      .catch((err) => console.warn('Failed to fetch volume trend from backend:', err));
  }, [history]);

  useEffect(() => {
    if (selectedExerciseId) {
      fetchExerciseProgressApi(selectedExerciseId)
        .then((res) => {
          if (res && Array.isArray(res.strengthTimeline)) {
            setBackendStrengthPoints(res.strengthTimeline);
          }
        })
        .catch((err) => console.warn('Failed to fetch exercise strength progress from backend:', err));
    }
  }, [selectedExerciseId, history]);

  const strengthDataPoints = (backendStrengthPoints || []).map((pt) => ({
    date: pt.date,
    maxWeight: pt.maxWeight,
    est1RM: pt.estimated1RM,
  }));

  const volumeDataPoints = (backendVolumePoints || []).map((pt) => ({
    date: pt.date,
    volume: pt.totalVolume,
    workoutName: pt.workoutName,
  }));

  if (volumeDataPoints.length < 2 && strengthDataPoints.length < 2) {
    return (
      <Card className="bg-[#14171A] border-[#272B30] p-6 text-center rounded-2xl">
        <TrendingUp className="w-8 h-8 text-[#6B7280] mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-black text-[#F5F5F5] uppercase">Progression Analytics</h4>
        <p className="text-xs text-[#9CA3AF] mt-1 max-w-xs mx-auto leading-relaxed">
          Complete more workouts to see your strength and volume progression graphs over time!
        </p>
      </Card>
    );
  }

  // Render SVG Line Chart for Strength
  const maxWeightVal = strengthDataPoints.length > 0 ? Math.max(...strengthDataPoints.map((d) => d.maxWeight)) : 100;
  const minWeightVal = strengthDataPoints.length > 0 ? Math.min(...strengthDataPoints.map((d) => d.maxWeight)) : 0;
  const range = maxWeightVal - minWeightVal || 10;

  const chartHeight = 120;
  const chartWidth = 300;

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* 1. Exercise Strength Progression Chart */}
      <Card className="bg-[#14171A] border-[#272B30] p-4 sm:p-5 rounded-2xl space-y-3 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <TrendingUp className="w-4 h-4 text-[#E11D48] shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5] uppercase tracking-wide truncate">
              Strength Progression
            </h3>
          </div>

          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="bg-[#1B1F23] border border-[#272B30] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48] max-w-[140px] xs:max-w-[180px] sm:max-w-[240px] truncate cursor-pointer shrink-0"
          >
            {availableExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        {strengthDataPoints.length > 0 ? (
          <div className="min-w-0 space-y-2">
            <div className="text-[11px] text-[#9CA3AF] leading-relaxed break-words">
              Showing max weight lifted per session for{' '}
              <span className="text-[#F5F5F5] font-bold inline">{selectedExercise?.name}</span>
            </div>

            {/* Responsive SVG Chart */}
            <div className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 overflow-hidden">
              <svg
                viewBox="0 0 320 150"
                className="w-full h-auto max-h-44 shrink-0 overflow-hidden"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid lines */}
                <line x1="20" y1="24" x2="300" y2="24" stroke="#272B30" strokeDasharray="3 3" />
                <line x1="20" y1="74" x2="300" y2="74" stroke="#272B30" strokeDasharray="3 3" />
                <line x1="20" y1="124" x2="300" y2="124" stroke="#272B30" strokeDasharray="3 3" />

                {/* Plot Points & Lines */}
                {strengthDataPoints.map((pt, i) => {
                  const chartWidth = 320;
                  const chartHeight = 150;
                  const paddingTop = 24;
                  const paddingBottom = 26;
                  const paddingLeft = 28;
                  const paddingRight = 28;
                  const graphWidth = chartWidth - paddingLeft - paddingRight;
                  const graphHeight = chartHeight - paddingTop - paddingBottom;

                  const weights = strengthDataPoints.map((d) => d.maxWeight);
                  const rawMax = Math.max(...weights);
                  const rawMin = Math.min(...weights);
                  const weightRange = rawMax - rawMin;
                  const maxVal = rawMax + Math.max(weightRange * 0.15, 2);
                  const minVal = Math.max(0, rawMin - Math.max(weightRange * 0.15, 2));
                  const valRange = maxVal - minVal || 1;

                  const x =
                    paddingLeft +
                    (strengthDataPoints.length > 1
                      ? (i / (strengthDataPoints.length - 1)) * graphWidth
                      : graphWidth / 2);

                  const y =
                    paddingTop +
                    graphHeight -
                    ((pt.maxWeight - minVal) / valRange) * graphHeight;

                  const prevPt = strengthDataPoints[i - 1];
                  let prevX = x;
                  let prevY = y;
                  if (prevPt) {
                    prevX =
                      paddingLeft +
                      ((i - 1) / (strengthDataPoints.length - 1)) * graphWidth;
                    prevY =
                      paddingTop +
                      graphHeight -
                      ((prevPt.maxWeight - minVal) / valRange) * graphHeight;
                  }

                  // Alternating label positioning to avoid adjacent label collisions
                  const isAlternated = i % 2 === 1 && strengthDataPoints.length > 3;
                  const labelY = isAlternated
                    ? Math.min(y + 15, chartHeight - paddingBottom - 4)
                    : Math.max(y - 7, paddingTop - 4);

                  // Show date label on every point if <= 6 points, otherwise start, middle, end
                  const totalPts = strengthDataPoints.length;
                  const showDate =
                    totalPts <= 6 ||
                    i === 0 ||
                    i === totalPts - 1 ||
                    (totalPts > 6 && i === Math.floor(totalPts / 2));

                  return (
                    <g key={i}>
                      {i > 0 && (
                        <line
                          x1={prevX}
                          y1={prevY}
                          x2={x}
                          y2={y}
                          stroke="#E11D48"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      )}
                      <circle cx={x} cy={y} r="4" fill="#E11D48" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text
                        x={x}
                        y={labelY}
                        textAnchor="middle"
                        fill="#F5F5F5"
                        fontSize="9.5"
                        fontWeight="bold"
                      >
                        {pt.maxWeight}kg
                      </text>
                      {showDate && (
                        <text
                          x={x}
                          y={chartHeight - 6}
                          textAnchor="middle"
                          fill="#6B7280"
                          fontSize="8.5"
                          fontWeight="600"
                        >
                          {formatDateShort(pt.date)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-[#9CA3AF] bg-[#1B1F23] rounded-xl border border-[#272B30]">
            No completed performance data yet for {selectedExercise?.name}.
          </div>
        )}
      </Card>

      {/* 2. Total Volume Trend Chart */}
      <Card className="bg-[#14171A] border-[#272B30] p-4 sm:p-5 rounded-2xl space-y-3 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-[#E11D48] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5] uppercase tracking-wide">
            Volume Lifted Trend
          </h3>
        </div>

        <div className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 sm:p-4 overflow-hidden">
          <div className="flex items-end justify-between h-28 pt-4 gap-1.5 min-w-0">
            {volumeDataPoints.map((pt, i) => {
              const maxVol = Math.max(...volumeDataPoints.map((v) => v.volume), 1000);
              const heightPercent = Math.max(15, Math.round((pt.volume / maxVol) * 100));

              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group min-w-0">
                  <div className="text-[9px] font-black text-[#E11D48] mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {pt.volume}kg
                  </div>
                  <div
                    className="w-full max-w-[28px] bg-[#E11D48] rounded-t-lg transition-all duration-300 hover:bg-[#F43F5E]"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <div className="text-[8px] font-bold text-[#6B7280] mt-1 truncate max-w-[36px]">
                    {formatDateShort(pt.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};
