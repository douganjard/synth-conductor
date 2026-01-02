
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useState, useEffect } from 'react';
import { useMediaPipe } from './hooks/useMediaPipe';
import { useSynth } from './hooks/useSynth';
import WebcamPreview from './components/WebcamPreview';
import { DEFAULT_SETTINGS, SynthSettings } from './types';
import { 
  MIN_FREQ, MAX_FREQ, 
  MIN_CUTOFF, MAX_CUTOFF, 
  MIN_LFO_RATE, MAX_LFO_RATE,
  MAX_RESONANCE
} from './constants';
import { Waves, Zap, AudioLines, Settings2, Hand, Power, Activity } from 'lucide-react';

interface SpatialPoint {
  x: number;
  y: number;
  timestamp: number;
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<SynthSettings>(DEFAULT_SETTINGS);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { isCameraReady, handStateRef, lastResultsRef } = useMediaPipe(videoRef);
  const { 
    initAudio, updateParams, 
    setFrequency, setCutoff, setResonance,
    setLFORate, setLFOAmount,
    triggerOn, triggerOff 
  } = useSynth();

  // Unified controller loop
  useEffect(() => {
    let frame: number;
    const loop = () => {
      if (isAudioEnabled) {
        const hands = handStateRef.current;
        
        // --- RIGHT HAND: LEAD VOICE (Pitch & Resonance) ---
        if (hands.right.active) {
          const freq = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, hands.right.x);
          const resonance = (1 - hands.right.y) * MAX_RESONANCE;
          
          setFrequency(freq);
          setResonance(resonance);
          triggerOn(settings);
        } else {
          triggerOff(settings);
        }

        // --- LEFT HAND: FILTER CONDUCOR (Cutoff & LFO Rate) ---
        if (hands.left.active) {
          // X: LFO Speed
          const lfoRate = MIN_LFO_RATE + (MAX_LFO_RATE - MIN_LFO_RATE) * hands.left.x;
          setLFORate(lfoRate);
          
          // Y: Filter Frequency (Cutoff)
          const cutoff = MIN_CUTOFF * Math.pow(MAX_CUTOFF / MIN_CUTOFF, 1 - hands.left.y);
          setCutoff(cutoff);
          
          setLFOAmount(settings.lfoAmount);
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isAudioEnabled, settings, triggerOn, triggerOff, setFrequency, setCutoff, setResonance, setLFORate, setLFOAmount]);

  const toggleAudio = () => {
    initAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  const updateSetting = (key: keyof SynthSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateParams(newSettings);
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
      <video 
        ref={videoRef} 
        className="opacity-0 pointer-events-none absolute w-1 h-1" 
        playsInline muted autoPlay 
      />

      <header className="p-6 border-b border-white/5 flex justify-between items-center backdrop-blur-md bg-black/20 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <AudioLines className="text-emerald-400" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SYNTH <span className="text-emerald-400 underline decoration-emerald-400/30">CONDUCTOR</span></h1>
        </div>
        
        <button 
          onClick={toggleAudio}
          className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${
            isAudioEnabled 
              ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
          }`}
        >
          {isAudioEnabled ? "STOP ENGINE" : "START ENGINE"}
        </button>
      </header>

      <main className="flex-1 flex p-6 gap-6 relative overflow-hidden">
        
        <div className="w-80 flex flex-col gap-6 z-10 overflow-y-auto pr-2 custom-scrollbar">
          <section className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6 text-white/50 font-medium uppercase text-xs tracking-widest">
              <Waves size={14} /> Oscillator
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['sine', 'square', 'sawtooth', 'triangle'].map((type) => (
                <button
                  key={type}
                  onClick={() => updateSetting('waveform', type)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                    settings.waveform === type 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                      : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6 text-white/50 font-medium uppercase text-xs tracking-widest">
              <Activity size={14} /> LFO Modulation
            </div>
            <div className="space-y-6">
              <ControlSlider 
                label="LFO Rate" 
                value={settings.lfoRate} 
                min={MIN_LFO_RATE} max={MAX_LFO_RATE} step={0.1} 
                onChange={(v) => updateSetting('lfoRate', v)} 
              />
              <ControlSlider 
                label="LFO Amount" 
                value={settings.lfoAmount} 
                min={0} max={4000} step={1} 
                onChange={(v) => updateSetting('lfoAmount', v)} 
              />
            </div>
          </section>

          <section className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl flex-1 min-h-[300px]">
            <div className="flex items-center gap-2 mb-6 text-white/50 font-medium uppercase text-xs tracking-widest">
              <Settings2 size={14} /> Master Envelope
            </div>
            
            <div className="space-y-6">
              <ControlSlider label="Attack" value={settings.attack} min={0.01} max={2} step={0.01} onChange={(v) => updateSetting('attack', v)} />
              <ControlSlider label="Release" value={settings.release} min={0.01} max={3} step={0.01} onChange={(v) => updateSetting('release', v)} />
              <ControlSlider label="Resonance" value={settings.resonance} min={0} max={20} step={0.1} onChange={(v) => updateSetting('resonance', v)} />
              <ControlSlider label="Master Vol" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => updateSetting('volume', v)} />
            </div>
          </section>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 bg-white/5 rounded-[40px] border border-white/10 relative overflow-hidden group shadow-inner">
             {/* 2D Trajectory Plot Background */}
             <SpatialPlotBackground stateRef={handStateRef} />

             <div className="absolute left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-red-500/30 font-mono tracking-widest uppercase origin-left pointer-events-none">Filter Conduct (LEFT HAND)</div>
             <div className="absolute right-10 top-1/2 -translate-y-1/2 rotate-90 text-[10px] text-blue-500/30 font-mono tracking-widest uppercase origin-right pointer-events-none">Lead Voice (RIGHT HAND)</div>

             {!isAudioEnabled && (
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md bg-black/40 z-20">
                   <div className="text-center p-8 bg-black border border-white/10 rounded-3xl max-w-sm">
                      <Zap className="mx-auto mb-4 text-emerald-400" size={48} />
                      <h3 className="text-xl font-bold mb-2">Conductor Mode</h3>
                      <p className="text-white/40 text-sm mb-6">Left: Filter Cutoff + LFO Rate<br/>Right: Pitch + Resonance</p>
                      <button onClick={toggleAudio} className="bg-emerald-500 text-black px-8 py-3 rounded-full font-bold shadow-lg">START CONDUCTING</button>
                   </div>
                </div>
             )}

             <PerformancePointer state={handStateRef.current} />
          </div>

          <div className="h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center px-8 justify-between">
              <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Hand className="text-blue-500/40" size={28} />
                    <div className="text-[10px] font-mono leading-tight">
                        <span className="block text-blue-400">RIGHT HAND (LEAD)</span>
                        <span className="text-white/30 uppercase tracking-tighter">X: Pitch / Y: Resonance</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex items-center gap-3">
                    <Hand className="text-red-500/40" size={28} />
                    <div className="text-[10px] font-mono leading-tight">
                        <span className="block text-red-400">LEFT HAND (FILTER)</span>
                        <span className="text-white/30 uppercase tracking-tighter">X: LFO Rate / Y: Cutoff</span>
                    </div>
                  </div>
              </div>
              
              <div className="text-right">
                  <div className="text-[10px] text-white/20 uppercase tracking-tighter mb-1">Engine Output</div>
                  <div className="flex items-center justify-end gap-3">
                    <div className="flex flex-col items-end">
                       <span className={`text-[9px] ${handStateRef.current.left.active ? 'text-red-400' : 'text-white/10'}`}>FILTER STAGE</span>
                       <span className={`text-[9px] ${handStateRef.current.right.active ? 'text-blue-400' : 'text-white/10'}`}>VCO LEAD</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isCameraReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  </div>
              </div>
          </div>
        </div>
      </main>

      <WebcamPreview videoRef={videoRef} resultsRef={lastResultsRef} isCameraReady={isCameraReady} />

      <footer className="p-4 text-center text-[10px] text-white/10 uppercase tracking-[0.3em] font-mono pointer-events-none">
          Spectral Synthesis Engine • Conductor Mode v2.2
      </footer>
    </div>
  );
};

const SpatialPlotBackground: React.FC<{ stateRef: React.MutableRefObject<any> }> = ({ stateRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftHistoryRef = useRef<SpatialPoint[]>([]);
  const rightHistoryRef = useRef<SpatialPoint[]>([]);
  const MAX_HISTORY_MS = 5000;

  useEffect(() => {
    let frame: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = performance.now();
      const state = stateRef.current;
      
      // Update data
      if (state.left.active) {
        leftHistoryRef.current.push({ x: state.left.x, y: state.left.y, timestamp: now });
      }
      if (state.right.active) {
        rightHistoryRef.current.push({ x: state.right.x, y: state.right.y, timestamp: now });
      }
      
      leftHistoryRef.current = leftHistoryRef.current.filter(p => now - p.timestamp < MAX_HISTORY_MS);
      rightHistoryRef.current = rightHistoryRef.current.filter(p => now - p.timestamp < MAX_HISTORY_MS);

      // Handle Resize
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      ctx.beginPath();
      for(let x = 0; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
      }
      for(let y = 0; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      const drawTrail = (history: SpatialPoint[], color: string) => {
        if (history.length < 2) return;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        for (let i = 0; i < history.length - 1; i++) {
          const p1 = history[i];
          const p2 = history[i + 1];
          const ageRatio = (now - p1.timestamp) / MAX_HISTORY_MS;
          const opacity = Math.max(0, 1.0 - ageRatio);
          
          ctx.strokeStyle = color;
          ctx.lineWidth = opacity * 6; // Thicker lines for the main pad
          ctx.globalAlpha = opacity * 0.4;
          
          ctx.beginPath();
          ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
          ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      };

      drawTrail(leftHistoryRef.current, '#ef4444');
      drawTrail(rightHistoryRef.current, '#3b82f6');

      frame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frame);
  }, [stateRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const ControlSlider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }> = ({ label, value, min, max, step, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase">
      <span>{label}</span>
      <span className="font-mono text-emerald-400">{typeof value === 'number' ? value.toFixed(2) : value}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
    />
  </div>
);

const PerformancePointer: React.FC<{ state: any }> = ({ state }) => {
    const [leftPos, setLeftPos] = useState({ x: 0.5, y: 0.5, active: false });
    const [rightPos, setRightPos] = useState({ x: 0.5, y: 0.5, active: false });

    useEffect(() => {
        let frame: number;
        const update = () => {
            setLeftPos(state.left);
            setRightPos(state.right);
            frame = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(frame);
    }, [state]);

    return (
        <>
            {/* FILTER CONDUCOR (LEFT HAND) */}
            <div 
                className={`absolute transition-opacity duration-300 pointer-events-none z-10 ${leftPos.active ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${leftPos.x * 100}%`, top: `${leftPos.y * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-red-500 rounded-full flex items-center justify-center bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                    </div>
                    <div className="absolute -top-10 whitespace-nowrap text-[8px] font-mono text-red-400 bg-black/60 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-tighter">
                        Filter: {Math.round(MIN_CUTOFF * Math.pow(MAX_CUTOFF / MIN_CUTOFF, 1 - leftPos.y))}Hz
                    </div>
                </div>
            </div>

            {/* LEAD VOICE (RIGHT HAND) */}
            <div 
                className={`absolute transition-opacity duration-300 pointer-events-none z-10 ${rightPos.active ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${rightPos.x * 100}%`, top: `${rightPos.y * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 border-2 border-blue-500 rounded-full flex items-center justify-center bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                    </div>
                    <div className="absolute -top-12 whitespace-nowrap text-[8px] font-mono text-blue-400 bg-black/60 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">
                        Pitch: {Math.round(MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, rightPos.x))}Hz
                    </div>
                </div>
            </div>

            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 pointer-events-none" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 pointer-events-none" />
        </>
    );
}

export default App;
