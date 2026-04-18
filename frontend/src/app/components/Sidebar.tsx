"use client";

import { motion } from "framer-motion";
import {
  Layers, Mic, Sparkles, Drum, AudioLines, MicVocal, Waves, CircleDot,
  type LucideIcon,
} from "lucide-react";
import { LIBRARY_FILTERS, STEM_FILTERS, type LibraryFilter, type StemFilter } from "../data";

// Icons mapped to Demucs stem names (lowercase)
const STEM_ICONS: Record<string, LucideIcon> = {
  vocals: MicVocal,
  drums: Drum,
  bass: AudioLines,
  other: Waves,
};

// Display-friendly labels for stems
const STEM_LABELS: Record<string, string> = {
  vocals: "Vocals",
  drums: "Drums",
  bass: "Bass",
  other: "Other",
};

interface SidebarProps {
  activeLibrary: LibraryFilter;
  activeStems: StemFilter[];
  onLibraryChange: (f: LibraryFilter) => void;
  onStemToggle: (s: StemFilter) => void;
  trackCount?: number;
}

const LIBRARY_ICONS: Record<LibraryFilter, LucideIcon> = {
  All: Layers,
  "Raw Captures": Mic,
  "AI Splits": Sparkles,
};

export default function Sidebar({
  activeLibrary, activeStems, onLibraryChange, onStemToggle, trackCount = 0,
}: SidebarProps) {
  return (
    <motion.aside
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
      className="fixed left-4 top-20 bottom-28 w-56 z-40 rounded-2xl overflow-y-auto flex flex-col gap-8 p-5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(40px)",
      }}
    >
      {/* Library */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
          Library
        </p>
        <div className="flex flex-col gap-1">
          {LIBRARY_FILTERS.map((f) => {
            const Icon = LIBRARY_ICONS[f];
            const active = activeLibrary === f;
            return (
              <motion.button
                key={f}
                onClick={() => onLibraryChange(f)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{
                  color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.4)",
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  boxShadow: active ? "0 0 20px rgba(34,211,238,0.06)" : "none",
                }}
              >
                <Icon size={15} style={{ color: active ? "#22d3ee" : "rgba(255,255,255,0.3)" }} />
                {f}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Stem Cloud */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
          Stem Cloud
        </p>
        <div className="flex flex-col gap-1">
          {STEM_FILTERS.map((s) => {
            const Icon = STEM_ICONS[s] || CircleDot;
            const active = activeStems.includes(s);
            const label = STEM_LABELS[s] || s;
            return (
              <motion.button
                key={s}
                onClick={() => onStemToggle(s)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{
                  color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.4)",
                  background: active ? "rgba(139,92,246,0.1)" : "transparent",
                  boxShadow: active ? "0 0 20px rgba(139,92,246,0.08)" : "none",
                }}
              >
                <Icon size={15} style={{ color: active ? "#8b5cf6" : "rgba(255,255,255,0.3)" }} />
                {label}
                {active && (
                  <motion.div
                    layoutId={`stem-dot-${s}`}
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "#8b5cf6" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex justify-between text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          <span>{trackCount} idea{trackCount !== 1 ? "s" : ""}</span>
          <span>OVO v0.2.0</span>
        </div>
      </div>
    </motion.aside>
  );
}
