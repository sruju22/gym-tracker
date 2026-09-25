import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  bordered = true,
}) => {
  const baseStyle = 'bg-[#121827] rounded-2xl p-4 transition-all duration-150 text-slate-100';
  const borderStyle = bordered ? 'border border-slate-800/90 shadow-sm' : '';
  const hoverStyle = hoverable
    ? 'hover:border-slate-700 hover:shadow-lg active:scale-[0.99] cursor-pointer'
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
