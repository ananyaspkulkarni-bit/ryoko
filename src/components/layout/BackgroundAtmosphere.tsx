import React from 'react';

export interface BackgroundAtmosphereProps {
  children?: React.ReactNode;
}

export const BackgroundAtmosphere: React.FC<BackgroundAtmosphereProps> = ({ children }) => {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflowX: 'hidden',
      }}
    >
      {/* Subtle storybook paper grain & grid overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(rgba(61, 43, 31, 0.04) 1px, transparent 1px),
            linear-gradient(to right, rgba(102, 116, 54, 0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(102, 116, 54, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px, 48px 48px, 48px 48px',
          zIndex: 0,
        }}
      />

      {/* Atmospheric Sky Turquoise & Sunshine Yellow ambient storybook gradients */}
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          maxHeight: '600px',
          maxWidth: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(98, 214, 197, 0.22) 0%, rgba(255, 244, 219, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: '-15%',
          left: '-10%',
          width: '60vw',
          height: '60vw',
          maxHeight: '700px',
          maxWidth: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 216, 77, 0.16) 0%, rgba(255, 244, 219, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Content Layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

