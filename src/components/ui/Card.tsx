import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'journal';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-postcard)',
          border: '1px solid var(--border-color)',
        };
      case 'journal':
        return {
          backgroundColor: 'var(--color-cream)',
          border: '1px dashed var(--border-strong)',
          boxShadow: 'var(--shadow-journal)',
        };
      case 'default':
      default:
        return {
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-journal)',
        };
    }
  };

  return (
    <motion.div
      style={{
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        position: 'relative',
        overflow: 'hidden',
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
