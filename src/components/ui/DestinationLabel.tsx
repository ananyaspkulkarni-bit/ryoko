import React from 'react';
import { Compass, MapPin } from 'lucide-react';

export interface DestinationLabelProps {
  name: string;
  subtitle?: string;
  coordinates?: { lat: number; lng: number };
  variant?: 'postcard' | 'ticket' | 'museum';
  style?: React.CSSProperties;
}

export const DestinationLabel: React.FC<DestinationLabelProps> = ({
  name,
  subtitle,
  coordinates,
  variant = 'postcard',
  style,
}) => {
  const formattedCoords = coordinates
    ? `${coordinates.lat.toFixed(4)}° N · ${coordinates.lng.toFixed(4)}° E`
    : null;

  if (variant === 'ticket') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 14px',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--radius-xs)',
          fontFamily: 'var(--font-family-serif)',
          color: 'var(--text-heading)',
          fontSize: '0.9rem',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
      >
        <Compass size={16} style={{ color: 'var(--color-princeton-orange)' }} />
        <div>
          <strong style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>{name}</strong>
          {(subtitle || formattedCoords) && (
            <span
              style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginLeft: '8px',
              }}
            >
              {subtitle || formattedCoords}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'museum') {
    return (
      <div
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '3.5px solid var(--color-chrysanthemum)',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-cypress)' }}>
          {subtitle || 'DESTINATION ITEM'}
        </div>
        <div style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.25rem', color: 'var(--text-heading)', fontWeight: 700 }}>
          {name}
        </div>
        {formattedCoords && (
          <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {formattedCoords}
          </div>
        )}
      </div>
    );
  }

  // Default postcard style label
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'var(--color-cypress)',
        color: 'var(--color-vanilla-custard)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-family-serif)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      <MapPin size={16} style={{ color: 'var(--color-chrysanthemum)' }} />
      <span style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>{name}</span>
      {(subtitle || formattedCoords) && (
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-sans)',
            color: 'var(--color-ylang-ylang)',
            borderLeft: '1px solid rgba(255,255,255,0.3)',
            paddingLeft: '8px',
          }}
        >
          {subtitle || formattedCoords}
        </span>
      )}
    </div>
  );
};
