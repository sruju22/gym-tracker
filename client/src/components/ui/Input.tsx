import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  unit?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  unit,
  className = '',
  type = 'text',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type={type}
          className={`w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-base text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] min-h-[44px] transition-all ${
            unit ? 'pr-10' : ''
          } ${error ? 'border-[var(--danger)]' : ''} ${className}`}
          {...props}
        />
        {unit && (
          <span className="absolute right-3 text-xs font-semibold text-[var(--text-muted)] pointer-events-none select-none">
            {unit}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
    </div>
  );
};
