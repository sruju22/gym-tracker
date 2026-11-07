import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Flame,
  Target,
  Dumbbell,
  Zap,
  Calendar,
} from 'lucide-react';
import { useCoachStore } from '../../store/coachStore';
import { FormattedMarkdown } from './FormattedMarkdown';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const SUGGESTED_QUESTIONS = [
  'Analyse my strength progress.',
  'Why am I plateauing?',
  'Which muscles need more attention?',
  'What should I train next?',
  'Explain my latest progression recommendation.',
  'Review my last 28 days of training.',
];

const PROMPT_CARDS = [
  {
    title: 'Strength Progress',
    subtitle: 'Analyze 1RM & volume gains',
    icon: TrendingUp,
    iconBg: 'bg-red-500/15 text-red-400 border-red-500/30',
    question: 'Analyse my strength progress.',
  },
  {
    title: 'Why Plateauing?',
    subtitle: 'Find fatigue & stick points',
    icon: Flame,
    iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    question: 'Why am I plateauing?',
  },
  {
    title: 'Muscle Focus',
    subtitle: 'Check undertrained muscles',
    icon: Target,
    iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    question: 'Which muscles need more attention?',
  },
  {
    title: 'What Next?',
    subtitle: 'Next split recommendation',
    icon: Dumbbell,
    iconBg: 'bg-red-500/15 text-red-400 border-red-500/30',
    question: 'What should I train next?',
  },
  {
    title: 'Explain Overload',
    subtitle: 'Break down progression targets',
    icon: Zap,
    iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    question: 'Explain my latest progression recommendation.',
  },
  {
    title: '28-Day Review',
    subtitle: 'Last 4 weeks summary',
    icon: Calendar,
    iconBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    question: 'Review my last 28 days of training.',
  },
];

