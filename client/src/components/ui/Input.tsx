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
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type={type}
          className={`w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 min-h-[44px] transition-all ${
            unit ? 'pr-10' : ''
          } ${error ? 'border-rose-500' : ''} ${className}`}
          {...props}
        />
        {unit && (
          <span className="absolute right-3 text-xs font-semibold text-slate-500 pointer-events-none select-none">
            {unit}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  );
};
