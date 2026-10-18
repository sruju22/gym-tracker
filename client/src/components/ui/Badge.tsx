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
    primary: 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)] font-bold',
    secondary: 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
    success: 'bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success-border)] font-bold',
    warning: 'bg-[var(--warning-subtle)] text-[var(--warning)] border border-[var(--warning-border)] font-bold',
    danger: 'bg-[var(--danger-subtle)] text-[var(--danger)] border border-[var(--danger-border)] font-bold',
    info: 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)] font-bold',
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
