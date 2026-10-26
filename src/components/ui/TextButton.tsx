import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface TextButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const TextButton: React.FC<TextButtonProps> = ({
  children,
  icon,
  style,
  disabled,
  onClick,
  ...props
}) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={disabled ? undefined : { x: 2 }}
      transition={{ type: 'spring', stiffness: 300 }}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        color: 'var(--color-midnight-green)',
        fontFamily: 'var(--font-family-sans)',
        fontSize: '0.95rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        textDecoration: 'underline',
        textUnderlineOffset: '4px',
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      <span>{children}</span>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    </motion.button>
  );
};
