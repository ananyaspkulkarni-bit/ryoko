export type AanExpression =
  | 'happy'
  | 'curious'
  | 'excited'
  | 'surprised'
  | 'playful'
  | 'concerned'
  | 'sleepy'
  | 'proud';

export type AanOutfit =
  | 'base'
  | 'paris'
  | 'tokyo'
  | 'mumbai'
  | 'kyoto';

export type AanMotionState =
  | 'IDLE_ORBIT'
  | 'TRAVEL_PREPARE'
  | 'IN_FLIGHT'
  | 'LANDING'
  | 'LANDED';

export interface AanProps {
  expression?: AanExpression;
  outfit?: AanOutfit;
  motionState?: AanMotionState;
  destinationName?: string;
  size?: number;
  onClick?: () => void;
}

