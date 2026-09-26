import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search exercises...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-[#6B7280] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] focus:outline-none focus:border-[#E11D48] min-h-[44px] transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 p-1 text-[#6B7280] hover:text-[#9CA3AF]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
