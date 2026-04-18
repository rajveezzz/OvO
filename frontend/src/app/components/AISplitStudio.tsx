"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  Download,
  Volume2,
  Mic2,
  Drum,
  Guitar,
  Music2,
  AudioLines
} from "lucide-react";

import { TrackNode } from "../data";

// ─── STEM TYPES & STYLES ───────────────────────────────────────────────────────
const COLOR_MAP: Record<string, any> = {
  vocals: { Icon: Mic2, accent: "#a78bfa", glow: "rgba(167,139,250,0.35)", border: "rgba(167,139,250,0.25)", bg: "rgba(139,92,246,0.10)", waveColor: "#c4b5fd" },
  guitar: { Icon: Guitar, accent: "#22d3ee", glow: "rgba(34,211,238,0.35)", border: "rgba(34,211,238,0.25)", bg: "rgba(8,145,178,0.10)", waveColor: "#67e8f9" },
  drums: { Icon: Drum, accent: "#fbbf24", glow: "rgba(251,191,36,0.35)", border: "rgba(251,191,36,0.20)", bg: "rgba(217,119,6,0.10)", waveColor: "#fcd34d" },
  bass: { Icon: Guitar, accent: "#ef4444", glow: "rgba(239,68,68,0.35)", border: "rgba(239,68,68,0.25)", bg: "rgba(220,38,38,0.10)", waveColor: "#fca5a5" },
  other: { Icon: Music2, accent: "#10b981", glow: "rgba(16,185,129,0.35)", border: "rgba(16,185,129,0.25)", bg: "rgba(5,150,105,0.10)", waveColor: "#6ee7b7" },
};

// ─── WAVEFORM GENERATOR ───────────────────────────────────────────────────────
function generateWavePoints(seed: number, count = 80) {
  const pts = [];
  let phase = seed * 2.3;
  for (let i = 0; i < count; i++) {
    phase += 0.18 + Math.sin(i * 0.07 + seed) * 0.08;
    const amp =
      0.2 +
      0.55 * Math.abs(Math.sin(phase)) +
      0.15 * Math.abs(Math.sin(phase * 2.3 + seed)) +
      0.1 * Math.abs(Math.sin(phase * 0.5));
    pts.push(Math.min(1, amp));
  }
  return pts;
}

const WAVE_CACHE: Record<string, number[]> = {};

// ─── STEM WAVEFORM SVG ───────────────────────────────────────────────────────
function StemWaveform({ stem, width = 600, height = 56 }: any) {
  if (!WAVE_CACHE[stem.id]) {
    WAVE_CACHE[stem.id] = generateWavePoints(stem.name.length * 3.7 + 1.1);
  }
  const pts = WAVE_CACHE[stem.id];
  const barW = width / pts.length;
  const cy = height / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`wg-${stem.id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={stem.waveColor} stopOpacity="0.25" />
          <stop offset="20%" stopColor={stem.waveColor} stopOpacity="0.9" />
          <stop offset="80%" stopColor={stem.waveColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={stem.waveColor} stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={`wg2-${stem.id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stem.waveColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={stem.waveColor} stopOpacity="0.04" />
        </linearGradient>
        <filter id={`blur-${stem.id}`}>
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Actual bars */}
      {pts.map((amp, i) => {
        const bh = amp * (cy - 2);
        const x = i * barW + barW * 0.2;
        const bw = barW * 0.55;
        return (
          <rect
            key={i}
            x={x}
            y={cy - bh}
            width={bw}
            height={bh * 2}
            rx={bw / 2}
            fill={`url(#wg-${stem.id})`}
          />
        );
      })}
    </svg>
  );
}

