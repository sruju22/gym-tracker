import React from 'react';
import { Modal } from '../ui/Modal';
import { ProgressPhotosView } from './ProgressPhotosView';

interface ProgressPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProgressPhotosModal: React.FC<ProgressPhotosModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      title="Physique Progress Photos"
    >
      <div className="py-1">
        <ProgressPhotosView onClose={onClose} isModal={true} />
      </div>
    </Modal>
  );
};
