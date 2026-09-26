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
        <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type={type}
          className={`w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2.5 text-base text-[#F5F5F5] placeholder-[#6B7280] focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48] min-h-[44px] transition-all ${
            unit ? 'pr-10' : ''
          } ${error ? 'border-[#EF4444]' : ''} ${className}`}
          {...props}
        />
        {unit && (
          <span className="absolute right-3 text-xs font-semibold text-[#6B7280] pointer-events-none select-none">
            {unit}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-[#EF4444]">{error}</span>}
    </div>
  );
};
