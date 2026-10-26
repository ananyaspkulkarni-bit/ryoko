import React from 'react';
import { DestinationArrivalSection, type DestinationArrivalSectionProps } from './DestinationArrivalSection';

export interface ParisTransitionProps extends DestinationArrivalSectionProps {}

/**
 * Reusable Destination Arrival component.
 * Maintained as ParisTransition export for full backward compatibility, while dynamically
 * supporting any selected Destination (Paris, Tokyo, Mumbai, London, Rome, NYC, etc.).
 */
export const ParisTransition: React.FC<ParisTransitionProps> = (props) => {
  return <DestinationArrivalSection {...props} />;
};

export { DestinationArrivalSection };