// ─── DRAGGABLE AUDIO REGION ───────────────────────────────────────────────────
function AudioRegion({ stem, isDimmed, constraintRef, onOffsetChange }: any) {
  const x = useMotionValue(stem.offset);
  const [hovered, setHovered] = useState(false);

  const opacity = isDimmed ? 0.22 : 1;
  const regionWidth = 600;

  return (
    <motion.div
      drag="x"
      dragConstraints={constraintRef}
      dragElastic={0.04}
      dragMomentum={false}
      style={{ x, width: regionWidth, cursor: "grab" }}
      whileDrag={{ cursor: "grabbing", scale: 1.012 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onDragEnd={(_, info) => {
        onOffsetChange(stem.id, x.get());
      }}
      animate={{ opacity }}
      transition={{ opacity: { duration: 0.25 } }}
    >
      <motion.div
        animate={{
          boxShadow: hovered
            ? `0 0 0 1px ${stem.border}, 0 0 28px ${stem.glow}, 0 8px 32px rgba(0,0,0,0.5)`
            : `0 0 0 1px ${stem.border}, 0 0 14px rgba(0,0,0,0.0), 0 4px 16px rgba(0,0,0,0.3)`,
          y: hovered ? -3 : 0,
        }}
        transition={{ duration: 0.22 }}
        style={{
          background: stem.bg,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 10,
          overflow: "hidden",
          padding: "6px 10px 8px",
          position: "relative",
          userSelect: "none",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: stem.accent, marginBottom: 4, opacity: 0.8 }}>
          {stem.name}
        </div>
        <StemWaveform stem={stem} width={regionWidth - 20} height={52} />
      </motion.div>
    </motion.div>
  );
}

// ─── TIMECODE ─────────────────────────────────────────────────────────────────
function Timecode({ seconds }: { seconds: number }) {
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(seconds % 60)).padStart(2, "0");
  const ms = String(Math.floor((seconds % 1) * 10)).padStart(1, "0");

  return (
    <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 400, color: "#e2e8f0", display: "flex", alignItems: "center", textShadow: "0 0 20px rgba(139,92,246,0.7)" }}>
      <span>00</span>
      <span style={{ color: "#475569", margin: "0 1px" }}>:</span>
      <span>{mm}</span>
      <span style={{ color: "#475569", margin: "0 1px" }}>:</span>
      <span>{ss}</span>
      <span style={{ color: "#475569", fontSize: 14, marginLeft: 3, alignSelf: "flex-end", marginBottom: 2 }}>.{ms}</span>
    </div>
  );
}

// ─── TIMELINE RULER ───────────────────────────────────────────────────────────
function TimelineRuler({ duration, width }: any) {
  const markers = [];
  const step = 5;
  const pxPerSec = width / duration;

  for (let t = 0; t <= duration; t += step) {
    const x = t * pxPerSec;
    markers.push(
      <div key={t} style={{ position: "absolute", left: x, top: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "rgba(148,163,184,0.5)", marginBottom: 2 }}>{t}s</span>
        <div style={{ width: 1, height: t % 15 === 0 ? 10 : 6, background: "rgba(148,163,184,0.35)" }} />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: 28, width, borderBottom: "1px solid rgba(148,163,184,0.07)", marginBottom: 4 }}>
      {markers}
    </div>
  );
}

