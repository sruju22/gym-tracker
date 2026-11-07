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
  Database,
  Info,
} from 'lucide-react';
import { useCoachStore } from '../../store/coachStore';
import { FormattedMarkdown } from './FormattedMarkdown';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new message or loading change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
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

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none" role="dialog" aria-modal="true">
      {/* Backdrop for Desktop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeCoach}
        aria-hidden="true"
      />

      {/* Drawer Container (Full-screen mobile, 480px slide-over desktop) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 md:pl-10">
        <aside
          role="region"
          aria-label="AI Personal Training Coach"
          className="w-screen max-w-full md:w-[480px] bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col h-[100dvh] overflow-hidden animate-slide-left text-[var(--text-main)]"
        >
          {/* 1. Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-sm z-10 shrink-0">
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
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 select-text">
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && (
              <div className="flex flex-col space-y-4 py-2 animate-fade-in">
                {/* Welcome Card */}
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Welcome to your Personal Training Coach</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    I analyse your logged workouts, strength trajectories, muscle stimulus balance, and progression recommendations to help you make smarter training decisions.
                  </p>
                </div>

                {/* Safety & Non-Medical Trust Notice */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-zinc-300">Safety & Transparency Notice:</span>
                    <ul className="list-disc pl-3.5 space-y-0.5 mt-1 text-[10.5px] text-[var(--text-muted)]">
                      <li>Recommendations are based on recorded GymTrackie training data.</li>
                      <li>Some muscle stimulus and progression assessments are estimates.</li>
                      <li>The coach is not a medical professional.</li>
                      <li>It cannot diagnose injuries or replace professional medical advice.</li>
                    </ul>
                  </div>
                </div>

                {/* Suggested Questions Section */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
                    Suggested Questions
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTED_QUESTIONS.map((question, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePromptClick(question)}
                        className="w-full text-left p-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:scale-[0.99] border border-[var(--border-subtle)] hover:border-red-500/40 text-xs sm:text-sm font-medium text-[var(--text-main)] transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="group-hover:text-white transition-colors">{question}</span>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-red-400 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
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

                  {/* Supporting Data Sources Attribution Pills */}
                  {!isUser && message.dataSources && message.dataSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 max-w-[92%]">
                      <span className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                        <Database className="w-3 h-3 text-zinc-500 shrink-0" />
                        Grounded in:
                      </span>
                      {message.dataSources.map((source, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card-subtle)] border border-white/5 text-[var(--text-muted)] select-none"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  )}

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
          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-4 shrink-0 space-y-2">
            {/* Quick Starter Chips above input when messages exist */}
            {messages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((prompt, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer truncate max-w-[200px]"
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
                placeholder="Ask about workouts, plateaus, readiness..."
                rows={1}
                maxLength={1000}
                disabled={isLoading}
                className="flex-1 min-h-[44px] max-h-28 py-2.5 pl-3.5 pr-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-red-500 focus:outline-hidden text-xs sm:text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] resize-none transition-colors"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                  inputText.trim() && !isLoading
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/20 active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
                title="Send Message (Enter)"
                aria-label="Send Message"
              >
                <Send className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Character counter & Hint */}
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] px-1">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-zinc-500 shrink-0" />
                Press Enter to send, Shift+Enter for new line
              </span>
              {inputText.length > 800 && (
                <span className={inputText.length >= 1000 ? 'text-red-400 font-bold' : ''}>
                  {inputText.length}/1000
                </span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
