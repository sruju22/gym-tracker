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
      'bg-[#E11D48] hover:bg-[#F43F5E] text-[#FFFFFF] font-extrabold shadow-sm shadow-[#E11D48]/20 active:bg-[#BE123C]',
    secondary:
      'bg-[#1B1F23] hover:bg-[#23282D] text-[#F5F5F5] border border-[#272B30] active:bg-[#2B3137]',
    outline:
      'border border-[#272B30] text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-[#1B1F23] active:bg-[#23282D]',
    danger:
      'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 hover:bg-[#EF4444]/25 active:bg-[#EF4444]/35',
    ghost:
      'bg-transparent text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-[#1B1F23]',
    success:
      'bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0D0F] font-extrabold shadow-sm shadow-[#22C55E]/20',
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
