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
import { Waves, Zap, AudioLines, Settings2, Hand, Activity, Layers, Trash2 } from 'lucide-react';

interface SpatialPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface LayerMark {
  id: string;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  freq: number;
  cutoff: number;
  waveform: OscillatorType;
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<SynthSettings>(DEFAULT_SETTINGS);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [capturedLayers, setCapturedLayers] = useState<LayerMark[]>([]);
  const [showClearedAlert, setShowClearedAlert] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { isCameraReady, handStateRef, lastResultsRef, error: cameraError } = useMediaPipe(videoRef);



  const { 
    initAudio, updateParams, 
    setFrequency, setCutoff, setResonance,
    setLFORate, setLFOAmount,
    triggerOn, triggerOff,
    captureCurrentLayer, clearAllLayers
  } = useSynth();

  // Keep a ref to read current settings in the animation loop without restarting it
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Keep track of double-fist transition
  const wasDoubleFistRef = useRef(false);

  const showClearNotification = () => {
    setShowClearedAlert(true);
    setTimeout(() => {
      setShowClearedAlert(false);
    }, 2000);
  };



  // Unified controller, layering, and shaking detection loop
  useEffect(() => {
    let frame: number;
    const loop = () => {
      if (isAudioEnabled) {
        const hands = handStateRef.current;
        const currentSettings = settingsRef.current;





        // --- PART 2: DOUBLE-FIST GESTURE DETECTION & LAYERING ---
        const isCurrentlyDoubleFist = hands.left.active && hands.left.isFist && 
                                       hands.right.active && hands.right.isFist;

        if (isCurrentlyDoubleFist) {
          if (!wasDoubleFistRef.current) {
            // Transition: Both hands just became fists! Freeze and capture this sound wave
            const captureId = Math.random().toString(36).substring(2, 9);
            
            const freq = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, hands.right.x);
            const resonance = (1 - hands.right.y) * MAX_RESONANCE;
            const cutoff = MIN_CUTOFF * Math.pow(MAX_CUTOFF / MIN_CUTOFF, 1 - hands.left.y);
            const lfoRate = MIN_LFO_RATE + (MAX_LFO_RATE - MIN_LFO_RATE) * hands.left.x;

            captureCurrentLayer(
              captureId,
              freq,
              cutoff,
              resonance,
              lfoRate,
              currentSettings.waveform,
              currentSettings
            );

            // Save visual overlay points to state (maintain cap of 5 parallel sound waves)
            setCapturedLayers((prev) => {
              const currentList = [...prev];
              if (currentList.length >= 5) {
                currentList.shift();
              }
              return [
                ...currentList,
                {
                  id: captureId,
                  leftX: hands.left.x,
                  leftY: hands.left.y,
                  rightX: hands.right.x,
                  rightY: hands.right.y,
                  freq,
                  cutoff,
                  waveform: currentSettings.waveform
                }
              ];
            });

            // Disengage real-time live synthesis trigger to indicate it is "clenched"
            triggerOff(currentSettings);
            wasDoubleFistRef.current = true;
          }
        } else {
          if (wasDoubleFistRef.current) {
            // Transition: Released at least one fist! The user started a new wave
            wasDoubleFistRef.current = false;
          }

          // --- LEAD VOICE (RIGHT HAND Control) ---
          if (hands.right.active) {
            const freq = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, hands.right.x);
            const resonance = (1 - hands.right.y) * MAX_RESONANCE;
            
            setFrequency(freq);
            setResonance(resonance);
            triggerOn(currentSettings);
          } else {
            triggerOff(currentSettings);
          }

          // --- FILTER CONDUCTOR (LEFT HAND Control) ---
          if (hands.left.active) {
            const lfoRate = MIN_LFO_RATE + (MAX_LFO_RATE - MIN_LFO_RATE) * hands.left.x;
            setLFORate(lfoRate);
            
            const cutoff = MIN_CUTOFF * Math.pow(MAX_CUTOFF / MIN_CUTOFF, 1 - hands.left.y);
            setCutoff(cutoff);
            
            setLFOAmount(currentSettings.lfoAmount);
          }
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isAudioEnabled, triggerOn, triggerOff, setFrequency, setCutoff, setResonance, setLFORate, setLFOAmount, captureCurrentLayer, clearAllLayers]);

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

      {/* Fixed Header */}
      <header className="h-16 md:h-20 shrink-0 border-b border-white/5 flex justify-between items-center px-4 md:px-8 backdrop-blur-md bg-black/20 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <AudioLines className="text-emerald-400" size={20} />
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">SYNTH <span className="text-emerald-400 underline decoration-emerald-400/30">CONDUCTOR</span></h1>
        </div>
        
        <button 
          onClick={toggleAudio}
          className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-bold transition-all flex items-center gap-2 ${
            isAudioEnabled 
              ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
          }`}
        >
          {isAudioEnabled ? "STOP ENGINE" : "START ENGINE"}
        </button>
      </header>

      {/* Main Container - Scrollable on mobile, Fixed on desktop */}
      <main className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row p-4 md:p-6 gap-4 md:gap-6 relative">
        
        {/* Main Performance Area */}
        <div className="w-full flex-1 flex flex-col gap-4 order-1 md:order-2 md:overflow-hidden">
          <div className="flex-1 min-h-[350px] md:min-h-0 bg-white/5 rounded-[32px] md:rounded-[40px] border border-white/10 relative overflow-hidden group shadow-inner">
             <SpatialPlotBackground stateRef={handStateRef} />

             {/* Camera Status Overlay */}
             <div className="absolute top-4 left-4 z-20">
               <div className="flex items-center gap-2 bg-black/85 border border-white/10 rounded-full px-3.5 py-1.5 text-[10px] font-mono shadow-xl backdrop-blur-md">
                 <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
                 <span className="text-white/40 uppercase tracking-wider text-[9px]">Camera:</span>
                 <span className="text-white font-extrabold">{isCameraReady ? 'CONNECTED' : 'WAITING'}</span>
                 {cameraError && (
                   <span className="text-red-400 text-[8px] bg-red-500/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                     Permission Denied
                   </span>
                 )}
               </div>
             </div>

             {/* Connection threads & Visual markers for Captured Layers */}
             {capturedLayers.map((layer, idx) => (
               <div key={layer.id} className="absolute inset-0 pointer-events-none z-10">
                 {/* Connection thread line */}
                 <svg className="absolute inset-0 w-full h-full">
                   <line 
                     x1={`${layer.leftX * 100}%`} 
                     y1={`${layer.leftY * 100}%`} 
                     x2={`${layer.rightX * 100}%`} 
                     y2={`${layer.rightY * 100}%`} 
                     stroke="rgba(16, 185, 129, 0.15)" 
                     strokeWidth="1.5" 
                     strokeDasharray="6 8"
                     className="animate-pulse"
                   />
                 </svg>

                 {/* Left Hand Captured Point Mark */}
                 <div 
                   className="absolute bg-black/80 rounded-full border border-red-500/30 p-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                   style={{ left: `${layer.leftX * 100}%`, top: `${layer.leftY * 100}%`, transform: 'translate(-50%, -50%)' }}
                 >
                   <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                   <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-neutral-950/80 border border-red-500/20 text-[7px] font-mono font-bold px-1 py-0.5 rounded text-red-400 whitespace-nowrap">
                     {Math.round(layer.cutoff)}Hz
                   </div>
                 </div>

                 {/* Right Hand Captured Point Mark */}
                 <div 
                   className="absolute bg-black/80 rounded-full border border-blue-500/30 p-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
                   style={{ left: `${layer.rightX * 100}%`, top: `${layer.rightY * 100}%`, transform: 'translate(-50%, -50%)' }}
                 >
                   <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                   <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-neutral-950/80 border border-blue-500/20 text-[7px] font-mono font-bold px-1 py-0.5 rounded text-blue-400 whitespace-nowrap">
                     {Math.round(layer.freq)}Hz
                   </div>
                 </div>

                 {/* Middle Waveform Badge */}
                 <div 
                   className="absolute px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1 text-[8px] font-mono tracking-tight shadow-md"
                   style={{ 
                     left: `${((layer.leftX + layer.rightX) / 2) * 100}%`, 
                     top: `${((layer.leftY + layer.rightY) / 2) * 100}%`, 
                     transform: 'translate(-50%, -50%)' 
                   }}
                 >
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                   <span className="text-emerald-300 font-bold uppercase">LAYER {idx + 1}: {layer.waveform}</span>
                 </div>
               </div>
             ))}

             {/* Shaken/Cleared Alert Dialog Overlay */}
             {showClearedAlert && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md z-30 transition-all">
                 <div className="bg-neutral-900 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl p-6 md:p-8 max-w-[280px] md:max-w-sm text-center">

                   <h3 className="text-base md:text-lg font-bold mb-1 text-emerald-400 tracking-tight">LAYERS CLEARED</h3>
                   <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-widest font-mono">Captured sound layers cleared</p>
                 </div>
               </div>
             )}

             <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] md:text-[10px] text-red-500/30 font-mono tracking-widest uppercase origin-left pointer-events-none">Filter Conduct (LEFT)</div>
             <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 rotate-90 text-[8px] md:text-[10px] text-blue-500/30 font-mono tracking-widest uppercase origin-right pointer-events-none">Lead Voice (RIGHT)</div>

             {!isAudioEnabled && (
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md bg-black/40 z-20">
                   <div className="text-center p-6 md:p-8 bg-black border border-white/10 rounded-3xl max-w-[280px] md:max-w-sm">
                      <Zap className="mx-auto mb-4 text-emerald-400" size={40} />
                      <h3 className="text-lg md:text-xl font-bold mb-2">Conductor Mode</h3>
                      <p className="text-white/40 text-xs md:text-sm mb-6">Left: Filter Cutoff + LFO Rate<br/>Right: Pitch + Resonance</p>
                      <button onClick={toggleAudio} className="bg-emerald-500 text-black px-6 md:px-8 py-2 md:py-3 rounded-full text-sm md:text-base font-bold shadow-lg">START CONDUCTING</button>
                   </div>
                </div>
             )}

             <PerformancePointer state={handStateRef.current} />
          </div>

          {/* Legend Strip */}
          <div className="h-auto md:h-24 py-4 md:py-0 shrink-0 bg-white/5 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center px-6 md:px-8 justify-between gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Hand className="text-blue-500/40 shrink-0" size={24} />
                    <div className="text-[10px] font-mono leading-tight">
                        <span className="block text-blue-400 font-bold">RIGHT HAND (LEAD)</span>
                        <span className="text-white/30 uppercase tracking-tighter">X: Pitch / Y: Resonance • Fist to Capture</span>
                    </div>
                  </div>
                  <div className="hidden md:block w-px h-8 bg-white/10" />
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Hand className="text-red-500/40 shrink-0" size={24} />
                    <div className="text-[10px] font-mono leading-tight">
                        <span className="block text-red-400 font-bold">LEFT HAND (FILTER)</span>
                        <span className="text-white/30 uppercase tracking-tighter">X: LFO Rate / Y: Cutoff • Fist to Capture</span>
                    </div>
                  </div>
              </div>
              
              <div className="text-center md:text-right w-full md:w-auto hidden md:block">
                  <div className="text-[10px] text-white/20 uppercase tracking-tighter mb-1 font-bold">Engine Output</div>
                  <div className="flex items-center justify-center md:justify-end gap-3">
                    <div className="flex flex-col items-center md:items-end">
                       <span className={`text-[9px] font-mono ${handStateRef.current.left.active ? 'text-red-400' : 'text-white/10'}`}>FLT_STAGE</span>
                       <span className={`text-[9px] font-mono ${handStateRef.current.right.active ? 'text-blue-400' : 'text-white/10'}`}>OSC_LEAD</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isCameraReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  </div>
              </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full md:w-80 flex flex-col gap-4 md:gap-6 z-10 order-2 md:order-1 md:overflow-y-auto custom-scrollbar md:pb-0 pb-10">
          
          {/* Wave capturing module dashboard */}
          <section className="bg-white/5 p-5 md:p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2 text-white/50 font-bold uppercase text-[10px] tracking-widest">
                <Layers size={14} className="text-emerald-400" /> Layers ({capturedLayers.length}/5)
              </div>
              {capturedLayers.length > 0 && (
                <button 
                  onClick={() => {
                    clearAllLayers();
                    setCapturedLayers([]);
                    showClearNotification();
                  }}
                  className="text-[9px] font-mono text-red-400 px-2.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1"
                >
                  <Trash2 size={10} /> Clear
                </button>
              )}
            </div>

            {capturedLayers.length === 0 ? (
              <div className="text-[10px] font-mono leading-relaxed text-white/30 border border-dashed border-white/15 p-4 rounded-xl text-center">
                Close fingers on BOTH hands to capture current live wave as a persistent layer.
              </div>
            ) : (
              <div className="space-y-2">
                {capturedLayers.map((layer, idx) => (
                  <div key={layer.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="font-bold text-white/80">L{idx + 1} ({layer.waveform})</span>
                    </div>
                    <div className="text-emerald-400/95 font-semibold">
                      {Math.round(layer.freq)}Hz • {Math.round(layer.cutoff)}Hz
                    </div>
                  </div>
                ))}

              </div>
            )}
          </section>

          <section className="bg-white/5 p-5 md:p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4 md:mb-6 text-white/50 font-bold uppercase text-[10px] tracking-widest">
              <Waves size={14} /> Oscillator
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['sine', 'square', 'sawtooth', 'triangle'].map((type) => (
                <button
                  key={type}
                  onClick={() => updateSetting('waveform', type)}
                  className={`py-2 px-3 rounded-xl text-[10px] font-bold capitalize transition-all border ${
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

          <section className="bg-white/5 p-5 md:p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4 md:mb-6 text-white/50 font-bold uppercase text-[10px] tracking-widest">
              <Activity size={14} /> Modulation
            </div>
            <div className="space-y-4 md:space-y-6">
              <ControlSlider 
                label="LFO Rate" 
                value={settings.lfoRate} 
                min={MIN_LFO_RATE} max={MAX_LFO_RATE} step={0.1} 
                onChange={(v) => updateSetting('lfoRate', v)} 
              />
              <ControlSlider 
                label="LFO Depth" 
                value={settings.lfoAmount} 
                min={0} max={4000} step={1} 
                onChange={(v) => updateSetting('lfoAmount', v)} 
              />
            </div>
          </section>

          <section className="bg-white/5 p-5 md:p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4 md:mb-6 text-white/50 font-bold uppercase text-[10px] tracking-widest">
              <Settings2 size={14} /> Master
            </div>
            
            <div className="space-y-4 md:space-y-5">
              <ControlSlider label="Attack" value={settings.attack} min={0.01} max={2} step={0.01} onChange={(v) => updateSetting('attack', v)} />
              <ControlSlider label="Release" value={settings.release} min={0.01} max={3} step={0.01} onChange={(v) => updateSetting('release', v)} />
              <ControlSlider label="Resonance" value={settings.resonance} min={0} max={20} step={0.1} onChange={(v) => updateSetting('resonance', v)} />
              <ControlSlider label="Volume" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => updateSetting('volume', v)} />
            </div>
          </section>
        </div>
      </main>

      <WebcamPreview videoRef={videoRef} resultsRef={lastResultsRef} isCameraReady={isCameraReady} />

      <footer className="h-10 md:h-12 shrink-0 flex items-center justify-center text-center text-[8px] md:text-[10px] text-white/10 uppercase tracking-[0.2em] md:tracking-[0.3em] font-mono pointer-events-none">
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
      
      if (state.left.active) {
        leftHistoryRef.current.push({ x: state.left.x, y: state.left.y, timestamp: now });
      }
      if (state.right.active) {
        rightHistoryRef.current.push({ x: state.right.x, y: state.right.y, timestamp: now });
      }
      
      leftHistoryRef.current = leftHistoryRef.current.filter(p => now - p.timestamp < MAX_HISTORY_MS);
      rightHistoryRef.current = rightHistoryRef.current.filter(p => now - p.timestamp < MAX_HISTORY_MS);

      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      const gridSize = window.innerWidth < 768 ? 40 : 80;
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
          ctx.lineWidth = opacity * (window.innerWidth < 768 ? 4 : 6); 
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
    const [leftPos, setLeftPos] = useState({ x: 0.5, y: 0.5, active: false, isFist: false });
    const [rightPos, setRightPos] = useState({ x: 0.5, y: 0.5, active: false, isFist: false });

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
            {/* FILTER CONDUCOR (LEFT HAND pointer card) */}
            <div 
                className={`absolute transition-opacity duration-300 pointer-events-none z-10 ${leftPos.active ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${leftPos.x * 100}%`, top: `${leftPos.y * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative flex items-center justify-center">
                    <div className={`w-8 md:w-12 h-8 md:h-12 border-2 rounded-full flex items-center justify-center bg-red-500/5 transition-all duration-200 ${leftPos.isFist ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-90' : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'}`}>
                        <div className={`w-1.5 md:w-2.5 h-1.5 md:h-2.5 rounded-full transition-colors duration-200 ${leftPos.isFist ? 'bg-emerald-400' : 'bg-red-500'}`} />
                    </div>
                    <div className={`absolute -top-10 whitespace-nowrap text-[8px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-tighter transition-all duration-200 ${leftPos.isFist ? 'text-emerald-400 bg-black border-emerald-500/30' : 'text-red-400 bg-black/60 border-red-500/20'}`}>
                        {leftPos.isFist ? 'LOCKED' : `FLT: ${Math.round(MIN_CUTOFF * Math.pow(MAX_CUTOFF / MIN_CUTOFF, 1 - leftPos.y))}Hz`}
                    </div>
                </div>
            </div>

            {/* LEAD VOICE (RIGHT HAND pointer card) */}
            <div 
                className={`absolute transition-opacity duration-300 pointer-events-none z-10 ${rightPos.active ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${rightPos.x * 100}%`, top: `${rightPos.y * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative flex items-center justify-center">
                    <div className={`w-12 md:w-16 h-12 md:h-16 border-2 rounded-full flex items-center justify-center bg-blue-500/5 transition-all duration-200 ${rightPos.isFist ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.5)] scale-90' : 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'}`}>
                        <div className={`w-2.5 md:w-3.5 h-2.5 md:h-3.5 rounded-full transition-colors duration-200 ${rightPos.isFist ? 'bg-emerald-400' : 'bg-blue-500'}`} />
                    </div>
                    <div className={`absolute -top-12 whitespace-nowrap text-[8px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-tighter transition-all duration-200 ${rightPos.isFist ? 'text-emerald-400 bg-black border-emerald-500/30' : 'text-blue-400 bg-black/60 border-blue-500/20'}`}>
                        {rightPos.isFist ? 'LOCKED' : `OSC: ${Math.round(MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, rightPos.x))}Hz`}
                    </div>
                </div>
            </div>

            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 pointer-events-none" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 pointer-events-none" />
        </>
    );
}

export default App;
