import React, { useState, useRef, useEffect } from 'react';
import { Globe } from './Globe';
import { Aan } from '../aan/Aan';
import { AanSpeech } from '../aan/AanSpeech';
import { DestinationSearch } from '../destinations/DestinationSearch';
import { ParisTransition } from '../travel/ParisTransition';
import { BackgroundAtmosphere } from '../../components/layout/BackgroundAtmosphere';
import type { Destination } from '../../types';
import type { GlobeTravelPhase } from './globe.types';
import { Compass, Map, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export const GlobeScene: React.FC = () => {
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [travelPhase, setTravelPhase] = useState<GlobeTravelPhase>('idle');
  const parisSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectDestination = (dest: Destination) => {
    setSelectedDestination(dest);
  };

  const handleReturnToGlobe = () => {
    setSelectedDestination(null);
    setTravelPhase('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-scroll down to Paris Destination Section upon landing
  useEffect(() => {
    if ((travelPhase === 'arriving' || travelPhase === 'arrived') && parisSectionRef.current) {
      const timer = setTimeout(() => {
        parisSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [travelPhase]);

  // Map GlobeTravelPhase to AanMotionState
  const getAanMotionState = () => {
    switch (travelPhase) {
      case 'selected':
      case 'aan-reacting':
        return 'TRAVEL_PREPARE';
      case 'flying':
      case 'zooming':
        return 'IN_FLIGHT';
      case 'arriving':
      case 'arrived':
        return 'LANDED';
      case 'idle':
      default:
        return 'IDLE_ORBIT';
    }
  };

  // Map GlobeTravelPhase to AanExpression
  const getAanExpression = (): 'happy' | 'curious' | 'excited' | 'surprised' | 'playful' => {
    switch (travelPhase) {
      case 'selected':
      case 'aan-reacting':
        return 'curious';
      case 'flying':
      case 'zooming':
        return 'excited';
      case 'arriving':
      case 'arrived':
        return 'happy';
      case 'idle':
      default:
        return 'happy';
    }
  };

  return (
    <BackgroundAtmosphere>
      <div style={{ position: 'relative', width: '100%', overflowX: 'hidden' }}>
        {/* Journey Travel Phase Badge (Visible during active transitions) */}
        {travelPhase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'fixed',
              top: '12px',
              right: '12px',
              zIndex: 100,
              backgroundColor: 'var(--color-cypress)',
              color: 'var(--color-vanilla-custard)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-chrysanthemum)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✦ JOURNEY:</span>
            <span style={{ color: 'var(--color-ylang-ylang)', textTransform: 'uppercase' }}>
              {travelPhase}
            </span>
          </motion.div>
        )}


        {/* SECTION 1: THE LIVING EARTH HERO WORLD */}
        <section
          style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header */}
          <header
            style={{
              position: 'relative',
              zIndex: 30,
              padding: 'var(--space-md) var(--space-xl)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(to bottom, rgba(250, 242, 220, 0.95) 0%, rgba(250, 242, 220, 0) 100%)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
              <Compass style={{ color: 'var(--color-cypress)', width: 28, height: 28 }} />
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.6rem',
                  fontFamily: 'var(--font-family-serif)',
                  letterSpacing: '0.06em',
                  color: 'var(--text-heading)',
                }}
              >
                RYOKO
              </h1>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                pointerEvents: 'auto',
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Map size={16} style={{ color: 'var(--color-princeton-orange)' }} /> The Living Globe World
            </div>
          </header>

          {/* 3D WebGL Globe Viewport */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
            <Globe
              selectedDestination={selectedDestination}
              onDestinationSelect={handleSelectDestination}
              onPhaseChange={(phase) => setTravelPhase(phase)}
            />
          </div>

          {/* Aan Companion & Speech Bubble */}
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              zIndex: 25,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              pointerEvents: 'none',
            }}
          >
            <Aan
              motionState={getAanMotionState()}
              expression={getAanExpression()}
            />
            <AanSpeech
              travelPhase={travelPhase}
              destinationName={selectedDestination?.name}
            />
          </div>

          {/* Destination Search Bar at Bottom */}
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              position: 'relative',
              zIndex: 30,
              padding: 'var(--space-lg) var(--space-xl)',
              background: 'linear-gradient(to top, rgba(250, 242, 220, 0.95) 0%, rgba(250, 242, 220, 0) 100%)',
            }}
          >
            <DestinationSearch onSelectDestination={handleSelectDestination} />
            
            {/* Scroll Indicator Prompt */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Scroll down or select a destination to begin journey</span>
              <ChevronDown size={14} style={{ color: 'var(--color-chrysanthemum)' }} />
            </div>
          </motion.footer>
        </section>

        {/* SECTION 2: CONTINUOUS VERTICAL SCROLL PARIS DESTINATION EXPERIENCE */}
        <section
          ref={parisSectionRef}
          id="paris-destination-section"
          style={{
            position: 'relative',
            minHeight: '100vh',
            backgroundColor: 'var(--bg-primary)',
            borderTop: '1px dashed var(--border-strong)',
            zIndex: 30,
          }}
        >
          <ParisTransition
            destination={selectedDestination}
            onReturnToGlobe={handleReturnToGlobe}
            travelPhase={travelPhase}
          />
        </section>
      </div>
    </BackgroundAtmosphere>
  );
};
