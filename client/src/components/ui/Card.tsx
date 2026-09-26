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
  const baseStyle = 'bg-[#14171A] rounded-2xl p-4 transition-all duration-150 text-[#F5F5F5]';
  const borderStyle = bordered ? 'border border-[#272B30] shadow-sm' : '';
  const hoverStyle = hoverable
    ? 'hover:border-[#383D43] hover:shadow-lg active:scale-[0.99] cursor-pointer'
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
