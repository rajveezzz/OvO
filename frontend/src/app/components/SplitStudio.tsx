"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Play, 
  Pause, 
  SkipBack, 
  Download, 
  ArrowLeft, 
  Mic2, 
  Guitar, 
  Drum, 
  AudioLines, 
  Volume2 
} from "lucide-react";

// --- Types ---
type Stem = {
  id: string;
  name: string;
  color: string;
  bg: string;
  icon: React.ElementType;
  offset: number;
  muted: boolean;
  solo: boolean;
  volume: number;
};

// --- Mock Data ---
const initialData = {
  id: "v2",
  title: "Midnight + Beat (AI Split)",
  duration: 45,
  stems: [
    { id: "s1", name: "Vocals", color: "text-violet-400", bg: "bg-violet-500", icon: Mic2, offset: 0, muted: false, solo: false, volume: 80 },
    { id: "s2", name: "Guitar", color: "text-cyan-400", bg: "bg-cyan-500", icon: Guitar, offset: 20, muted: false, solo: false, volume: 75 },
    { id: "s3", name: "Drums", color: "text-amber-400", bg: "bg-amber-500", icon: Drum, offset: 80, muted: false, solo: false, volume: 90 },
    { id: "s4", name: "Other", color: "text-emerald-400", bg: "bg-emerald-500", icon: AudioLines, offset: 0, muted: false, solo: false, volume: 70 }
  ]
};

