import React from 'react';
import { PaperPlane } from './PaperPlane';
import type { AanProps } from './aan.types';
import { Sparkles } from 'lucide-react';

export const Aan: React.FC<AanProps> = ({
  motionState = 'IDLE_ORBIT',
  expression = 'happy',
  outfit = 'base',
  size = 170,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <PaperPlane
          motionState={motionState}
          expression={expression}
          outfit={outfit}
          size={size}
        />

        {/* Floating Companion Badge */}
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: 'var(--color-chrysanthemum)',
            color: 'var(--color-vanilla-custard)',
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-wild-berry)',
            pointerEvents: 'none',
          }}
        >
          <Sparkles size={11} /> Aan Companion
        </div>
      </div>
    </div>
  );
};