// ─── VOLUME SLIDER ────────────────────────────────────────────────────────────
function VolumeSlider({ accent, volume, onChange }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Volume2 size={11} color="rgba(148,163,184,0.5)" />
      <div style={{ position: "relative", flex: 1, height: 3 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${volume}%`, borderRadius: 2, background: accent, opacity: 0.7 }} />
        <input type="range" min="0" max="100" value={volume} onChange={(e) => onChange(Number(e.target.value))} style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", margin: 0, height: "100%" }} />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function AISplitStudio({ track, onBack }: { track: TrackNode, onBack: () => void }) {
  const [stems, setStems] = useState(() => {
    return Object.entries(track.stem_urls || {}).map(([name, url], i) => {
      const style = COLOR_MAP[name.toLowerCase()] || COLOR_MAP.other;
      return {
        id: `s${i}`,
        name: name,
        url: url,
        ...style,
        offset: 0,
        muted: false,
        solo: false,
        volume: 80,
      };
    });
  });

  const duration = parseInt(track.duration.replace('s', '')) || 45;
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const canvasRef = useRef(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  const canvasWidth = 800;

  // Init Audio
  useEffect(() => {
    stems.forEach(stem => {
      if (!audioRefs.current[stem.id]) {
        const a = new Audio(stem.url);
        a.preload = "auto";
        audioRefs.current[stem.id] = a;
      }
    });
    return () => {
      Object.values(audioRefs.current).forEach(a => {
        a.pause();
        a.src = "";
      });
    };
  }, [stems]);

  // Sync mute, solo, volume
  useEffect(() => {
    const soloActive = stems.some((s) => s.solo);
    stems.forEach(stem => {
      const audio = audioRefs.current[stem.id];
      if (audio) {
        audio.muted = stem.muted || (soloActive && !stem.solo);
        audio.volume = stem.volume / 100;
      }
    });
  }, [stems]);

  // Playback control
  useEffect(() => {
    if (playing) {
      Object.values(audioRefs.current).forEach(a => {
        a.currentTime = elapsed;
        a.play().catch(console.error);
      });
      
      const interval = setInterval(() => {
        const firstAudio = Object.values(audioRefs.current)[0];
        if (firstAudio) {
          setElapsed(firstAudio.currentTime);
          if (firstAudio.ended) setPlaying(false);
        }
      }, 50);
      return () => clearInterval(interval);
    } else {
      Object.values(audioRefs.current).forEach(a => a.pause());
    }
  }, [playing]);

  const rewind = () => {
    setElapsed(0);
    setPlaying(false);
    Object.values(audioRefs.current).forEach(a => a.currentTime = 0);
  };

  const handleOffsetChange = (id: string, pxOffset: number) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, offset: pxOffset } : s));
    
    // Convert px to seconds offset
    const secOffset = pxOffset / (canvasWidth / duration);
    // Realistically to apply this offset, we'd need Web Audio API DelayNodes, 
    // but for simple sync we just pause/play or update currentTime. 
    // For this prototype, the visual offset updates state but HTMLAudioElement plays in sync.
  };

  const isDimmed = (stem: any) => {
    if (stem.muted) return true;
    if (stems.some(s => s.solo) && !stem.solo) return true;
    return false;
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#030303", color: "#e2e8f0", position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 100 }}>
      {/* Background blobs */}
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60vw", height: "60vh", borderRadius: "50%", background: "#4c1d95", opacity: 0.15, filter: "blur(120px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vh", borderRadius: "50%", background: "#0891b2", opacity: 0.1, filter: "blur(150px)", pointerEvents: "none" }} />

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: "20px 32px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(24px)", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
          <button onClick={onBack} style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, background: "transparent", color: "white", cursor: "pointer" }}>
            <ArrowLeft size={14} /> Vault
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{track.title}</div>
            <div style={{ fontSize: 11, color: "gray" }}>AI Split Studio</div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Timecode seconds={elapsed} />
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={rewind} style={{ padding: 8, borderRadius: "50%", background: "transparent", border: "1px solid gray", color: "white", cursor: "pointer" }}><SkipBack size={16} /></button>
            <button onClick={() => setPlaying(!playing)} style={{ padding: 8, borderRadius: "50%", background: "white", color: "black", cursor: "pointer", boxShadow: playing ? "0 0 20px rgba(255,255,255,0.5)" : "none" }}>
              {playing ? <Pause size={16} color="black" /> : <Play size={16} color="black" fill="black" />}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <button style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 20px", background: "#7c3aed", borderRadius: 10, border: "none", color: "white", cursor: "pointer" }}>
            <Download size={16} /> Export Mix
          </button>
        </div>
      </motion.header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", zIndex: 10 }}>
        {/* Sidebar */}
        <div style={{ width: 260, padding: 24, borderRight: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.3)", zIndex: 20 }}>
          {stems.map((stem) => (
            <div key={stem.id} style={{ height: 88, marginBottom: 12, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", opacity: isDimmed(stem) ? 0.4 : 1, transition: "opacity 0.3s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <stem.Icon size={16} color={stem.accent} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{stem.name}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setStems(p => p.map(s => s.id === stem.id ? { ...s, muted: !s.muted } : s))} style={{ width: 24, height: 24, background: stem.muted ? "rgba(239,68,68,0.2)" : "transparent", border: "1px solid gray", color: stem.muted ? "#ef4444" : "gray", borderRadius: 4, cursor: "pointer" }}>M</button>
                  <button onClick={() => setStems(p => p.map(s => s.id === stem.id ? { ...s, solo: !s.solo } : s))} style={{ width: 24, height: 24, background: stem.solo ? `${stem.accent}44` : "transparent", border: "1px solid gray", color: stem.solo ? stem.accent : "gray", borderRadius: 4, cursor: "pointer" }}>S</button>
                </div>
              </div>
              <VolumeSlider accent={stem.accent} volume={stem.volume} onChange={(v: number) => setStems(p => p.map(s => s.id === stem.id ? { ...s, volume: v } : s))} />
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, padding: 24, overflow: "hidden", position: "relative" }}>
          <TimelineRuler duration={duration} width={canvasWidth} />
          <div ref={canvasRef} style={{ position: "relative", width: canvasWidth, height: "100%", background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 80px)" }}>
            <motion.div style={{ position: "absolute", top: 0, left: `${(elapsed / duration) * 100}%`, width: 1, height: "100%", background: "cyan", zIndex: 30, boxShadow: "0 0 10px cyan" }} />
            
            {stems.map((stem) => (
              <div key={stem.id} style={{ height: 88, marginBottom: 12, position: "relative", display: "flex", alignItems: "center" }}>
                <AudioRegion stem={stem} isDimmed={isDimmed(stem)} constraintRef={canvasRef} onOffsetChange={handleOffsetChange} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
