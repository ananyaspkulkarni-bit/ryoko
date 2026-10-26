import React from 'react';

export interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  align?: 'left' | 'center';
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  subtitle,
  action,
  align = 'left',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : 'space-between',
        alignItems: align === 'center' ? 'center' : 'flex-end',
        textAlign: align,
        marginBottom: 'var(--space-lg)',
        width: '100%',
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: '1.75rem',
            color: 'var(--color-deep-forest)',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
              margin: '6px 0 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
