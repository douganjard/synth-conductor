
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';

// Audio Constants
// Shifted down by one octave: C2 (65.41) -> C1 (32.70), C6 (1046.50) -> C5 (523.25)
export const MIN_FREQ = 32.70; 
export const MAX_FREQ = 523.25; 
export const MIN_CUTOFF = 50;
export const MAX_CUTOFF = 12000;
export const MAX_RESONANCE = 20;

// LFO Constants
export const MIN_LFO_RATE = 0.1;
export const MAX_LFO_RATE = 25.0;
export const MIN_LFO_AMOUNT = 0;
export const MAX_LFO_AMOUNT = 4000;

// Mapping constants
export const SMOOTHING_FACTOR = 0.4;

// Added Gameplay Constants for 3D Rhythm Engine
export const PLAYER_Z = 0;
export const SPAWN_Z = -50;
export const MISS_Z = 3;
export const NOTE_SPEED = 12;
export const NOTE_SIZE = 0.4;
export const SONG_BPM = 120;

// Grid layout for notes: 4 lanes and 3 layers
export const LANE_X_POSITIONS = [-1.5, -0.5, 0.5, 1.5];
export const LAYER_Y_POSITIONS = [0.8, 1.4, 2.0];

// Direction vectors for validating swipe angles (indices match CutDirection enum values)
export const DIRECTION_VECTORS: Record<number, THREE.Vector3> = {
    0: new THREE.Vector3(0, 1, 0),    // UP
    1: new THREE.Vector3(0, -1, 0),   // DOWN
    2: new THREE.Vector3(-1, 0, 0),   // LEFT
    3: new THREE.Vector3(1, 0, 0),    // RIGHT
    8: new THREE.Vector3(0, 0, 0),    // ANY
};
