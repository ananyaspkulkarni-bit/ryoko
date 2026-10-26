import React from 'react';
import type { Destination } from '../../types';
import { MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export interface DestinationSuggestionsProps {
  suggestions: Destination[];
  selectedIndex: number;
  onSelect: (destination: Destination) => void;
}

export const DestinationSuggestions: React.FC<DestinationSuggestionsProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="paper-texture"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: '10px',
        backgroundColor: 'var(--color-warm-sand)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-postcard)',
        overflow: 'hidden',
        zIndex: 100,
        maxHeight: '280px',
        overflowY: 'auto',
      }}
    >
      {suggestions.map((dest, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={dest.id}
            onClick={() => onSelect(dest)}
            onMouseEnter={() => {}}
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              backgroundColor: isSelected ? 'var(--color-cream)' : 'transparent',
              borderLeft: isSelected ? '4px solid var(--color-deep-forest)' : '4px solid transparent',
              borderBottom: '1px dashed var(--border-color)',
              transition: 'var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin
                size={18}
                style={{
                  color: isSelected ? 'var(--color-rosy-brown)' : 'var(--color-moss)',
                }}
              />
              <div>
                <strong style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.05rem', color: 'var(--color-deep-forest)' }}>
                  {dest.name}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  {dest.country}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(131, 153, 88, 0.2)',
                  color: 'var(--color-deep-forest)',
                }}
              >
                {dest.category}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep-brown)' }}>
                <Star size={13} style={{ fill: 'var(--color-rosy-brown)', color: 'var(--color-rosy-brown)' }} />
                {dest.rating}
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};
