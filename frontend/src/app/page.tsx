"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  GitFork,
  Mic,
  Music,
  Waves,
  GitBranch,
  Headphones,
  Sparkles,
} from "lucide-react";
import OrbitalNetwork from "./components/OrbitalNetwork";

// ─────────────────────────────────────────────────
// Floating Glass Shape data
// ─────────────────────────────────────────────────

interface FloatingShape {
  id: number;
  x: string;       // CSS position
  y: string;
  width: number;
  height: number;
  borderRadius: string;
  floatDuration: number;
  floatDelay: number;
  floatDistance: number;
  rotateRange: number;
  content: "waveform" | "bpm" | "stem" | "key" | "branch" | "mic" | "node";
}

const SHAPES: FloatingShape[] = [
  {
    id: 1,
    x: "8%",
    y: "18%",
    width: 180,
    height: 120,
    borderRadius: "28px",
    floatDuration: 5.2,
    floatDelay: 0,
    floatDistance: 22,
    rotateRange: 3,
    content: "waveform",
  },
  {
    id: 2,
    x: "78%",
    y: "12%",
    width: 140,
    height: 140,
    borderRadius: "50%",
    floatDuration: 4.6,
    floatDelay: 0.8,
    floatDistance: 18,
    rotateRange: 0,
    content: "node",
  },
  {
    id: 3,
    x: "72%",
    y: "58%",
    width: 200,
    height: 110,
    borderRadius: "24px",
    floatDuration: 5.8,
    floatDelay: 1.2,
    floatDistance: 25,
    rotateRange: 2,
    content: "bpm",
  },
  {
    id: 4,
    x: "4%",
    y: "62%",
    width: 130,
    height: 130,
    borderRadius: "50%",
    floatDuration: 4.2,
    floatDelay: 0.4,
    floatDistance: 20,
    rotateRange: 0,
    content: "mic",
  },
  {
    id: 5,
    x: "88%",
    y: "38%",
    width: 110,
    height: 80,
    borderRadius: "20px",
    floatDuration: 6.0,
    floatDelay: 2.0,
    floatDistance: 16,
    rotateRange: 4,
    content: "stem",
  },
  {
    id: 6,
    x: "18%",
    y: "42%",
    width: 100,
    height: 100,
    borderRadius: "50%",
    floatDuration: 4.8,
    floatDelay: 1.6,
    floatDistance: 24,
    rotateRange: 0,
    content: "branch",
  },
  {
    id: 7,
    x: "55%",
    y: "72%",
    width: 160,
    height: 90,
    borderRadius: "22px",
    floatDuration: 5.4,
    floatDelay: 0.6,
    floatDistance: 20,
    rotateRange: 2.5,
    content: "key",
  },
];

// ─────────────────────────────────────────────────
// Mini Waveform component for glass cards
// ─────────────────────────────────────────────────

function MiniWaveform() {
  const bars = useMemo(() => {
    const result: number[] = [];
    let seed = 42;
    for (let i = 0; i < 24; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      result.push(0.2 + (seed / 233280) * 0.8);
    }
    return result;
  }, []);

  return (
    <div className="flex items-end gap-[2px] h-6">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[2px] bg-gray-400"
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  );
}


