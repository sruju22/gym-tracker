import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className={`relative w-full ${maxWidth} bg-[var(--bg-surface)] border-t sm:border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col z-10 animate-fade-in shadow-2xl overflow-hidden text-[var(--text-main)]`}>
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-[var(--border-strong)] rounded-full mx-auto my-2.5 sm:hidden" />

        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <h3 className="text-base font-extrabold text-[var(--text-main)] tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 safe-bottom no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
