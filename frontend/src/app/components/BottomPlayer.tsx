"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, ExternalLink, Mic2
} from "lucide-react";
import { type TrackNode } from "../data";

interface BottomPlayerProps {
  track: TrackNode | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenStudio?: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export default function BottomPlayer({ track, isPlaying, onTogglePlay, onOpenStudio, audioRef }: BottomPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [duration, setDuration] = useState(0);

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
    
    // Set initial volume
    audio.volume = volume;
    
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateTime);
    };
  }, [audioRef, track, isPlaying]);

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
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSync = () => {
    if (!track) return;
    window.open("https://listenbrainz.org/", "_blank");
  };

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.3 }}
      className="fixed bottom-6 left-0 right-0 z-50 mx-auto w-[calc(100%-7rem)] max-w-5xl rounded-2xl px-6 py-4"
      style={{
        background: "rgba(8,8,12,0.75)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(48px)",
        boxShadow: "0 -4px 60px rgba(0,0,0,0.5), 0 0 40px rgba(34,211,238,0.04)",
      }}
    >
      <div className="flex items-center gap-6">
        {/* Left: track info */}
        <div className="flex items-center gap-3 w-60 flex-shrink-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: track
                ? "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))"
                : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {track ? (
              <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                {track.id.toUpperCase()}
              </span>
            ) : (
              <Volume2 size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
              {track?.title || "No track selected"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
              {track ? `${track.key} · ${track.bpm} BPM · ${track.mood}` : "—"}
            </p>
          </div>
        </div>

        {/* Center: controls + scrubber */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
              <Shuffle size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
              <SkipBack size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
            </motion.button>
            <motion.button
              onClick={onTogglePlay}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #22d3ee, #8b5cf6)",
                boxShadow: "0 0 24px rgba(34,211,238,0.3)",
              }}
            >
              {isPlaying ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" style={{ marginLeft: 2 }} />}
            </motion.button>
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
              <SkipForward size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
              <Repeat size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
            </motion.button>
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-3 w-full max-w-md">
            <span className="text-[10px] font-mono w-6 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>
              {formatTime(currentTime)}
            </span>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={handleSeek}
              className="timeline-scrubber flex-1"
            />
            <span className="text-[10px] font-mono w-6" style={{ color: "rgba(255,255,255,0.3)" }}>
              {duration ? formatTime(duration) : (track?.duration || "0:00")}
            </span>
          </div>
        </div>

        {/* Right: ListenBrainz + Volume */}
        <div className="flex items-center gap-4 w-56 justify-end flex-shrink-0">
          <div className="flex items-center gap-2">
            <Volume2 size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolume}
              className="timeline-scrubber w-20"
            />
          </div>

          {track?.type === "ai_split" ? (
            <motion.button
              onClick={onOpenStudio}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(8,145,178,0.15))",
                border: "1px solid rgba(139,92,246,0.3)",
                color: "#c4b5fd",
                boxShadow: "0 0 20px rgba(139,92,246,0.1)",
              }}
            >
              <Mic2 size={12} />
              Open Studio
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSync}
              disabled={!track}
              whileHover={track ? { scale: 1.03 } : {}}
              whileTap={track ? { scale: 0.97 } : {}}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.15))",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#22d3ee",
                boxShadow: "0 0 20px rgba(34,211,238,0.1)",
                opacity: !track ? 0.5 : 1,
                cursor: !track ? "default" : "pointer"
              }}
            >
              <ExternalLink size={12} />
              ListenBrainz
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
