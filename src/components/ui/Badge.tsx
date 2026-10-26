import React from 'react';

export interface BadgeProps {
  variant?: 'forest' | 'moss' | 'rosy' | 'sky' | 'sand';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'forest',
  children,
  icon,
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'moss':
        return {
          backgroundColor: 'rgba(143, 168, 56, 0.22)',
          color: 'var(--color-deep-shadow-green)',
          border: '1px solid rgba(143, 168, 56, 0.5)',
        };
      case 'rosy':
        return {
          backgroundColor: 'rgba(240, 120, 112, 0.20)',
          color: 'var(--color-wild-berry)',
          border: '1px solid rgba(240, 120, 112, 0.5)',
        };
      case 'sky':
        return {
          backgroundColor: 'rgba(98, 214, 197, 0.22)',
          color: 'var(--color-bright-marine)',
          border: '1px solid rgba(36, 123, 160, 0.35)',
        };
      case 'sand':
        return {
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
        };
      case 'forest':
      default:
        return {
          backgroundColor: 'var(--color-cypress)',
          color: 'var(--color-vanilla-custard)',
          border: '1px solid var(--color-deep-shadow-green)',
        };
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.78rem',
        fontWeight: 600,
        fontFamily: 'var(--font-family-sans)',
        lineHeight: 1.3,
        ...getVariantStyles(),
      }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
