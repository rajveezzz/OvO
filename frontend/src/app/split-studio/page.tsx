"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, Pause, AudioLines, GitCommit, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TrackNode } from "../data"; // Reusing the type if available, otherwise defining a local one

interface LocalTrackNode {
  id: string;
  title: string;
  bpm: number;
  key: string;
  mood: string;
  stem_urls: Record<string, string>;
}

const STEM_COLORS: Record<string, string> = {
  vocals: "#ec4899",
  drums: "#ef4444",
  bass: "#8b5cf6",
  other: "#22d3ee",
};

export default function SplitStudioPage() {
  const [activeSplit, setActiveSplit] = useState<LocalTrackNode | null>(null);
  const [availableSplits, setAvailableSplits] = useState<LocalTrackNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [solos, setSolos] = useState<Record<string, boolean>>({});

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("http://localhost:8000/api/v1/fragments?limit=50");
        if (!res.ok) throw new Error("Failed to fetch fragments");
        const data: LocalTrackNode[] = await res.json();
        
        // Find fragments with stems
        const withStems = data.filter(t => t.stem_urls && Object.keys(t.stem_urls).length > 0);
        setAvailableSplits(withStems);
        if (withStems.length > 0) {
          setActiveSplit(withStems[0]);
        } else {
          setError("No fragments with isolated stems found.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Update audio properties when mutes/solos change
  useEffect(() => {
    if (!activeSplit) return;
    const stems = Object.keys(activeSplit.stem_urls);
    const hasSolo = stems.some(s => solos[s]);

    stems.forEach(stem => {
      const audio = audioRefs.current[stem];
      if (audio) {
        audio.muted = hasSolo ? !solos[stem] : !!mutes[stem];
      }
    });
  }, [mutes, solos, activeSplit]);

  const togglePlay = () => {
    if (!activeSplit) return;
    const stems = Object.keys(activeSplit.stem_urls);
    
    if (isPlaying) {
      stems.forEach(stem => audioRefs.current[stem]?.pause());
      setIsPlaying(false);
    } else {
      stems.forEach(stem => {
        const audio = audioRefs.current[stem];
        if (audio) {
          audio.play().catch(e => console.warn("Play blocked:", e));
        }
      });
      setIsPlaying(true);
    }
  };

  const setAudioRef = (stem: string, el: HTMLAudioElement | null) => {
    if (el) {
      audioRefs.current[stem] = el;
      el.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const toggleMute = (stem: string) => {
    setMutes(prev => ({ ...prev, [stem]: !prev[stem] }));
    if (solos[stem]) {
      setSolos(prev => ({ ...prev, [stem]: false }));
    }
  };

  const toggleSolo = (stem: string) => {
    setSolos(prev => ({ ...prev, [stem]: !prev[stem] }));
    if (mutes[stem]) {
      setMutes(prev => ({ ...prev, [stem]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-cyan-400"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !activeSplit) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/40 mb-4">{error || "No active split found."}</p>
        <Link href="/vault" className="text-cyan-400 text-sm hover:underline">
          Return to Vault
        </Link>
      </div>
    );
  }

  const stems = Object.entries(activeSplit.stem_urls || {});

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
      {/* Ambient glowing void backgrounds */}
      <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vh] bg-[radial-gradient(ellipse,_#4c1d95_0%,_transparent_70%)] opacity-20 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(ellipse,_#0891b2_0%,_transparent_70%)] opacity-15 blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-6 z-50 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link href="/vault">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={18} className="text-white/70" />
            </motion.button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-wide text-white/50 uppercase">Live Split Studio</h1>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            {availableSplits.length > 0 && (
              <div className="relative flex items-center">
                <select
                  value={activeSplit?.id || ""}
                  onChange={(e) => setActiveSplit(availableSplits.find(s => s.id === e.target.value) || null)}
                  className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full pl-4 pr-10 py-1.5 text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer appearance-none transition-colors hover:bg-white/10 text-xs font-semibold tracking-wide shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                >
                  {availableSplits.map(split => (
                    <option key={split.id} value={split.id} className="bg-[#111] text-white py-1">
                      {split.title} ({Object.keys(split.stem_urls || {}).length} Stems)
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 pointer-events-none text-white/40 text-[10px]">
                  ▼
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pt-28 pb-32 px-6 max-w-4xl mx-auto relative z-10 flex flex-col gap-10">
        
        {/* 2. The Top Panel (Groq AI Co-Producer Insights) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-8 overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(40px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}
        >
          {/* Subtle inner top glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
                {activeSplit.title}
              </h2>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{activeSplit.bpm} BPM</span>
                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">{activeSplit.key}</span>
              </div>
            </div>
            
            <motion.div 
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            >
              <Sparkles size={16} className="text-indigo-400" />
            </motion.div>
          </div>

          <div className="bg-white/5 rounded-xl p-5 border border-white/5 relative">
            <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-semibold tracking-widest uppercase">
              <GitCommit size={12} />
              Sonic Lineage & Analysis
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Analyzed mood: <span className="text-white font-medium">{activeSplit.mood}</span>. 
              The Groq Co-Producer isolated {stems.length} distinct stems from this fragment. Master compression and stem isolation are primed for re-balancing.
            </p>
          </div>
        </motion.div>

        {/* Master Controls */}
        <div className="flex justify-center -mt-2 mb-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)] cursor-pointer relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)"
            }}
          >
            {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
          </motion.button>
        </div>

        {/* 3. The Live Multi-Track Studio (The Stems) */}
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {stems.map(([stemName, url], i) => {
              const color = STEM_COLORS[stemName] || "#ffffff";
              const isMuted = mutes[stemName];
              const isSolo = solos[stemName];
              
              const isAudible = isPlaying && (!mutes[stemName] && (!Object.values(solos).some(Boolean) || solos[stemName]));
              
              // CSS pseudo-waveform visualization
              const fakeData = generateWaveform(activeSplit.id + stemName, 60);

              return (
                <motion.div
                  key={stemName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                  className="relative h-20 rounded-2xl flex items-center px-5 gap-4 group"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    opacity: (!isPlaying || isAudible) ? 1 : 0.4
                  }}
                >
                  <audio
                    ref={(el) => setAudioRef(stemName, el)}
                    src={url}
                    preload="auto"
                  />

                  {/* Stem Info */}
                  <div className="w-24 flex flex-col gap-1">
                    <span 
                      className="text-xs font-bold tracking-wider uppercase drop-shadow-lg"
                      style={{ color }}
                    >
                      {stemName}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleMute(stemName)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isMuted ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        M
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleSolo(stemName)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isSolo ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        S
                      </motion.button>
                    </div>
                  </div>

                  {/* Waveform Visualization */}
                  <div className="flex-1 flex items-center gap-[3px] h-8 opacity-60">
                    {fakeData.map((val, idx) => (
                      <motion.div
                        key={idx}
                        className="w-1 rounded-full"
                        style={{ background: color, transformOrigin: "center" }}
                        animate={{ height: isAudible ? val * 32 : 4 }}
                        transition={{ duration: 0.3, repeat: isAudible ? Infinity : 0, repeatType: "mirror", delay: idx * 0.05 }}
                      />
                    ))}
                  </div>

                  {/* Activity Indicator pulse */}
                  <motion.div 
                    animate={{ opacity: isAudible ? [0.2, 0.8, 0.2] : 0.1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      </main>

      {/* 4. The "Stitch / Branch" Action */}
      <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-50">
        <motion.button
          whileHover={{ scale: 1.02, textShadow: "0px 0px 8px rgba(255,255,255,1)" }}
          whileTap={{ scale: 0.98 }}
          className="pointer-events-auto flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-shadow"
        >
          <GitBranch size={16} />
          Commit Mix to Branch
        </motion.button>
      </div>

    </div>
  );
}
