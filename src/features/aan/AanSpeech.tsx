import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpeechBubble } from '../../components/ui/SpeechBubble';
import type { GlobeTravelPhase } from '../globe/globe.types';

export interface AanSpeechProps {
  travelPhase: GlobeTravelPhase;
  destinationName?: string;
  arrivalMessage?: string;
  weatherCondition?: string;
  temperatureC?: number;
  isWeatherAdapted?: boolean;
}

export const AanSpeech: React.FC<AanSpeechProps> = ({
  travelPhase,
  destinationName = '',
  arrivalMessage,
  weatherCondition,
  temperatureC,
  isWeatherAdapted,
}) => {
  const getGreeting = (name?: string): string => {
    if (arrivalMessage) return arrivalMessage;
    if (name) return `We've arrived in ${name}! Let's explore.`;
    return "We've arrived! Let's explore.";
  };

  const getSecondaryMessage = (name?: string): string => {
    if (isWeatherAdapted && weatherCondition) {
      const cond = weatherCondition.toLowerCase();
      if (cond.includes('rain') || cond.includes('shower') || cond.includes('storm')) {
        return name
          ? `Rain forecasted in ${name} today (${temperatureC ?? 18}°C). I've adapted your plan with covered stops & galleries.`
          : `Rain forecasted today. I've adapted your plan with covered stops & galleries.`;
      }
      if (typeof temperatureC === 'number' && temperatureC >= 32) {
        return name
          ? `Warm ${temperatureC}°C in ${name} today! I've scheduled indoor air-conditioned visits during peak hours.`
          : `High temperatures today. I've scheduled indoor visits during peak hours.`;
      }
      if (cond.includes('sun') || cond.includes('clear') || cond.includes('partly')) {
        return name
          ? `Clear skies and ${temperatureC ?? 22}°C in ${name} today! Perfect conditions for your walking tour.`
          : `Clear skies today! Perfect conditions for your walking tour.`;
      }
    }
    if (name) return `I've planned today for you. Ready to explore ${name}?`;
    return "I've planned today for you.";
  };

  const [secondaryArrivedPhase, setSecondaryArrivedPhase] = useState<string | null>(null);

  useEffect(() => {
    if (travelPhase === 'arrived') {
      const timer = window.setTimeout(() => {
        setSecondaryArrivedPhase(destinationName || 'arrived');
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [travelPhase, destinationName]);

  const showSecondary =
    travelPhase === 'arrived' && secondaryArrivedPhase === (destinationName || 'arrived');


  const currentMessage = (() => {
    switch (travelPhase) {
      case 'selected':
      case 'aan-reacting':
        return destinationName ? `${destinationName}? Excellent choice.` : 'Excellent choice.';
      case 'flying':
      case 'zooming':
        return 'Hold on...';
      case 'arriving':
        return getGreeting(destinationName);
      case 'arrived':
        return showSecondary ? getSecondaryMessage(destinationName) : getGreeting(destinationName);
      case 'idle':
      default:
        return "Pick a place. I'll take you there.";
    }
  })();


  return (
    <div style={{ pointerEvents: 'none' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMessage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SpeechBubble
            speakerLabel="Aan"
            variant={travelPhase === 'arrived' || travelPhase === 'arriving' ? 'announcement' : 'journal'}
            placement="bottom-left"
            message={currentMessage}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
