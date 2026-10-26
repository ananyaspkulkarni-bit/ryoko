import React, { useEffect, useRef, useState } from 'react';
import { GlobeController } from './GlobeController';
import type { Destination } from '../../types';
import type { GlobeTravelPhase } from './globe.types';
import type { CountryGeoData } from '../../data/countriesGeo';

export interface GlobeProps {
  selectedDestination: Destination | null;
  onPhaseChange?: (phase: GlobeTravelPhase) => void;
  onDestinationSelect?: (destination: Destination) => void;
  reducedMotion?: boolean;
}

export const Globe: React.FC<GlobeProps> = ({
  selectedDestination,
  onPhaseChange,
  onDestinationSelect,
  reducedMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GlobeController | null>(null);

  const [hoveredCountry, setHoveredCountry] = useState<CountryGeoData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPhaseChangeRef = useRef(onPhaseChange);
  const onDestinationSelectRef = useRef(onDestinationSelect);

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
    onDestinationSelectRef.current = onDestinationSelect;
  }, [onPhaseChange, onDestinationSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize GlobeController inside container ONCE
    const controller = new GlobeController(containerRef.current, {
      reducedMotion,
      onPhaseChange: (phase) => onPhaseChangeRef.current?.(phase),
      onDestinationClick: (dest) => onDestinationSelectRef.current?.(dest),
      onCountryHover: (country, clientX, clientY) => {
        setHoveredCountry(country);
        if (country) {
          setTooltipPos({ x: clientX, y: clientY });
        }
      },
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!controllerRef.current) return;

    if (selectedDestination) {
      controllerRef.current.travelToDestination(selectedDestination);
    } else {
      controllerRef.current.resetToGlobalView();
    }
  }, [selectedDestination]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Dynamic Hover Tooltip — Displays ONLY when cursor is over a real country */}
      {hoveredCountry && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 14,
            top: tooltipPos.y + 14,
            zIndex: 1000,
            pointerEvents: 'none',
            backgroundColor: 'rgba(16, 58, 11, 0.92)',
            color: '#FCE9AB',
            padding: '5px 14px',
            borderRadius: 'var(--radius-full, 20px)',
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            fontFamily: 'var(--font-family-sans, sans-serif)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(252, 233, 171, 0.35)',
            backdropFilter: 'blur(6px)',
            transition: 'opacity 120ms ease, transform 120ms ease',
          }}
        >
          {hoveredCountry.name}
        </div>
      )}
    </div>
  );
};
