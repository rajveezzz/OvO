"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, ExternalLink, Check, Loader2
} from "lucide-react";
import { type TrackNode } from "../data";

interface BottomPlayerProps {
  track: TrackNode | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export default function BottomPlayer({ track, isPlaying, onTogglePlay }: BottomPlayerProps) {
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
            <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
              0:00
            </span>
            <div className="flex-1 relative h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #22d3ee, #8b5cf6)", width: "35%" }}
                layoutId="scrubber-fill"
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white cursor-pointer"
                style={{
                  left: "35%",
                  boxShadow: "0 0 10px rgba(34,211,238,0.5)",
                }}
                whileHover={{ scale: 1.4 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
              />
            </div>
            <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
              {track?.duration || "0:00"}
            </span>
          </div>
        </div>

        {/* Right: ListenBrainz + Volume */}
        <div className="flex items-center gap-4 w-56 justify-end flex-shrink-0">
          <div className="flex items-center gap-2">
            <Volume2 size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
            <div className="w-20 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: "70%", background: "rgba(255,255,255,0.25)" }}
              />
            </div>
          </div>

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
        </div>
      </div>
    </motion.div>
  );
}
