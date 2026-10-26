import React from 'react';
import { motion } from 'framer-motion';
import type { TargetAndTransition, Transition } from 'framer-motion';
import { AanCharacterSvg } from './AanCharacterSvg';
import type { AanExpression, AanOutfit, AanMotionState } from './aan.types';

export interface PaperPlaneProps {
  motionState: AanMotionState;
  expression?: AanExpression;
  outfit?: AanOutfit;
  size?: number;
}

export const PaperPlane: React.FC<PaperPlaneProps> = ({
  motionState,
  expression = 'happy',
  outfit = 'base',
  size = 170,
}) => {
  const getAnimationConfig = (): { animate: TargetAndTransition; transition: Transition } => {
    switch (motionState) {
      case 'TRAVEL_PREPARE':
        return {
          animate: {
            y: [0, -8, 0],
            scale: [1, 1.08, 1],
            rotate: [-2, 4, 0],
          },
          transition: { duration: 0.6, ease: 'easeOut' },
        };
      case 'IN_FLIGHT':
        return {
          animate: {
            x: [0, 120, 240, 140, 40, 0],
            y: [0, -45, 30, -30, -10, 0],
            rotate: [5, 25, -15, 16, -5, 5],
            scale: [1, 1.3, 1.4, 1.2, 1.05, 1],
          },
          transition: { duration: 3.2, ease: 'easeInOut' },
        };
      case 'LANDING':
        return {
          animate: {
            y: [0, 35, 60],
            rotate: [-14, -3, 0],
            scale: [1, 0.9, 0.85],
          },
          transition: { duration: 0.8, ease: 'easeOut' },
        };
      case 'LANDED':
        return {
          animate: {
            y: 40,
            rotate: 0,
            scale: 0.9,
          },
          transition: { duration: 0.3 },
        };
      case 'IDLE_ORBIT':
      default:
        return {
          animate: {
            y: [0, -14, 0],
            rotate: [5, -5, 5],
            scale: [1, 1.04, 1],
          },
          transition: {
            duration: 4.8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
    }
  };

  const anim = getAnimationConfig();

  return (
    <motion.div
      animate={anim.animate}
      transition={anim.transition}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 14px 28px rgba(10, 51, 35, 0.18))',
      }}
    >
      <AanCharacterSvg
        expression={expression}
        outfit={outfit}
        width={size}
        height={Math.round(size * 0.88)}
      />
    </motion.div>
  );
};
