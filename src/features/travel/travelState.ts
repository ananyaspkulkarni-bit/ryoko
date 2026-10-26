export type TravelPhase =
  | 'idle'
  | 'selected'
  | 'aan-reacting'
  | 'flying'
  | 'zooming'
  | 'arriving'
  | 'arrived';

export interface TravelState {
  phase: TravelPhase;
  destinationName: string;
}

export const CINEMATIC_TIMINGS = {
  idle: 0,
  selected: 0,
  'aan-reacting': 500,
  flying: 1500,
  zooming: 3000,
  arriving: 4500,
  arrived: 5800,
};

