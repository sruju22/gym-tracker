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
    primary: 'bg-[#E11D48]/15 text-[#E11D48] border border-[#E11D48]/40 font-bold',
    secondary: 'bg-[#1B1F23] text-[#9CA3AF] border border-[#272B30]',
    success: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40 font-bold',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/40 font-bold',
    danger: 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 font-bold',
    info: 'bg-[#E11D48]/15 text-[#E11D48] border border-[#E11D48]/40 font-bold',
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