// ─────────────────────────────────────────────────
// Content renderer for each floating glass shape
// ─────────────────────────────────────────────────
function ShapeContent({ type }: { type: FloatingShape["content"] }) {
  switch (type) {
    case "waveform":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
          <MiniWaveform />
          <span
            className="text-[9px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Live Capture
          </span>
        </div>
      );
    case "bpm":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-1.5">
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-bold tabular-nums"
              style={{
                background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              124
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              BPM
            </span>
          </div>
          <div className="flex gap-1">
            {[0.6, 1, 0.4, 0.9, 0.7, 0.3, 0.8].map((h, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: 3,
                  background: "#22d3ee",
                  opacity: 0.4,
                }}
                animate={{ height: [h * 12, 4, h * 12] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.08,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      );
    case "stem":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-1.5">
          <Headphones size={18} style={{ color: "rgba(236,72,153,0.7)" }} />
          <span
            className="text-[10px] font-semibold"
            style={{ color: "rgba(236,72,153,0.6)" }}
          >
            Vocal Stem
          </span>
        </div>
      );
    case "key":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-1.5">
          <div className="flex items-center gap-2">
            <Music size={14} style={{ color: "rgba(139,92,246,0.6)" }} />
            <span
              className="text-sm font-bold"
              style={{ color: "rgba(167,139,250,0.8)" }}
            >
              A Min
            </span>
          </div>
          <div className="flex gap-0.5">
            {["C", "D", "E", "F", "G", "A", "B"].map((note, i) => (
              <div
                key={i}
                className="text-[7px] px-1 py-0.5 rounded"
                style={{
                  background:
                    note === "A"
                      ? "rgba(139,92,246,0.25)"
                      : "rgba(255,255,255,0.04)",
                  color:
                    note === "A"
                      ? "rgba(167,139,250,0.9)"
                      : "rgba(255,255,255,0.2)",
                  fontWeight: note === "A" ? 700 : 400,
                }}
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      );
    case "branch":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <GitBranch size={22} style={{ color: "rgba(34,211,238,0.6)" }} />
          <span
            className="text-[8px] font-mono uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            v3.2
          </span>
        </div>
      );
    case "mic":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Mic size={24} style={{ color: "rgba(34,211,238,0.5)" }} />
          </motion.div>
          <div className="flex gap-0.5">
            {[0.3, 0.7, 1, 0.5, 0.8, 0.4].map((o, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{ width: 2, background: "#22d3ee" }}
                animate={{ height: [4, o * 16, 4], opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </div>
      );
    case "node":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))",
              border: "1px solid rgba(34,211,238,0.3)",
              boxShadow: "0 0 30px rgba(34,211,238,0.15)",
            }}
            animate={{
              boxShadow: [
                "0 0 20px rgba(34,211,238,0.1)",
                "0 0 40px rgba(34,211,238,0.25)",
                "0 0 20px rgba(34,211,238,0.1)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={16} style={{ color: "#22d3ee" }} />
          </motion.div>
          <span
            className="text-[8px] font-mono uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Idea Node
          </span>
        </div>
      );
  }
}

// ─────────────────────────────────────────────────
// Single Floating Glass Element
// ─────────────────────────────────────────────────

function FloatingGlassElement({
  shape,
  isExiting,
}: {
  shape: FloatingShape;
  isExiting: boolean;
}) {
  // Random exit direction
  const exitX = shape.x.includes("8") || shape.x.includes("4") || shape.x.includes("1")
    ? -400
    : 400;
  const exitY = shape.y.includes("1") || shape.y.includes("2") || shape.y.includes("3")
    ? -400
    : 400;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        zIndex: 1,
      }}
      initial={{ opacity: 0, scale: 0.6, y: 40 }}
      animate={
        isExiting
          ? {
              opacity: 0,
              scale: 0.3,
              x: exitX,
              y: exitY,
              rotate: exitX > 0 ? 45 : -45,
            }
          : {
              opacity: 1,
              scale: 1,
              y: [0, -shape.floatDistance, 0],
              rotate: [
                -shape.rotateRange,
                shape.rotateRange,
                -shape.rotateRange,
              ],
            }
      }
      transition={
        isExiting
          ? { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
          : {
              opacity: { duration: 1.2, delay: shape.floatDelay * 0.5 },
              scale: { duration: 1.2, delay: shape.floatDelay * 0.5 },
              y: {
                duration: shape.floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: shape.floatDelay,
              },
              rotate: {
                duration: shape.floatDuration * 1.3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: shape.floatDelay,
              },
            }
      }
    >
      <div
        className="w-full h-full"
        style={{
          background: "rgba(255,255,255,0.02)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: shape.borderRadius,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <ShapeContent type={shape.content} />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────
// MAIN LANDING PAGE
// ─────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleEnterVault = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      router.push("/vault");
    }, 900);
  }, [router]);


  return (
    <div
      className="relative w-screen h-screen overflow-x-hidden overflow-y-auto select-none"
      style={{ background: "#000000" }}
    >
      {/* ─── THE VOID: Aurora ambient blobs ─── */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "-25%",
          left: "-15%",
          width: "65vw",
          height: "65vh",
          background:
            "radial-gradient(ellipse, #4c1d95 0%, transparent 70%)",
          opacity: 0.16,
          filter: "blur(150px)",
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "55vw",
          height: "55vh",
          background:
            "radial-gradient(ellipse, #0891b2 0%, transparent 70%)",
          opacity: 0.12,
          filter: "blur(150px)",
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          top: "35%",
          left: "45%",
          width: "35vw",
          height: "35vh",
          background:
            "radial-gradient(ellipse, #7c3aed 0%, transparent 70%)",
          opacity: 0.06,
          filter: "blur(120px)",
          transform: "translateX(-50%)",
        }}
      />
      {/* Subtle warm accent */}
      <motion.div
        className="fixed pointer-events-none"
        style={{
          top: "60%",
          left: "20%",
          width: "30vw",
          height: "25vh",
          background:
            "radial-gradient(ellipse, #0e7490 0%, transparent 70%)",
          opacity: 0.08,
          filter: "blur(140px)",
        }}
        animate={{ opacity: [0.06, 0.1, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />



      {/* ─── HEADER ─── */}
      <AnimatePresence>
        {!isExiting && (
          <motion.header
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Logo */}
            <div className="flex items-center gap-1">
              <span
                className="text-2xl font-bold tracking-tight"
                style={{
                  background:
                    "linear-gradient(135deg, #22d3ee 0%, #a78bfa 50%, #22d3ee 100%)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                OVO
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color: "rgba(255,255,255,0.15)" }}
              >
                .
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl transition-all duration-300 hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <button
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                  backdropFilter: "blur(20px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                }}
              >
                Sign In
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ─── HERO CENTER ─── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100vh] px-6">
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              className="flex flex-col items-center text-center max-w-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Tagline pill */}
              <motion.div
                className="mb-8 px-4 py-1.5 rounded-full flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(20px)",
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Waves size={12} style={{ color: "#22d3ee" }} />
                <span
                  className="text-[11px] font-medium tracking-wider uppercase"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Zero-friction musical version control
                </span>
              </motion.div>

              {/* Main heading */}
              <motion.h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 1,
                  delay: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.95)" }}>
                  Don&apos;t Let the
                </span>
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 40%, #ec4899 70%, #a78bfa 100%)",
                    backgroundSize: "300% 300%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "gradient-shift 6s ease infinite",
                  }}
                >
                  Flow State
                </span>{" "}
                <span style={{ color: "rgba(255,255,255,0.95)" }}>Fade.</span>
              </motion.h1>

              {/* Sub-headline */}
              <motion.p
                className="text-base sm:text-lg max-w-lg leading-relaxed mb-10"
                style={{ color: "rgba(255,255,255,0.4)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                Capture raw ideas in seconds. Let AI split stems, detect keys,
                and tag mood — while you stay in the zone. Every version saved.
                Every branch explorable. Git for your sound.
              </motion.p>

              {/* CTA Button */}
              <motion.button
                onClick={handleEnterVault}
                className="group relative px-8 py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(20px)",
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.15))";
                  e.currentTarget.style.borderColor =
                    "rgba(34,211,238,0.3)";
                  e.currentTarget.style.boxShadow =
                    "0 0 40px rgba(34,211,238,0.12), 0 0 80px rgba(139,92,246,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor =
                    "rgba(255,255,255,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Sweep gradient on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(34,211,238,0.06), transparent)",
                    animation: "sweep 2s linear infinite",
                  }}
                />
                <span className="relative z-10 flex items-center gap-2.5">
                  Create Project
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    →
                  </motion.span>
                </span>
              </motion.button>

              {/* Bottom subtle text */}
              <motion.p
                className="mt-8 text-[11px] font-mono tracking-wider"
                style={{ color: "rgba(255,255,255,0.15)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                CAPTURE · EVOLVE · BRANCH · SYNC
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exit overlay flash */}
        <AnimatePresence>
          {isExiting && (
            <motion.div
              className="fixed inset-0 z-50"
              style={{ background: "#000" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeIn" }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ─── ORBITAL NETWORK (SCROLL DOWN) ─── */}
      <AnimatePresence>
        {!isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <OrbitalNetwork />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BOTTOM GRADIENT FADE ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to top, #000000, transparent)",
        }}
      />



      {/* ─── CSS ANIMATIONS ─── */}
      <style jsx>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
