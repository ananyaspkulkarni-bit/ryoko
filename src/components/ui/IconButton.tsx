import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface IconButtonProps extends HTMLMotionProps<'button'> {
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  'aria-label': ariaLabel,
  variant = 'secondary',
  size = 'md',
  children,
  style,
  disabled,
  onClick,
  ...props
}) => {
  const getDimension = () => {
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 48;
      case 'md':
      default:
        return 40;
    }
  };

  const dim = getDimension();

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-deep-forest)',
          color: 'var(--color-cream)',
          border: '1px solid var(--color-deep-forest)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-deep-brown)',
          border: '1px solid transparent',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: 'var(--color-warm-sand)',
          color: 'var(--color-deep-brown)',
          border: '1px solid var(--border-color)',
        };
    }
  };

  return (
    <motion.button
      aria-label={ariaLabel}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.05, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.95, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        width: dim,
        height: dim,
        borderRadius: 'var(--radius-full)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        boxShadow: variant === 'ghost' ? 'none' : 'var(--shadow-sm)',
        ...getVariantStyles(),
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};
