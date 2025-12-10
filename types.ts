export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE'
}

export interface DualPosition {
  tree: [number, number, number];
  scatter: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number;
}

export enum HandGesture {
  NONE = 'NONE',
  OPEN = 'OPEN',   // Scatter / Unleash
  CLOSED = 'CLOSED', // Assemble / Tree
  ONE = 'ONE' // Rotate (Index finger up)
}

export interface HandData {
  gesture: HandGesture;
  position: { x: number; y: number }; // Normalized -1 to 1
  isDetected: boolean;
}