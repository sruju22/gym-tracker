import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  icon?: React.ReactNode;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active,
  onClick,
  count,
  icon,
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer select-none border ${
        active
          ? 'bg-[#E11D48] text-[#FFFFFF] border-[#F43F5E] font-extrabold shadow-sm shadow-[#E11D48]/20'
          : 'bg-[#1B1F23] text-[#9CA3AF] border border-[#272B30] hover:bg-[#23282D] hover:text-[#F5F5F5]'
      }`}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            active ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]' : 'bg-[#272B30] text-[#9CA3AF]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
