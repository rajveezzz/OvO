"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, Pause, GitCommit, GitBranch, Loader2 } from "lucide-react";
import { type TrackNode } from "../data";

const STEM_COLORS: Record<string, string> = {
  vocals: "#ec4899",
  drums: "#ef4444",
  bass: "#8b5cf6",
  other: "#22d3ee",
};

// Generate a deterministic fake waveform
function generateWaveform(seedStr: string, count: number): number[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    bars.push(0.2 + (seed / 233280) * 0.8);
  }
  return bars;
}

export default function LiveSplitStudio({ activeSplit }: { activeSplit: TrackNode | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [solos, setSolos] = useState<Record<string, boolean>>({});
  const [isMixing, setIsMixing] = useState(false);

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const handleRemix = async () => {
    if (!activeSplit || !activeSplit.stem_urls || isMixing) return;
    
    // Determine which stems are audible
    const stems = Object.keys(activeSplit.stem_urls);
    const hasSolo = stems.some((s) => solos[s]);
    const stems_to_keep = stems.filter((s) => {
      if (hasSolo) return solos[s]; // If there's a solo, keep only solos
      return !mutes[s];           // Otherwise, keep unmuted
    });

    if (stems_to_keep.length === 0) {
      alert("Please select at least one audible stem to mix.");
      return;
    }

    setIsMixing(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: activeSplit.id,
          stems: stems_to_keep,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Remix failed");
      }

      // Success! Reload vault to fetch the new stitched fragment
      window.location.href = "/vault";
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to mix stems");
      setIsMixing(false);
    }
  };

  // Reset state when track changes
  useEffect(() => {
    setIsPlaying(false);
    setMutes({});
    setSolos({});
    Object.values(audioRefs.current).forEach(a => a?.pause());
  }, [activeSplit?.id]);

  // Update audio properties when mutes/solos change
  useEffect(() => {
    if (!activeSplit || !activeSplit.stem_urls) return;
    const stems = Object.keys(activeSplit.stem_urls);
    const hasSolo = stems.some((s) => solos[s]);

    stems.forEach((stem) => {
      const audio = audioRefs.current[stem];
      if (audio) {
        audio.muted = hasSolo ? !solos[stem] : !!mutes[stem];
      }
    });
  }, [mutes, solos, activeSplit]);

  const togglePlay = () => {
    if (!activeSplit || !activeSplit.stem_urls) return;
    const stems = Object.keys(activeSplit.stem_urls);

    if (isPlaying) {
      stems.forEach((stem) => audioRefs.current[stem]?.pause());
      setIsPlaying(false);
    } else {
      let playbackStarted = false;
      stems.forEach((stem) => {
        const audio = audioRefs.current[stem];
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch((e) => console.warn("Play blocked:", e));
          playbackStarted = true;
        }
      });
      if (playbackStarted) setIsPlaying(true);
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
    setMutes((prev) => ({ ...prev, [stem]: !prev[stem] }));
    if (solos[stem]) {
      setSolos((prev) => ({ ...prev, [stem]: false }));
    }
  };

  const toggleSolo = (stem: string) => {
    setSolos((prev) => ({ ...prev, [stem]: !prev[stem] }));
    if (mutes[stem]) {
      setMutes((prev) => ({ ...prev, [stem]: false }));
    }
  };

  if (!activeSplit || !activeSplit.stem_urls || Object.keys(activeSplit.stem_urls).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Sparkles size={32} className="text-indigo-400/20 mb-4" />
        <p className="text-white/40 text-sm font-medium">Select an AI split from the constellation to view studio.</p>
      </div>
    );
  }

  // To prevent main track IDs with __stem being treated as their parent here
  // we ensure we are loading the parent track's stems. If they clicked a stem in the tree, we should resolve to parent?
  // Let's assume activeSplit is properly passed.
  const stemEntries = Object.entries(activeSplit.stem_urls);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 flex flex-col gap-10 mt-8 mb-32 max-w-4xl mx-auto w-full font-sans"
    >
      {/* 2. The Top Panel (Groq AI Co-Producer Insights) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-8 overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(40px)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
              {activeSplit.title}
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {activeSplit.bpm} BPM
              </span>
              <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {activeSplit.key}
              </span>
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
            Analyzed mood: <span className="text-white font-medium">{activeSplit.mood}</span>. The
            Groq Co-Producer isolated {stemEntries.length} distinct stems from this fragment. Master
            compression and stem isolation are primed for re-balancing.
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
            backdropFilter: "blur(10px)",
          }}
        >
          {isPlaying ? (
            <Pause size={24} className="text-white" />
          ) : (
            <Play size={24} className="text-white ml-1" />
          )}
        </motion.button>
      </div>

      {/* 3. The Live Multi-Track Studio (The Stems) */}
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {stemEntries.map(([stemName, url], i) => {
            const color = STEM_COLORS[stemName] || "#ffffff";
            const isMuted = mutes[stemName];
            const isSolo = solos[stemName];

            const isAudible =
              isPlaying &&
              (!mutes[stemName] && (!Object.values(solos).some(Boolean) || solos[stemName]));

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
                  opacity: !isPlaying || isAudible ? 1 : 0.4,
                }}
              >
                <audio ref={(el) => setAudioRef(stemName, el)} src={url} preload="auto" />

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
                        isMuted
                          ? "bg-red-500/20 text-red-400 border border-red-500/50"
                          : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      M
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleSolo(stemName)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        isSolo
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                          : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white"
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
                      transition={{
                        duration: 0.3,
                        repeat: isAudible ? Infinity : 0,
                        repeatType: "mirror",
                        delay: idx * 0.05,
                      }}
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

      {/* The "Stitch / Branch" Action */}
      <div className="flex justify-center mt-6">
        <motion.button
          onClick={handleRemix}
          disabled={isMixing}
          whileHover={!isMixing ? { scale: 1.02, textShadow: "0px 0px 8px rgba(255,255,255,1)" } : {}}
          whileTap={!isMixing ? { scale: 0.98 } : {}}
          className={`flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all ${
            isMixing ? "opacity-70 cursor-not-allowed" : "hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]"
          }`}
        >
          {isMixing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Compressing & Stitching...
            </>
          ) : (
            <>
              <GitBranch size={16} />
              Commit Mix to Branch
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
