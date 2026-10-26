import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface PaperCardProps extends HTMLMotionProps<'div'> {
  stampText?: string;
  tapeEffect?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  stampText,
  tapeEffect = true,
  children,
  style,
  ...props
}) => {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="paper-texture"
      style={{
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-postcard)',
        position: 'relative',
        backgroundColor: 'var(--bg-surface)',
        ...style,
      }}
      {...props}
    >
      {tapeEffect && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%) rotate(-1deg)',
            width: '90px',
            height: '22px',
            backgroundColor: 'rgba(255, 244, 219, 0.90)',
            border: '1px solid rgba(43, 33, 23, 0.14)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {stampText && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            border: '2px dashed var(--color-chrysanthemum)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--color-chrysanthemum)',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transform: 'rotate(4deg)',
            userSelect: 'none',
          }}
        >
          {stampText}
        </div>
      )}

      {children}
    </motion.div>
  );
};
