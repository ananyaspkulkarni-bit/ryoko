import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export interface SpeechBubbleProps extends HTMLMotionProps<'div'> {
  message: React.ReactNode;
  speakerLabel?: string;
  variant?: 'journal' | 'whisper' | 'announcement';
  placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: React.CSSProperties;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  message,
  speakerLabel = 'Aan',
  variant = 'journal',
  placement = 'bottom-left',
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'whisper':
        return {
          backgroundColor: 'var(--color-vanilla-custard)',
          color: 'var(--text-primary)',
          border: '1px dashed var(--color-chrysanthemum)',
          boxShadow: 'var(--shadow-sm)',
        };
      case 'announcement':
        return {
          backgroundColor: 'var(--color-cypress)',
          color: 'var(--color-vanilla-custard)',
          border: '1px solid var(--color-cypress)',
          boxShadow: 'var(--shadow-postcard)',
        };
      case 'journal':
      default:
        return {
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-journal)',
        };
    }
  };

  const getNotchPosition = (): React.CSSProperties => {
    switch (placement) {
      case 'top-left':
        return { bottom: '-8px', left: '20px' };
      case 'top-right':
        return { bottom: '-8px', right: '20px' };
      case 'bottom-right':
        return { top: '-8px', right: '20px' };
      case 'bottom-left':
      default:
        return { top: '-8px', left: '20px' };
    }
  };

  const getNotchBg = () => {
    switch (variant) {
      case 'whisper':
        return 'var(--color-vanilla-custard)';
      case 'announcement':
        return 'var(--color-cypress)';
      case 'journal':
      default:
        return 'var(--bg-surface-elevated)';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      style={{
        position: 'relative',
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        maxWidth: '380px',
        fontFamily: 'var(--font-family-sans)',
        fontSize: '0.92rem',
        lineHeight: 1.5,
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {speakerLabel && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '6px',
            color: variant === 'announcement' ? 'var(--color-bamboo)' : 'var(--color-chrysanthemum)',
          }}
        >
          <Sparkles size={12} />
          {speakerLabel}
        </div>
      )}

      <div>{message}</div>

      <div
        style={{
          position: 'absolute',
          width: '14px',
          height: '14px',
          backgroundColor: getNotchBg(),
          transform: 'rotate(45deg)',
          borderLeft: variant === 'journal' ? '1px solid var(--border-strong)' : 'none',
          borderTop: variant === 'journal' ? '1px solid var(--border-strong)' : 'none',
          ...getNotchPosition(),
        }}
      />
    </motion.div>
  );
};

