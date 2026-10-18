import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  bordered?: boolean;
  variant?: 'surface' | 'elevated' | 'subtle';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  bordered = true,
  variant = 'surface',
}) => {
  const variantStyles = {
    surface: 'bg-[var(--bg-surface)]',
    elevated: 'bg-[var(--bg-card)] shadow-sm',
    subtle: 'bg-[var(--bg-card-subtle)]',
  };

  const baseStyle = `${variantStyles[variant]} rounded-2xl p-4 transition-all duration-150 text-[var(--text-main)]`;
  const borderStyle = bordered ? 'border border-[var(--border-subtle)]' : '';
  const hoverStyle = hoverable
    ? 'hover:border-[var(--border-strong)] hover:shadow-md active:scale-[0.99] cursor-pointer'
    : '';

  return (
    <div
      className={`${baseStyle} ${borderStyle} ${hoverStyle} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
