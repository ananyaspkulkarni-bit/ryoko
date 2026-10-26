import React from 'react';
import { motion } from 'framer-motion';
import { DestinationLabel } from '../../components/ui/DestinationLabel';
import { PaperCard } from '../../components/ui/PaperCard';
import { Button } from '../../components/ui/Button';
import { AanSpeech } from '../aan/AanSpeech';
import { PaperPlane } from '../aan/PaperPlane';
import { Compass } from 'lucide-react';
import { getDestinationData } from '../../data/destinations';
import type { Destination } from '../../types';

export interface ParisMomentSceneProps {
  destination?: Destination | null;
  onReturnToGlobe: () => void;
}

export const ParisMomentScene: React.FC<ParisMomentSceneProps> = ({
  destination: inputDestination,
  onReturnToGlobe,
}) => {
  const dest = getDestinationData(inputDestination);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: 'var(--space-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xl)',
        zIndex: 20,
      }}
    >
      {/* Destination Postcard Header */}
      <PaperCard stampText={`PASSPORT STAMP · ${dest.name.toUpperCase()} 2026`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <DestinationLabel
              name={dest.name.toUpperCase()}
              subtitle={`${dest.country.toUpperCase()} · ${dest.coordinates.lat.toFixed(4)}° N · ${dest.coordinates.lng.toFixed(4)}° E`}
              variant="museum"
            />
            <h2
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: '2.4rem',
                color: 'var(--color-deep-forest)',
                margin: '16px 0 6px 0',
              }}
            >
              {dest.subtitle || dest.description}
            </h2>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '520px' }}>
              We have landed! Explore iconic spots, local architecture, and authentic culture in {dest.name}, {dest.country}.
            </p>
          </div>

          {/* Vignette Illustration */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-cream)',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-strong)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>✦</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-deep-forest)', letterSpacing: '0.08em' }}>
              {dest.name.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Landed Aan Companion & Speech */}
        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PaperPlane motionState="LANDED" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>Aan Companion</span>
          </div>

          <AanSpeech
            travelPhase="arrived"
            destinationName={dest.name}
            arrivalMessage={dest.arrivalMessage}
          />
        </div>
      </PaperCard>

      {/* Navigation Return Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="primary"
          size="lg"
          icon={<Compass size={20} />}
          onClick={onReturnToGlobe}
        >
          Return to Living Globe World
        </Button>
      </div>
    </motion.div>
  );
};
