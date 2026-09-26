import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-[#14171A] border-t sm:border border-[#272B30] rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col z-10 animate-fade-in shadow-2xl overflow-hidden text-[#F5F5F5]">
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-[#272B30] rounded-full mx-auto my-2.5 sm:hidden" />

        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#272B30]">
            <h3 className="text-base font-extrabold text-[#F5F5F5]">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 text-[#9CA3AF] hover:text-[#F5F5F5] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
};