export const AICoachDrawer: React.FC = () => {
  const {
    isOpen,
    closeCoach,
    messages,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
    clearConversation,
  } = useCoachStore();

  const [inputText, setInputText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSafetyExpanded, setIsSafetyExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic visual viewport height & offset for mobile keyboards (iOS Safari / Android)
  const [viewportHeight, setViewportHeight] = useState<number | null>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return Math.round(window.visualViewport.height);
    }
    return null;
  });
  const [viewportTop, setViewportTop] = useState<number>(0);

  // Lock document scrolling and sync visualViewport height on mobile
  useEffect(() => {
    if (!isOpen) return;

    // 1. Lock document scrolling to prevent iOS background displacement
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // 2. Track visualViewport for iOS Safari / Android virtual keyboards
    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(Math.round(window.visualViewport.height));
        setViewportTop(Math.round(window.visualViewport.offsetTop));
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      }
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalTouchAction;
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
    };
  }, [isOpen]);

  // Auto-scroll to bottom on new message or loading change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input on desktop when opened (on mobile, let user browse starter prompts first without keyboard takeover)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.innerWidth >= 768) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCoach();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCoach]);

  if (!isOpen) return null;

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    setInputText('');
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputFocus = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      setTimeout(() => {
        window.scrollTo(0, 0);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  const isKeyboardOpen =
    viewportHeight !== null &&
    typeof window !== 'undefined' &&
    viewportHeight < window.innerHeight - 80;

  return (
    <div
      className="fixed inset-x-0 z-50 overflow-hidden select-none flex justify-end"
      role="dialog"
      aria-modal="true"
      style={{
        top: `${viewportTop}px`,
        height: viewportHeight !== null ? `${viewportHeight}px` : '100dvh',
      }}
    >
      {/* Backdrop for Desktop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeCoach}
        aria-hidden="true"
      />

      {/* Drawer Container (Full-screen mobile, 480px slide-over desktop) */}
      <aside
        role="region"
        aria-label="AI Personal Training Coach"
        className="relative z-10 w-full md:w-[480px] bg-[var(--bg-surface)] md:border-l border-[var(--border-subtle)] shadow-2xl flex flex-col h-full overflow-hidden animate-slide-left text-[var(--text-main)]"
      >
          {/* 1. Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-red-500/20 bg-[var(--bg-surface)]/95 backdrop-blur-md shadow-[0_4px_20px_rgba(220,38,38,0.08)] z-10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shadow-sm shadow-red-500/20 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                    Personal Training Coach
                  </h2>
                  <Badge variant="primary" size="sm" className="text-[10px] px-1.5 py-0 uppercase tracking-wider font-extrabold">
                    AI
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  Personalised training advice & progress insights
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Clear conversation button */}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Clear conversation"
                  aria-label="Clear chat conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Close button */}
              <button
                type="button"
                onClick={closeCoach}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Close AI Coach"
                aria-label="Close AI Coach"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clear confirmation alert banner */}
          {showClearConfirm && (
            <div className="bg-red-950/40 border-b border-red-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-red-200 animate-fade-in shrink-0">
              <span>Clear conversation history?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearConversation();
                    setShowClearConfirm(false);
                  }}
                  className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 rounded-md hover:bg-white/10 text-zinc-300 font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 2. Chat Messages Viewport */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 select-text overscroll-contain">
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && (
              <div className="flex flex-col space-y-3.5 py-1 animate-fade-in">
                {/* 1. Hero Welcome Card with GymTrackie Logo & Red Ambient Glow */}
                <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-red-950/40 via-zinc-900/90 to-zinc-950 border border-red-500/30 shadow-lg shadow-red-950/40 space-y-2.5">
                  {/* Subtle red ambient glow in the top-right corner */}
                  <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-red-600/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center shadow-md shadow-red-600/30 text-white shrink-0">
                        <GymTrackieLogo variant="icon" height={22} width={22} className="w-5.5 h-5.5 object-contain" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                          Personal Training Intelligence
                          <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                            AI
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Real-time advice grounded in your logged sets, PRs & recovery.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-2 pt-1 border-t border-white/5 text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[10.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Training Context Active
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400 text-[10.5px]">Zero Hallucination Grounding</span>
                  </div>
                </div>

                {/* 2. Sleek Collapsible Safety & Transparency Notice */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsSafetyExpanded(!isSafetyExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-semibold text-zinc-300">Safety & Transparency Notice</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {isSafetyExpanded ? 'Hide ▲' : 'View Details ▼'}
                    </span>
                  </button>

                  {isSafetyExpanded && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-[var(--text-muted)] space-y-1 animate-fade-in">
                      <ul className="list-disc pl-3.5 space-y-1 text-[10.5px] text-[var(--text-muted)]">
                        <li>Recommendations are based on recorded GymTrackie training data.</li>
                        <li>Some muscle stimulus and progression assessments are estimates.</li>
                        <li>The coach is not a medical professional.</li>
                        <li>It cannot diagnose injuries or replace professional medical advice.</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* 3. 2-Column Grid of Eye-Catchy Interactive Action Cards */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-black text-zinc-400 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>Suggested Topics</span>
                    <span className="text-[10px] font-normal text-zinc-500">Tap to ask</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PROMPT_CARDS.map((card, idx) => {
                      const Icon = card.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePromptClick(card.question)}
                          className="text-left p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 active:scale-95 border border-white/5 hover:border-red-500/50 shadow-sm transition-all duration-150 flex flex-col justify-between group cursor-pointer min-h-[96px]"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${card.iconBg} shrink-0`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-red-400 transition-colors" />
                          </div>
                          <div className="mt-2">
                            <div className="text-xs font-bold text-white group-hover:text-red-300 transition-colors leading-tight">
                              {card.title}
                            </div>
                            <div className="text-[10px] text-zinc-400 group-hover:text-zinc-300 leading-tight mt-0.5 line-clamp-1">
                              {card.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 animate-fade-in`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[var(--primary)] text-white rounded-tr-xs max-w-[85%] shadow-sm'
                        : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-main)] rounded-tl-xs max-w-[92%] shadow-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <FormattedMarkdown content={message.content} />
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-[var(--text-muted)] px-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5 animate-fade-in">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    <span className="font-semibold text-zinc-200">Analyzing training data...</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Calculating progressive overload, volume, and biomechanical readiness.
                  </p>
                </div>
              </div>
            )}

            {/* Error Banner & Retry Button */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200 flex flex-col gap-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error.message}</span>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={retryLastMessage}
                    className="text-xs py-1 px-3 flex items-center gap-1.5 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Question</span>
                  </Button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 3. Input Footer */}
          <div
            className="border-t border-white/5 bg-[var(--bg-surface)]/95 backdrop-blur-md p-3 sm:p-4 shrink-0 space-y-2 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
            style={{
              paddingBottom: isKeyboardOpen
                ? '0.75rem'
                : 'max(1rem, env(safe-area-inset-bottom, 16px))',
            }}
          >
            {/* Quick Starter Chips above input when messages exist */}
            {messages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((prompt, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/5 hover:border-red-500/40 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer truncate max-w-[200px]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="relative flex items-center gap-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                placeholder="Ask your coach anything..."
                rows={1}
                maxLength={1000}
                disabled={isLoading}
                className="flex-1 min-h-[44px] max-h-28 py-2.5 pl-3.5 pr-10 rounded-xl bg-zinc-900/90 border border-zinc-800 focus:border-red-500/80 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)] focus:outline-hidden text-[16px] sm:text-sm text-white placeholder-zinc-500 placeholder:truncate leading-normal resize-none transition-all"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                  inputText.trim() && !isLoading
                    ? 'bg-gradient-to-tr from-red-600 to-red-500 text-white shadow-lg shadow-red-600/30 active:scale-95 hover:brightness-110'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
                title="Send Message (Enter)"
                aria-label="Send Message"
              >
                <Send className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Character counter (when nearing limit) */}
            {inputText.length > 800 && (
              <div className="flex justify-end text-[10px] text-[var(--text-muted)] px-1">
                <span className={inputText.length >= 1000 ? 'text-red-400 font-bold' : ''}>
                  {inputText.length}/1000
                </span>
              </div>
            )}
          </div>
        </aside>
    </div>
  );
};
