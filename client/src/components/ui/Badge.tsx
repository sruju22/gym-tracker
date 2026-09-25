import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'sm',
  className = '',
}) => {
  const baseStyle = 'inline-flex items-center font-medium rounded-lg select-none';

  const variants = {
    primary: 'bg-sky-950/70 text-sky-400 border border-sky-800/60 font-semibold',
    secondary: 'bg-slate-900 text-slate-300 border border-slate-800',
    success: 'bg-sky-950/70 text-sky-400 border border-sky-800/60 font-semibold',
    warning: 'bg-amber-950/60 text-amber-400 border border-amber-800/60 font-semibold',
    danger: 'bg-rose-950/60 text-rose-400 border border-rose-800/60 font-semibold',
    info: 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 font-semibold',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
