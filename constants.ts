/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { CutDirection, NoteData } from "./types";
import * as THREE from 'three';

// Game World Config
export const TRACK_LENGTH = 50;
export const SPAWN_Z = -30;
export const PLAYER_Z = 0;
export const MISS_Z = 5;
export const NOTE_SPEED = 10; // Reduced from 15 for easier difficulty

export const LANE_WIDTH = 0.8;
export const LAYER_HEIGHT = 0.8;
export const NOTE_SIZE = 0.5;

// Positions for the 4 lanes (centered around 0)
export const LANE_X_POSITIONS = [-1.5 * LANE_WIDTH, -0.5 * LANE_WIDTH, 0.5 * LANE_WIDTH, 1.5 * LANE_WIDTH];
export const LAYER_Y_POSITIONS = [0.8, 1.6, 2.4]; // Low, Mid, High

// Audio
// Using a solid rhythmic track that is free to use.
export const SONG_URL = 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg';
export const SONG_BPM = 140; 
const BEAT_TIME = 60 / SONG_BPM;

// Generate a simple rhythmic chart
export const generateDemoChart = (): NoteData[] => {
  const notes: NoteData[] = [];
  let idCount = 0;

  // Simple pattern generator
  for (let i = 4; i < 200; i += 2) { // Start after 4 beats
    const time = i * BEAT_TIME;
    
    // Alternate hands every 4 beats, or do simultaneously sometimes
    const pattern = Math.floor(i / 16) % 3;

    if (pattern === 0) {
      // Simple alternation
      if (i % 4 === 0) {
         notes.push({
          id: `note-${idCount++}`,
          time: time,
          lineIndex: 1,
          lineLayer: 0,
          type: 'left',
          cutDirection: CutDirection.ANY
        });
      } else {
        notes.push({
          id: `note-${idCount++}`,
          time: time,
          lineIndex: 2,
          lineLayer: 0,
          type: 'right',
          cutDirection: CutDirection.ANY
        });
      }
    } else if (pattern === 1) {
      // Double hits
      if (i % 8 === 0) {
         notes.push(
           { id: `note-${idCount++}`, time, lineIndex: 0, lineLayer: 1, type: 'left', cutDirection: CutDirection.ANY },
           { id: `note-${idCount++}`, time, lineIndex: 3, lineLayer: 1, type: 'right', cutDirection: CutDirection.ANY }
         );
      }
    } else {
      // Streams (faster)
      notes.push({
        id: `note-${idCount++}`,
        time: time,
        lineIndex: 1,
        lineLayer: 0,
        type: 'left',
        cutDirection: CutDirection.ANY
      });
       notes.push({
        id: `note-${idCount++}`,
        time: time + BEAT_TIME,
        lineIndex: 2,
        lineLayer: 0,
        type: 'right',
        cutDirection: CutDirection.ANY
      });
    }
  }

  return notes.sort((a, b) => a.time - b.time);
};

export const DEMO_CHART = generateDemoChart();

// Vectors for direction checking
export const DIRECTION_VECTORS: Record<CutDirection, THREE.Vector3> = {
  [CutDirection.UP]: new THREE.Vector3(0, 1, 0),
  [CutDirection.DOWN]: new THREE.Vector3(0, -1, 0),
  [CutDirection.LEFT]: new THREE.Vector3(-1, 0, 0),
  [CutDirection.RIGHT]: new THREE.Vector3(1, 0, 0),
  [CutDirection.ANY]: new THREE.Vector3(0, 0, 0) // Magnitude check only
};
