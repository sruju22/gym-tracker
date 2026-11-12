import React, { useState } from 'react';
import { X, Dumbbell, Info, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number | null;
  exerciseName?: string;
}

interface PlateDef {
  weight: number;
  color: string;
  borderColor: string;
  textColor: string;
  label: string;
  heightClass: string;
}

const AVAILABLE_PLATES: PlateDef[] = [
  { weight: 25, color: 'bg-red-600', borderColor: 'border-red-400', textColor: 'text-white', label: '25', heightClass: 'h-24 sm:h-28' },
  { weight: 20, color: 'bg-blue-600', borderColor: 'border-blue-400', textColor: 'text-white', label: '20', heightClass: 'h-22 sm:h-26' },
  { weight: 15, color: 'bg-yellow-500', borderColor: 'border-yellow-300', textColor: 'text-slate-900', label: '15', heightClass: 'h-20 sm:h-24' },
  { weight: 10, color: 'bg-emerald-600', borderColor: 'border-emerald-400', textColor: 'text-white', label: '10', heightClass: 'h-18 sm:h-21' },
  { weight: 5, color: 'bg-slate-200', borderColor: 'border-slate-400', textColor: 'text-slate-900', label: '5', heightClass: 'h-15 sm:h-17' },
  { weight: 2.5, color: 'bg-neutral-800', borderColor: 'border-neutral-500', textColor: 'text-white', label: '2.5', heightClass: 'h-12 sm:h-14' },
  { weight: 1.25, color: 'bg-zinc-400', borderColor: 'border-zinc-300', textColor: 'text-slate-900', label: '1.25', heightClass: 'h-9 sm:h-11' },
];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialWeight,
  exerciseName = 'Barbell Exercise',
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(() => {
    if (initialWeight && initialWeight > 0) return initialWeight;
    return 60;
  });
  const [barWeight, setBarWeight] = useState<number>(20); // 20kg standard Olympic bar

  if (!isOpen) return null;

  // Calculate plates required per side
  const weightToPlate = Math.max(0, targetWeight - barWeight);
  const weightPerSide = weightToPlate / 2;

  let remaining = weightPerSide;
  const platesPerSide: { plate: PlateDef; count: number }[] = [];

  for (const plate of AVAILABLE_PLATES) {
    if (remaining >= plate.weight - 0.001) {
      const count = Math.floor((remaining + 0.0001) / plate.weight);
      if (count > 0) {
        platesPerSide.push({ plate, count });
        remaining = Math.round((remaining - count * plate.weight) * 100) / 100;
      }
    }
  }

  const remainderUnmatched = remaining > 0 ? remaining : 0;

  const handleAdjustTarget = (delta: number) => {
    triggerHaptic('light');
    setTargetWeight((prev) => Math.max(barWeight, Math.round((prev + delta) * 10) / 10));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-xs">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] truncate">
                Plate Breakdown Helper
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{exerciseName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Target Weight Controls */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
              <span>Target Working Weight</span>
              <span className="text-[10px] text-[var(--text-muted)]">Per Side: {weightPerSide} kg</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(-5)}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(-2.5)}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  -2.5
                </button>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)] font-mono tracking-tight text-center">
                {targetWeight} <span className="text-sm font-bold text-red-500">kg</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(2.5)}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  +2.5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(5)}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Barbell Weight Toggle */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Barbell Type:</span>
              <div className="flex items-center gap-1">
                {[
                  { w: 20, label: '20kg Olympic' },
                  { w: 15, label: '15kg Bar' },
                  { w: 10, label: '10kg EZ Bar' },
                ].map((b) => (
                  <button
                    key={b.w}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setBarWeight(b.w);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      barWeight === b.w
                        ? 'bg-red-500 text-white shadow-2xs'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Barbell Sleeve Representation */}
          <div className="bg-[#121215] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden shadow-inner">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-3">
              One Side of Barbell ({weightPerSide} kg in plates)
            </div>

            {/* The Barbell & Plates */}
            <div className="flex items-center justify-center relative w-full py-2">
              {/* Inner Collar */}
              <div className="w-3 sm:w-4 h-14 bg-zinc-600 rounded-l border-y border-l border-zinc-400 shrink-0 shadow-sm" />
              {/* Sleeve shaft */}
              <div className="h-6 w-12 sm:w-16 bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-400 border-y border-zinc-500 shrink-0" />

              {/* Stacked Plates */}
              <div className="flex items-center gap-1 shrink-0 overflow-x-auto max-w-[240px] px-1 py-2">
                {platesPerSide.length === 0 ? (
                  <span className="text-xs text-zinc-500 italic pl-3">Just the bar (empty)</span>
                ) : (
                  platesPerSide.flatMap(({ plate, count }, pIdx) =>
                    Array.from({ length: count }).map((_, cIdx) => (
                      <div
                        key={`${pIdx}-${cIdx}`}
                        className={`w-4 sm:w-5 ${plate.heightClass} ${plate.color} ${plate.borderColor} ${plate.textColor} rounded-sm border flex items-center justify-center font-black text-[9px] sm:text-[10px] shadow-md select-none shrink-0 transition-transform hover:scale-105`}
                        title={`${plate.label} kg plate`}
                      >
                        <span className="-rotate-90 whitespace-nowrap">{plate.label}</span>
                      </div>
                    ))
                  )
                )}
              </div>

              {/* Outer barbell tip */}
              <div className="h-5 w-4 bg-zinc-500 rounded-r border-y border-r border-zinc-400 shrink-0" />
            </div>

            {remainderUnmatched > 0 && (
              <div className="mt-2 text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>+ {remainderUnmatched} kg remaining (lighter than smallest 1.25kg plate)</span>
              </div>
            )}
          </div>

          {/* Plate Inventory Summary */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-[var(--text-secondary)]">Plates Per Side (Load onto each sleeve):</div>
            {platesPerSide.length === 0 ? (
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-muted)] text-center">
                Empty barbell weight is {barWeight} kg. No extra plates needed!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {platesPerSide.map(({ plate, count }) => (
                  <div
                    key={plate.label}
                    className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${plate.color} border ${plate.borderColor} shrink-0`} />
                      <span className="text-xs font-black text-[var(--text-main)]">{plate.label} kg plate</span>
                    </div>
                    <span className="text-xs font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">
                      × {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
