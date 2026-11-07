import React from 'react';
import { Sparkles, ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react';
import { useCoachStore } from '../../store/coachStore';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SUGGESTED_QUESTIONS } from '../coach/AICoachDrawer';

interface AICoachHomeCardProps {
  className?: string;
}

export const AICoachHomeCard: React.FC<AICoachHomeCardProps> = ({ className = '' }) => {
  const { openCoach } = useCoachStore();

  const previewQuestions = SUGGESTED_QUESTIONS.slice(0, 4);

  return (
    <Card
      className={`border-[var(--border-subtle)] hover:border-red-500/30 transition-all p-4.5 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-surface)] shadow-xs select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 mt-0.5 shadow-xs shadow-red-500/10">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                Your Personal Training Coach
              </h3>
              <Badge variant="primary" size="sm" className="text-[10px] px-1.5 py-0 uppercase font-extrabold tracking-wider">
                AI
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              Understand your progress, get personalised training advice, and make smarter workout decisions.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openCoach()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold shadow-xs shadow-red-500/20"
        >
          <span>Open Coach</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Suggested Quick Starter Chips */}
      <div className="space-y-1.5 mb-3">
        <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-red-400" />
          <span>Quick questions to ask:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {previewQuestions.map((question, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openCoach(question)}
              className="text-left px-2.5 py-2 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-white/[0.05] border border-white/5 hover:border-red-500/30 text-xs text-[var(--text-main)] hover:text-white transition-all cursor-pointer truncate flex items-center justify-between group"
            >
              <span className="truncate">{question}</span>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-red-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      {/* Trust Notice */}
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] border-t border-white/5 pt-2">
        <ShieldCheck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <span>Grounded in your workout logs, 1RM trajectories & muscle readiness.</span>
      </div>
    </Card>
  );
};
