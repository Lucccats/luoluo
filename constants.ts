import * as THREE from 'three';

export const COLORS = {
  emerald: new THREE.Color('#004225'),
  deepGreen: new THREE.Color('#012b1d'),
  gold: new THREE.Color('#C5A059'),
  brightGold: new THREE.Color('#FFD700'),
  silver: new THREE.Color('#E0E0E0'),
  white: new THREE.Color('#FFFFFF'),
  bg: '#000905',
};

// Geometry Settings
export const TREE_HEIGHT = 12;
export const TREE_RADIUS_BASE = 5;
export const SCATTER_RADIUS = 15;

// Increased density for "Full" look
export const PARTICLE_COUNT = 5000;
export const ORNAMENT_COUNT = 300; // Spheres
export const GIFT_COUNT = 100; // Boxes on tree
export const ROUND_GIFT_COUNT = 60; // Cylinders
export const POLAROID_COUNT = 24; // Keep multiple of 4 for easier grid logic

// Animation Settings
export const TRANSITION_DURATION = 2.5; // Seconds

// Audio Settings
// No default background music. User must upload a file via the UI.
export const BG_MUSIC_URL = '';