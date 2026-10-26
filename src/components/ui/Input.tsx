import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  id,
  style,
  disabled,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-family-sans)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${error ? '#C53030' : 'var(--border-color)'}`,
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          fontFamily: 'var(--font-family-sans)',
          boxShadow: 'var(--shadow-sm)',
          opacity: disabled ? 0.6 : 1,
          outline: 'none',
          transition: 'var(--transition-fast)',
          ...style,
        }}
        {...props}
      />
      {error ? (
        <span style={{ fontSize: '0.8rem', color: '#C53030', marginTop: '2px' }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
