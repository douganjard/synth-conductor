
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';

export interface SynthSettings {
  waveform: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  cutoff: number;
  resonance: number;
  volume: number;
  lfoRate: number;
  lfoAmount: number;
}

export interface HandData {
  x: number; // 0 to 1
  y: number; // 0 to 1
  active: boolean;
}

export interface HandState {
  left: HandData;
  right: HandData;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED'
}

export enum CutDirection {
  UP = 0,
  DOWN = 1,
  LEFT = 2,
  RIGHT = 3,
  ANY = 8
}

export interface NoteData {
  id: string;
  time: number;
  lineIndex: number;
  lineLayer: number;
  type: 'left' | 'right';
  cutDirection: CutDirection;
  hit?: boolean;
  missed?: boolean;
  hitTime?: number;
}

export interface HandPositions {
  left: THREE.Vector3 | null;
  right: THREE.Vector3 | null;
  leftVelocity: THREE.Vector3;
  rightVelocity: THREE.Vector3;
}

export type HandType = 'left' | 'right';

export const DEFAULT_SETTINGS: SynthSettings = {
  waveform: 'sawtooth',
  attack: 0.1,
  decay: 0.2,
  sustain: 0.5,
  release: 0.5,
  cutoff: 1000,
  resonance: 5,
  volume: 0.5,
  lfoRate: 5,
  lfoAmount: 500,
};

export const COLORS = {
  left: '#ef4444',  // Red (LFO)
  right: '#3b82f6', // Blue (Synth)
  accent: '#10b981', // Green
  bg: '#0a0a0a',
  surface: '#171717',
  border: '#262626'
};
