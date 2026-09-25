import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-xl cursor-pointer select-none touch-manipulation';

  const variants = {
    primary:
      'bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold shadow-sm shadow-sky-500/20 active:bg-sky-600',
    secondary:
      'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 active:bg-slate-700',
    outline:
      'border border-slate-700 text-slate-300 hover:bg-slate-800/60 active:bg-slate-800',
    danger:
      'bg-rose-950/40 text-rose-400 border border-rose-800/50 hover:bg-rose-900/40 active:bg-rose-900/60',
    ghost:
      'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50',
    success:
      'bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold shadow-sm shadow-sky-500/20',
  };

  const sizes = {
    sm: 'text-xs px-3 py-2 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 min-h-[44px]',
    lg: 'text-base px-5 py-3.5 min-h-[48px]',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
