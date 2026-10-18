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
          ? 'bg-[var(--primary)] text-white border-[var(--primary)] font-extrabold shadow-sm shadow-red-500/20'
          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-main)]'
      }`}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            active ? 'bg-white/20 text-white' : 'bg-[var(--border-strong)] text-[var(--text-secondary)]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
