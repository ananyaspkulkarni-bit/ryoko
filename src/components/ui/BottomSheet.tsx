import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(10, 51, 35, 0.4)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '640px',
              backgroundColor: 'var(--color-cream)',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: 'var(--space-xl)',
              boxShadow: 'var(--shadow-modal)',
              zIndex: 1001,
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {/* Drag handle pill */}
            <div
              style={{
                width: '40px',
                height: '4px',
                backgroundColor: 'var(--border-strong)',
                borderRadius: 'var(--radius-full)',
                margin: '0 auto var(--space-md) auto',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              {title && (
                <h3 style={{ fontFamily: 'var(--font-family-serif)', margin: 0, color: 'var(--color-deep-forest)', fontSize: '1.3rem' }}>
                  {title}
                </h3>
              )}
              <IconButton aria-label="Close sheet" variant="ghost" size="sm" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </div>
            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
