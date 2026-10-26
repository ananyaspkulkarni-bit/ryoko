import React from 'react';
import { motion } from 'framer-motion';

export interface TagProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export const Tag: React.FC<TagProps> = ({ label, selected = false, onClick }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: 600,
        fontFamily: 'var(--font-family-sans)',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: selected ? 'var(--color-chrysanthemum)' : 'var(--bg-surface-elevated)',
        color: selected ? 'var(--color-vanilla-custard)' : 'var(--text-primary)',
        border: `1px solid ${selected ? 'var(--color-wild-berry)' : 'var(--border-color)'}`,
        boxShadow: selected ? 'var(--shadow-sm)' : 'none',
        transition: 'var(--transition-fast)',
      }}
    >
      #{label}
    </motion.button>
  );
};
