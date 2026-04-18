"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Clock, Trash2, Volume2 } from "lucide-react";
import { type TrackNode } from "../data";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";

// Generate a deterministic "waveform" from track id
function generateWaveform(id: string, count: number): number[] {
  const bars: number[] = [];
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed += id.charCodeAt(i);
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    bars.push(0.15 + (seed / 233280) * 0.85);
  }
  return bars;
}

const MOOD_COLORS: Record<string, string> = {
  Melancholic: "#6366f1",
  Driving: "#f59e0b",
  Cyberpunk: "#ec4899",
  Anthemic: "#22d3ee",
  Ethereal: "#a78bfa",
};

const STEM_COLORS: Record<string, string> = {
  vocals: "#ec4899",
  drums: "#ef4444",
  bass: "#8b5cf6",
  other: "#22d3ee",
};

const STEM_LABELS: Record<string, string> = {
  vocals: "Vocals",
  drums: "Drums",
  bass: "Bass",
  other: "Other",
};

interface IdeaCardProps {
  track: TrackNode;
  isPlaying: boolean;
  onTogglePlay: (id: string) => void;
  onDelete: (id: string) => void;
}

function WaveformBar({ height, isPlaying, index }: { height: number; isPlaying: boolean; index: number }) {
  return (
    <motion.div
      className="rounded-full"
      style={{
        width: 3,
        background: "linear-gradient(to top, #22d3ee, #8b5cf6)",
        opacity: 0.6,
        transformOrigin: "bottom",
      }}
      animate={
        isPlaying
          ? { height: [height * 28, Math.random() * 32 + 4, height * 28] }
          : { height: height * 28 }
      }
      transition={
        isPlaying
          ? { duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: index * 0.03, ease: "easeInOut" }
          : { duration: 0.4 }
      }
    />
  );
}

function StemTag({
  stemName,
  stemUrl,
  color,
}: {
  stemName: string;
  stemUrl: string | undefined;
  color: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isStemPlaying, setIsStemPlaying] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!stemUrl) return;

      if (!audioRef.current) {
        audioRef.current = new Audio(stemUrl);
        audioRef.current.onended = () => setIsStemPlaying(false);
      }

      if (isStemPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsStemPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsStemPlaying(true);
      }
    },
    [stemUrl, isStemPlaying]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const hasUrl = !!stemUrl;
  const label = STEM_LABELS[stemName] || stemName;

  return (
    <motion.button
      onClick={handleClick}
      whileHover={hasUrl ? { scale: 1.08 } : {}}
      whileTap={hasUrl ? { scale: 0.95 } : {}}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize transition-all"
      style={{
        background: isStemPlaying ? `${color}30` : `${color}15`,
        color: color,
        border: isStemPlaying ? `1px solid ${color}60` : "1px solid transparent",
        cursor: hasUrl ? "pointer" : "default",
        boxShadow: isStemPlaying ? `0 0 12px ${color}40` : "none",
      }}
      title={hasUrl ? `Click to ${isStemPlaying ? "stop" : "play"} ${label} stem` : `${label} stem (no audio)`}
    >
      {isStemPlaying && <Volume2 size={9} />}
      {label}
    </motion.button>
  );
}

function IdeaCard({ track, isPlaying, onTogglePlay, onDelete }: IdeaCardProps) {
  const waveform = useMemo(() => generateWaveform(track.id, 32), [track.id]);
  const moodColor = MOOD_COLORS[track.mood] || "#64748b";
  const stemUrls = track.stem_urls || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      whileHover={{ y: -4 }}
      className="rounded-2xl p-5 cursor-pointer group"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${isPlaying ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.05)"}`,
        backdropFilter: "blur(40px)",
        boxShadow: isPlaying ? "0 0 40px rgba(34,211,238,0.08)" : "none",
      }}
    >
      {/* Top row: play + title + timestamp */}
      <div className="flex items-start gap-3 mb-4">
        <motion.button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(track.id); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: isPlaying
              ? "linear-gradient(135deg, #22d3ee, #8b5cf6)"
              : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {isPlaying ? <Pause size={14} color="#fff" /> : <Play size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 1 }} />}
        </motion.button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
              {track.title}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
              className="p-1.5 -mr-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:text-red-400 text-white/50"
              title="Delete fragment"
            >
              <Trash2 size={14} className="currentColor" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock size={10} style={{ color: "rgba(255,255,255,0.25)" }} />
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{track.timestamp}</span>
            <span className="text-[10px] ml-1" style={{ color: "rgba(255,255,255,0.2)" }}>· {track.duration}</span>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="flex items-end gap-[2px] h-8 mb-4">
        {waveform.map((h, i) => (
          <WaveformBar key={i} height={h} isPlaying={isPlaying} index={i} />
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}
        >
          {track.bpm} BPM
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}
        >
          {track.key}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: `${moodColor}18`, color: moodColor }}
        >
          {track.mood}
        </span>
        {track.stems.map((s) => (
          <StemTag
            key={s}
            stemName={s}
            stemUrl={stemUrls[s]}
            color={STEM_COLORS[s] || "#64748b"}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface VaultFeedProps {
  tracks: TrackNode[];
  playingId: string | null;
  onTogglePlay: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function VaultFeed({ tracks, playingId, onTogglePlay, onDelete }: VaultFeedProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
          OVO Vault
        </h2>
        <span className="text-[10px] font-mono px-2 py-1 rounded-full" style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.03)" }}>
          {tracks.length} ideas
        </span>
      </div>
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {tracks.map((t) => (
            <IdeaCard
              key={t.id}
              track={t}
              isPlaying={playingId === t.id}
              onTogglePlay={onTogglePlay}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
