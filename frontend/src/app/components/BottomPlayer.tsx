"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, MessageSquarePlus, Mic2, Maximize2, Minimize2, X
} from "lucide-react";
import { type TrackNode } from "../data";

interface BottomPlayerProps {
  track: TrackNode | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenStudio?: () => void;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

const MOCK_COMMENTS = [
  { id: 1, timePct: 15, user: "SoundWaveStudio", avatar: "https://i.pravatar.cc/100?img=11", text: "This chord progression from 1:32 is incredible! Where can I get the MIDI? 🎹" },
  { id: 2, timePct: 32, user: "BeatMaker99", avatar: "https://i.pravatar.cc/100?img=33", text: "Drop hits so hard here!" },
  { id: 3, timePct: 58, user: "SynthLord", avatar: "https://i.pravatar.cc/100?img=55", text: "Love the texture and modulation." },
  { id: 4, timePct: 82, user: "AudioNerd", avatar: "https://i.pravatar.cc/100?img=68", text: "Outro mix is flawless." },
];

export default function BottomPlayer({ track, isPlaying, onTogglePlay, onOpenStudio, onClose, audioRef }: BottomPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [duration, setDuration] = useState(0);
  const [hoveredComment, setHoveredComment] = useState<number | null>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  useEffect(() => {
    if (!audioRef || !audioRef.current) return;
    const audio = audioRef.current;
    
    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
        setDuration(audio.duration);
      }
    };
    
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateTime);
    audio.volume = volume;
    
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateTime);
    };
  }, [audioRef, track, isPlaying, volume]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef && audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = val * audioRef.current.duration;
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef && audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Generate stable random heights for waveform
  const waveformBars = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const base = Math.sin(i * 0.1) * 0.5 + 0.5;
      const noise = Math.random() * 0.5;
      return Math.max(0.1, base * noise * 100);
    });
  }, []);

  if (!track) return null;

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={
          isExpanded
            ? { y: "-50%", x: "-50%", top: "50%", left: "50%", bottom: "auto" }
            : { y: 0, x: "-50%", top: "auto", left: "50%", bottom: 32 }
        }
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`fixed z-50 flex flex-col items-center ${
          isExpanded ? "w-[95vw] max-w-6xl" : "w-[calc(100%-4rem)] max-w-5xl"
        }`}
      >
        {/* ─── FLOATING TOP CONTROLS ─── */}
        <div 
          className="mb-4 px-6 py-3 rounded-2xl flex items-center gap-6 relative z-20"
          style={{
            background: "rgba(10, 10, 15, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(34, 211, 238, 0.1)",
          }}
        >
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
            <Shuffle size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
            <SkipBack size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
          </motion.button>
          
          <motion.button
            onClick={onTogglePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer relative"
            style={{
              background: "linear-gradient(135deg, #22d3ee, #8b5cf6)",
              boxShadow: "0 0 30px rgba(34,211,238,0.5)",
            }}
          >
            <div className="absolute inset-0 rounded-full border border-white/20" />
            {isPlaying ? <Pause size={22} color="#fff" /> : <Play size={22} color="#fff" style={{ marginLeft: 3 }} />}
          </motion.button>

          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
            <SkipForward size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
            <Repeat size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
          </motion.button>

          <div className="w-[1px] h-6 bg-white/10 mx-2" />
          
          <motion.button 
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.15 }} 
            whileTap={{ scale: 0.9 }} 
            className="cursor-pointer text-white/50 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </motion.button>

          <motion.button 
            onClick={onClose}
            whileHover={{ scale: 1.15 }} 
            whileTap={{ scale: 0.9 }} 
            className="cursor-pointer text-white/50 hover:text-red-400 transition-colors ml-1"
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* ─── MAIN PLAYER SURFACE ─── */}
        <div 
          className="w-full rounded-[2rem] p-6 relative overflow-visible transition-all duration-500"
          style={{
            background: "linear-gradient(180deg, rgba(20, 20, 25, 0.7) 0%, rgba(10, 10, 15, 0.9) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(60px)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
            height: isExpanded ? "50vh" : "auto",
          }}
        >
          {/* Branding */}
          <div className="absolute top-5 right-6 text-right opacity-60 pointer-events-none">
            <p className="text-[10px] font-bold tracking-widest text-white">ANTIGRAVITY MEDIA PLAYER v1.2</p>
            <p className="text-[8px] font-mono tracking-wider text-white/40 mt-0.5">v1.1</p>
          </div>

          {/* Track Title */}
          <div className="absolute top-5 left-6 pointer-events-none flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 relative">
               <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-purple-500/20" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-white shadow-sm">{track.title}</h3>
               <p className="text-[10px] text-white/50">{track.key} · {track.bpm} BPM</p>
             </div>
          </div>

          {/* ─── WAVEFORM DISPLAY ─── */}
          <div className={`mt-12 w-full flex items-center justify-between gap-[2px] px-2 relative z-10 transition-all duration-500 ${isExpanded ? "h-full pb-20" : "h-24"}`}>
            {waveformBars.map((height, i) => {
              const pct = i / waveformBars.length;
              const isPlayed = pct <= progress;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-colors duration-200"
                  style={{
                    height: `${height}%`,
                    background: isPlayed 
                      ? "linear-gradient(to top, #8b5cf6, #22d3ee)"
                      : "rgba(255,255,255,0.15)",
                    boxShadow: isPlayed ? "0 0 10px rgba(34,211,238,0.3)" : "none",
                  }}
                />
              );
            })}
          </div>

          {/* ─── TIMELINE & COMMENTS ─── */}
          <div className={`flex items-center gap-4 relative transition-all duration-500 ${isExpanded ? "absolute bottom-6 left-6 right-6" : "mt-6"}`}>
            <span className="text-xs font-mono text-white/50 w-10">{formatTime(currentTime)}</span>
            
            <div className="flex-1 relative h-6 flex items-center">
              <div className="absolute left-0 right-0 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div 
                  className="h-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: "linear-gradient(90deg, #8b5cf6, #22d3ee)",
                    boxShadow: "0 0 10px rgba(34,211,238,0.5)"
                  }}
                />
              </div>

              {MOCK_COMMENTS.map((comment) => (
                <div 
                  key={comment.id}
                  className="absolute top-1/2 -translate-y-1/2 -ml-3 z-20"
                  style={{ left: `${comment.timePct}%` }}
                  onMouseEnter={() => setHoveredComment(comment.id)}
                  onMouseLeave={() => setHoveredComment(null)}
                >
                  <img 
                    src={comment.avatar} 
                    alt={comment.user}
                    className="w-6 h-6 rounded-full border border-white/20 cursor-pointer shadow-lg hover:scale-125 transition-transform"
                  />
                  
                  <AnimatePresence>
                    {hoveredComment === comment.id && !isCommentsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl shadow-2xl pointer-events-auto"
                        style={{
                          background: "rgba(240, 240, 245, 0.95)",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <img src={comment.avatar} className="w-5 h-5 rounded-full" />
                          <span className="text-xs font-bold text-gray-900">{comment.user}</span>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                          {comment.text}
                        </p>
                        <button className="mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full text-[10px] font-semibold text-gray-800 transition-colors">
                          Reply
                        </button>
                        
                        <div 
                          className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 -mt-1.5"
                          style={{ background: "rgba(240, 240, 245, 0.95)" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <input 
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer z-30"
              />
              
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full pointer-events-none z-10"
                style={{
                  left: `calc(${progress * 100}% - 8px)`,
                  boxShadow: "0 0 15px rgba(255,255,255,0.8), 0 0 30px rgba(34,211,238,0.6)"
                }}
              />
            </div>
            
            <span className="text-xs font-mono text-white/50 w-10 text-right">
              {duration ? formatTime(duration) : (track?.duration || "0:00")}
            </span>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-4 ml-6 relative">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-white/40" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolume}
                  className="w-16 accent-cyan-400 bg-white/10 h-1 rounded-full cursor-pointer appearance-none"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>

              <button
                onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-lg transition-transform hover:scale-105"
                style={{
                  background: isCommentsOpen 
                    ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,211,238,0.2))"
                    : "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(139,92,246,0.2))",
                  border: isCommentsOpen ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(34,211,238,0.3)",
                  color: "#c4b5fd",
                  boxShadow: isCommentsOpen ? "0 0 30px rgba(139,92,246,0.3)" : "0 0 20px rgba(139,92,246,0.15)",
                }}
              >
                <MessageSquarePlus size={14} />
                COMMENT +
              </button>
              
              {track?.type === "ai_split" && (
                <button
                  onClick={onOpenStudio}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-lg transition-transform hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(34,211,238,0.1))",
                    border: "1px solid rgba(139,92,246,0.3)",
                    color: "#e879f9",
                    boxShadow: "0 0 20px rgba(139,92,246,0.15)",
                  }}
                >
                  <Mic2 size={14} />
                  STUDIO
                </button>
              )}

              {/* COMMENTS SIDE PANEL */}
              <AnimatePresence>
                {isCommentsOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    className={`absolute z-50 rounded-[2rem] p-6 flex flex-col shadow-2xl ${
                      isExpanded 
                        ? "bottom-full right-0 mb-6 w-80 max-h-96" 
                        : "bottom-full right-0 mb-6 w-80 max-h-[360px]"
                    }`}
                    style={{
                      background: "rgba(10, 10, 15, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      backdropFilter: "blur(40px)",
                      boxShadow: "0 20px 80px rgba(0,0,0,0.8)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white">Track Comments</h3>
                      <button onClick={() => setIsCommentsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar pb-2">
                      {MOCK_COMMENTS.map(c => (
                        <div key={c.id} className="flex gap-3 items-start group">
                          <img src={c.avatar} className="w-8 h-8 rounded-full border border-white/10 mt-1 flex-shrink-0" />
                          <div>
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-bold text-white/90">{c.user}</span>
                              <button 
                                onClick={() => {
                                   const pct = c.timePct / 100;
                                   if (audioRef?.current && duration) {
                                     audioRef.current.currentTime = pct * duration;
                                   }
                                }}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors bg-cyan-400/10 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                {formatTime((c.timePct / 100) * duration)}
                              </button>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
                              {c.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 relative flex-shrink-0">
                      <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400/50 transition-colors" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
