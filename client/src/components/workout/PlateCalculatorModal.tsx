import React, { useState } from 'react';
import { X, Dumbbell, Info, Disc, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number | null;
  exerciseName?: string;
  onApplyWeight?: (weight: number) => void;
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
  onApplyWeight,
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

  const handleApply = () => {
    triggerHaptic('success');
    if (onApplyWeight) {
      onApplyWeight(targetWeight);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-xs">
              <Disc className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] truncate">
                Barbell Plate Calculator
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {exerciseName} • Loading guide per sleeve
              </p>
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
        <div className="flex-1 overflow-y-auto py-3.5 space-y-3.5">
          {/* 1. Clear "How this works" explanation box */}
          <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-3 text-xs text-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-extrabold text-white">How Barbell Loading Works: </span>
                A gym barbell weighs <strong>{barWeight} kg</strong> on its own.{' '}
                {weightPerSide === 0 ? (
                  <span>For <strong>{targetWeight} kg</strong>, use just the empty barbell with <strong>no plates</strong>.</span>
                ) : (
                  <span>
                    To reach <strong>{targetWeight} kg</strong>, put{' '}
                    <strong className="text-white bg-blue-500/20 px-1 rounded">{weightPerSide} kg on the left side</strong>{' '}
                    and{' '}
                    <strong className="text-white bg-blue-500/20 px-1 rounded">{weightPerSide} kg on the right side</strong>.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Target Weight Controls */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
              <span>Target Total Weight</span>
              <span className="text-[11px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                {weightPerSide} kg each side
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(-10)}
                  className="px-2.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(-2.5)}
                  className="px-2.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  -2.5
                </button>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)] font-mono tracking-tight text-center px-2">
                {targetWeight} <span className="text-sm font-bold text-red-500">kg</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(2.5)}
                  className="px-2.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  +2.5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTarget(10)}
                  className="px-2.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] transition-all cursor-pointer select-none"
                >
                  +10
                </button>
              </div>
            </div>

            {/* Barbell Weight Toggle */}
            <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                <span>Choose Barbell Weight:</span>
                <span className="text-[10px] text-zinc-400 font-mono">{barWeight} kg bar</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { w: 20, label: '20kg Olympic', sub: 'Standard Gym Bar' },
                  { w: 15, label: '15kg Bar', sub: 'Women / Training' },
                  { w: 10, label: '10kg Bar', sub: 'EZ / Short Bar' },
                ].map((b) => (
                  <button
                    key={b.w}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setBarWeight(b.w);
                    }}
                    className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                      barWeight === b.w
                        ? 'bg-red-500/15 border-red-500/60 text-white shadow-2xs'
                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <div className="text-xs font-black">{b.label}</div>
                    <div className="text-[9px] text-[var(--text-muted)] leading-tight">{b.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Formula Equation Summary */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Weight</div>
              <div className="text-sm font-black text-white">{targetWeight} kg</div>
            </div>
            <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Empty Bar</div>
              <div className="text-sm font-black text-zinc-400">− {barWeight} kg</div>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="text-[10px] uppercase font-bold text-red-400">Each Side</div>
              <div className="text-sm font-black text-red-400">{weightPerSide} kg</div>
            </div>
          </div>

          {/* 4. Visual Barbell Sleeve Representation */}
          <div className="bg-[#121215] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden shadow-inner">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Visual Guide: One Sleeve of Barbell ({weightPerSide} kg in plates)
            </div>

            {weightPerSide === 0 ? (
              <div className="py-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-xl mb-2">
                  <Dumbbell className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="text-xs font-black text-white uppercase tracking-wider">
                  Empty Barbell Only
                </div>
                <p className="text-[11px] text-zinc-400 max-w-xs mt-1 leading-normal">
                  The barbell alone already weighs <strong>{barWeight} kg</strong>. Lift just the bar without adding any weight plates!
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center py-2">
                {/* The Barbell & Stacked Plates */}
                <div className="flex items-center justify-center relative w-full py-1">
                  {/* Inner Collar (Bar Stop) */}
                  <div className="w-3.5 h-16 bg-zinc-600 rounded-l border-y border-l border-zinc-400 shrink-0 shadow-sm flex items-center justify-center" title="Barbell Collar" />
                  
                  {/* Stacked Plates on Sleeve */}
                  <div className="flex items-center gap-1 shrink-0 overflow-x-auto max-w-[280px] px-1 py-1">
                    {platesPerSide.flatMap(({ plate, count }, pIdx) =>
                      Array.from({ length: count }).map((_, cIdx) => (
                        <div
                          key={`${pIdx}-${cIdx}`}
                          className={`w-5 sm:w-6 ${plate.heightClass} ${plate.color} ${plate.borderColor} ${plate.textColor} rounded-sm border flex items-center justify-center font-black text-[9px] sm:text-[10px] shadow-md select-none shrink-0 transition-transform hover:scale-105`}
                          title={`${plate.label} kg plate`}
                        >
                          <span className="-rotate-90 whitespace-nowrap font-mono">{plate.label}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Remaining Barbell Sleeve Tip */}
                  <div className="h-6 w-12 sm:w-16 bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-400 border-y border-zinc-500 shrink-0" />
                  {/* Outer Bar End Cap */}
                  <div className="h-5 w-3.5 bg-zinc-500 rounded-r border-y border-r border-zinc-400 shrink-0" />
                </div>

                <div className="text-[10px] text-zinc-500 mt-2 font-medium">
                  ← Inner Bar Collar (Towards center) &nbsp;|&nbsp; Outer Sleeve Tip →
                </div>
              </div>
            )}

            {remainderUnmatched > 0 && (
              <div className="mt-2 text-[10px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>+ {remainderUnmatched} kg remaining (lighter than smallest 1.25kg plate)</span>
              </div>
            )}
          </div>

          {/* 5. Plate Inventory Checklist */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-[var(--text-secondary)]">
              Plates to Load onto BOTH Sides (Left & Right):
            </div>
            {platesPerSide.length === 0 ? (
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-xs text-zinc-400 text-center">
                ✨ Zero plates required. The empty {barWeight} kg bar matches your target weight.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {platesPerSide.map(({ plate, count }) => (
                  <div
                    key={plate.label}
                    className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3.5 h-3.5 rounded-full ${plate.color} border ${plate.borderColor} shrink-0`} />
                      <span className="text-xs font-black text-[var(--text-main)] truncate">
                        {plate.label} kg plate
                      </span>
                    </div>
                    <span className="text-xs font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-lg border border-red-500/25 shrink-0">
                      × {count} each
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
          {onApplyWeight && (
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black shadow-sm transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Apply {targetWeight} kg to Set</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
