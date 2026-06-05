/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- SYNTH ENGINE TYPES ---

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
  left: '#ef4444',  // Red (Filter)
  right: '#3b82f6', // Blue (Oscillator)
  accent: '#10b981', // Green
  bg: '#0a0a0a',
  surface: '#171717',
  border: '#262626'
};