export default function SplitStudio({ onBack = () => {} }: { onBack?: () => void }) {
  const [stems, setStems] = useState<Stem[]>(initialData.stems);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // -- Playback Simulation --
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setTime(t => {
          if (t >= initialData.duration) {
            setIsPlaying(false);
            return initialData.duration;
          }
          return t + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = (id: string) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, muted: !s.muted } : s));
  };

  const handleToggleSolo = (id: string) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, solo: !s.solo } : s));
  };
  
  const handleVolume = (id: string, vol: number) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, volume: vol } : s));
  }

  const anySolo = stems.some(s => s.solo);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#030303] text-white overflow-hidden flex flex-col font-sans">
      {/* ── Ambient Background Blobs ── */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vh] rounded-full bg-[#4c1d95] opacity-20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vh] rounded-full bg-[#0891b2] opacity-10 blur-[150px] pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.05] bg-black/40 backdrop-blur-xl">
        {/* Left */}
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={onBack}
            className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] transition-colors border border-white/[0.05]"
          >
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white/90">{initialData.title}</h1>
            <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase mt-0.5">AI Split Studio</p>
          </div>
        </div>

        {/* Center: Transport */}
        <div className="flex items-center justify-center gap-6 flex-1">
          <button 
            onClick={() => setTime(0)}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <SkipBack size={20} />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform"
            style={{ boxShadow: isPlaying ? "0 0 30px rgba(255,255,255,0.4)" : "none" }}
          >
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
          </button>

          <div className="px-4 py-1.5 rounded-lg bg-black/50 border border-white/10 font-mono text-cyan-400 text-sm tracking-widest"
               style={{ textShadow: "0 0 10px rgba(34, 211, 238, 0.5)" }}>
            {formatTime(time)}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center justify-end flex-1">
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)]">
            <Download size={16} />
            Export Mix
          </button>
        </div>
      </header>

      {/* ── Workspace ── */}
      <main className="relative z-10 flex flex-1 overflow-hidden">
        
        {/* Left Column: Track Controls */}
        <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-white/[0.05] bg-black/30 backdrop-blur-2xl z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="h-10 border-b border-white/[0.05] flex items-center px-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Tracks
          </div>
          
          <div className="flex-1 overflow-y-auto pb-20">
            {stems.map((stem) => {
              const isActive = anySolo ? stem.solo : !stem.muted;
              
              return (
                <div 
                  key={stem.id} 
                  className={`h-[110px] border-b border-white/[0.03] p-5 flex flex-col justify-between transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-30'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stem.bg}/10 border border-white/5`}>
                        <stem.icon size={18} className={stem.color} />
                      </div>
                      <span className="font-semibold text-[13px] tracking-wide text-white/90">{stem.name}</span>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleToggleMute(stem.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${stem.muted ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.1]'}`}
                      >
                        M
                      </button>
                      <button 
                        onClick={() => handleToggleSolo(stem.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${stem.solo ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.4)]' : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.1]'}`}
                      >
                        S
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Volume2 size={14} className="text-white/30" />
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={stem.volume}
                      onChange={(e) => handleVolume(stem.id, parseInt(e.target.value))}
                      className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-violet-400 transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Timeline Canvas */}
        <div className="flex-1 relative overflow-x-auto overflow-y-hidden bg-white/[0.01]">
          
          {/* Timeline Header (Ruler) */}
          <div className="sticky top-0 h-10 border-b border-white/[0.05] bg-black/40 backdrop-blur-md z-30 flex items-center">
            {/* Grid markers */}
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="flex-1 min-w-[60px] border-l border-white/[0.05] h-full flex items-end pb-1.5 px-1.5">
                <span className="text-[10px] text-white/30 font-mono tracking-wider">0:{(i * 2).toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>

          {/* Grid Lines Overlay */}
          <div className="absolute inset-0 top-10 pointer-events-none flex w-max min-w-full">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="w-[60px] flex-shrink-0 border-l border-white/[0.02] h-full" />
            ))}
          </div>

          {/* Playhead */}
          <motion.div 
            className="absolute top-0 bottom-0 w-[1px] bg-cyan-400 z-40 pointer-events-none"
            style={{ 
              left: `${(time / initialData.duration) * 100}%`,
              boxShadow: "0 0 15px rgba(34,211,238,1)"
            }}
          >
            <div className="absolute top-0 left-[-5px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-cyan-400" />
          </motion.div>

          {/* Tracks Container */}
          <div className="relative w-max min-w-full h-full" ref={canvasRef}>
            {stems.map((stem) => {
              const isActive = anySolo ? stem.solo : !stem.muted;
              
              return (
                <div key={stem.id} className="h-[110px] border-b border-white/[0.02] relative flex items-center px-4">
                  <motion.div
                    drag="x"
                    dragConstraints={canvasRef}
                    dragElastic={0}
                    dragMomentum={false}
                    initial={{ x: stem.offset }}
                    whileHover={{ scale: 1.01, zIndex: 10, y: -2 }}
                    whileDrag={{ scale: 1.02, zIndex: 20, cursor: "grabbing", y: -4 }}
                    className={`relative h-[80px] rounded-2xl flex items-center justify-center cursor-grab backdrop-blur-xl border border-white/10 transition-all duration-300 ${stem.bg.replace('/20', '/5').replace('500', '500/10')} ${isActive ? 'shadow-xl' : 'grayscale opacity-30 blur-[1px]'}`}
                    style={{ width: "600px" }}
                  >
                    {/* Hover Glow */}
                    <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-10 transition-opacity duration-300 ${stem.bg.replace('/20', '')}`} />
                    
                    {/* Mock Waveform SVG */}
                    <svg width="95%" height="65%" preserveAspectRatio="none" className="opacity-70">
                      <path 
                        d="M0,30 Q10,10 20,30 T40,30 T60,10 T80,30 T100,50 T120,30 T140,10 T160,30 T180,50 T200,30 T220,10 T240,30 T260,30 T280,10 T300,30 T320,50 T340,30 T360,10 T380,30 T400,30 T420,50 T440,30 T460,10 T480,30 T500,50 T520,30 T540,10 T560,30 T580,30 T600,30" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        className={stem.color} 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path 
                        d="M0,30 Q15,40 30,30 T60,30 T90,50 T120,30 T150,10 T180,30 T210,30 T240,50 T270,30 T300,10 T330,30 T360,50 T390,30 T420,10 T450,30 T480,50 T510,30 T540,10 T570,30 T600,30" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        className={stem.color} 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.3"
                      />
                    </svg>
                    
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5 opacity-60">
                      <stem.icon size={12} className={stem.color} />
                      <span className="text-[10px] font-bold tracking-widest text-white uppercase pointer-events-none">
                        {stem.name}
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
}
