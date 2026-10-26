import React from 'react';

export interface DividerProps {
  variant?: 'solid' | 'dashed' | 'dotted' | 'ticket';
  style?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({ variant = 'dashed', style }) => {
  if (variant === 'ticket') {
    return (
      <div
        style={{
          width: '100%',
          height: '1px',
          margin: 'var(--space-md) 0',
          backgroundImage: 'linear-gradient(to right, var(--border-strong) 40%, rgba(255,255,255,0) 0%)',
          backgroundPosition: 'top',
          backgroundSize: '12px 1px',
          backgroundRepeat: 'repeat-x',
          ...style,
        }}
      />
    );
  }

  return (
    <hr
      style={{
        width: '100%',
        margin: 'var(--space-md) 0',
        border: 'none',
        borderTop: `1px ${variant} var(--border-color)`,
        ...style,
      }}
    />
  );
};
