/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback } from 'react';
import { SynthSettings, DEFAULT_SETTINGS } from '../types';

interface CapturedVoice {
  id: string;
  osc: OscillatorNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
}

export const useSynth = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);

  // Keep track of up to 5 parallel captured layered sound waves
  const capturedVoicesRef = useRef<CapturedVoice[]>([]);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const mainGain = ctx.createGain();

    // Main Oscillator
    osc.type = DEFAULT_SETTINGS.waveform;
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    
    // LFO (Modulates Filter Cutoff)
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(DEFAULT_SETTINGS.lfoRate, ctx.currentTime);
    lfoGain.gain.setValueAtTime(DEFAULT_SETTINGS.lfoAmount, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(DEFAULT_SETTINGS.cutoff, ctx.currentTime);
    filter.Q.setValueAtTime(DEFAULT_SETTINGS.resonance, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    mainGain.gain.setValueAtTime(DEFAULT_SETTINGS.volume, ctx.currentTime);

    // Patching
    osc.connect(filter);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency); // Modulate cutoff frequency
    
    filter.connect(gain);
    gain.connect(mainGain);
    mainGain.connect(ctx.destination);

    osc.start();
    lfo.start();

    audioCtxRef.current = ctx;
    oscRef.current = osc;
    lfoRef.current = lfo;
    lfoGainRef.current = lfoGain;
    filterRef.current = filter;
    gainRef.current = gain;
    mainGainRef.current = mainGain;
  }, []);

  const updateParams = useCallback((settings: SynthSettings) => {
    if (!audioCtxRef.current || !oscRef.current || !filterRef.current || !mainGainRef.current || !lfoRef.current || !lfoGainRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    oscRef.current.type = settings.waveform;
    filterRef.current.Q.setTargetAtTime(settings.resonance, now, 0.05);
    mainGainRef.current.gain.setTargetAtTime(settings.volume, now, 0.05);
    
    lfoRef.current.frequency.setTargetAtTime(settings.lfoRate, now, 0.05);
    lfoGainRef.current.gain.setTargetAtTime(settings.lfoAmount, now, 0.05);
  }, []);

  const setFrequency = useCallback((freq: number) => {
    if (!oscRef.current || !audioCtxRef.current) return;
    oscRef.current.frequency.setTargetAtTime(freq, audioCtxRef.current.currentTime, 0.05);
  }, []);

  const setCutoff = useCallback((cutoff: number) => {
    if (!filterRef.current || !audioCtxRef.current) return;
    filterRef.current.frequency.setTargetAtTime(cutoff, audioCtxRef.current.currentTime, 0.05);
  }, []);

  const setResonance = useCallback((q: number) => {
    if (!filterRef.current || !audioCtxRef.current) return;
    filterRef.current.Q.setTargetAtTime(q, audioCtxRef.current.currentTime, 0.05);
  }, []);

  const setLFORate = useCallback((rate: number) => {
    if (!lfoRef.current || !audioCtxRef.current) return;
    lfoRef.current.frequency.setTargetAtTime(rate, audioCtxRef.current.currentTime, 0.05);
  }, []);

  const setLFOAmount = useCallback((amount: number) => {
    if (!lfoGainRef.current || !audioCtxRef.current) return;
    lfoGainRef.current.gain.setTargetAtTime(amount, audioCtxRef.current.currentTime, 0.05);
  }, []);

  const triggerOn = useCallback((settings: SynthSettings) => {
    if (!gainRef.current || !audioCtxRef.current || isPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    gainRef.current.gain.cancelScheduledValues(now);
    gainRef.current.gain.setValueAtTime(gainRef.current.gain.value, now);
    gainRef.current.gain.linearRampToValueAtTime(1, now + settings.attack);
    isPlayingRef.current = true;
  }, []);

  const triggerOff = useCallback((settings: SynthSettings) => {
    if (!gainRef.current || !audioCtxRef.current || !isPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    gainRef.current.gain.cancelScheduledValues(now);
    gainRef.current.gain.setValueAtTime(gainRef.current.gain.value, now);
    gainRef.current.gain.linearRampToValueAtTime(0, now + settings.release);
    isPlayingRef.current = false;
  }, []);

  // Capture a static sound wave of current parameters and keep it playing as a layer
  const captureCurrentLayer = useCallback((
    id: string,
    currentFreq: number,
    currentCutoff: number,
    currentResonance: number,
    currentLfoRate: number,
    waveform: OscillatorType,
    settings: SynthSettings
  ) => {
    if (!audioCtxRef.current || !mainGainRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    // Prune oldest layer if we already have 5 parallel waves playing
    if (capturedVoicesRef.current.length >= 5) {
      const oldest = capturedVoicesRef.current.shift();
      if (oldest) {
        // Smoothly fade out oldest voice to prevent pops
        const releaseTime = 0.5;
        oldest.gain.gain.cancelScheduledValues(now);
        oldest.gain.gain.setValueAtTime(oldest.gain.gain.value, now);
        oldest.gain.gain.linearRampToValueAtTime(0, now + releaseTime);

        // Terminate and disconnect nodes after fade out completes
        const toClean = oldest;
        setTimeout(() => {
          try {
            toClean.osc.stop();
            toClean.lfo.stop();
            toClean.osc.disconnect();
            toClean.lfo.disconnect();
            toClean.lfoGain.disconnect();
            toClean.filter.disconnect();
            toClean.gain.disconnect();
          } catch (err) {
            console.warn("Cleanup error for oldest layer:", err);
          }
        }, releaseTime * 1000 + 100);
      }
    }

    // Build a dedicated sub-graph for this captured layer wave
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(currentFreq, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(currentLfoRate, now);
    lfoGain.gain.setValueAtTime(settings.lfoAmount, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(currentCutoff, now);
    filter.Q.setValueAtTime(currentResonance, now);

    // Dynamic fade in for capturing
    gain.gain.setValueAtTime(0, now);
    // Captured waves are blended slightly lower to avoid clipping the output
    gain.gain.linearRampToValueAtTime(0.35, now + 0.15);

    osc.connect(filter);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    filter.connect(gain);
    gain.connect(mainGainRef.current);

    osc.start();
    lfo.start();

    capturedVoicesRef.current.push({
      id,
      osc,
      filter,
      lfo,
      lfoGain,
      gain,
    });
  }, []);

  // Clear all running layers instantly
  const clearAllLayers = useCallback(() => {
    if (!audioCtxRef.current) {
      capturedVoicesRef.current = [];
      return;
    }
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    capturedVoicesRef.current.forEach((voice) => {
      const releaseTime = 0.3;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + releaseTime);

      const toClean = voice;
      setTimeout(() => {
        try {
          toClean.osc.stop();
          toClean.lfo.stop();
          toClean.osc.disconnect();
          toClean.lfo.disconnect();
          toClean.lfoGain.disconnect();
          toClean.filter.disconnect();
          toClean.gain.disconnect();
        } catch (err) {
          // already closed or stopped
        }
      }, releaseTime * 1000 + 100);
    });

    capturedVoicesRef.current = [];
  }, []);

  return {
    initAudio,
    updateParams,
    setFrequency,
    setCutoff,
    setResonance,
    setLFORate,
    setLFOAmount,
    triggerOn,
    triggerOff,
    captureCurrentLayer,
    clearAllLayers,
    audioCtx: audioCtxRef.current
  };
};
