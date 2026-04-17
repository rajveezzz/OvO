"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 40%, #e2e8f0 60%, #64748b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          OVO.
        </h1>
      </div>

      {/* Status Pill */}
      <motion.div
        className="flex items-center gap-2.5 px-4 py-2 rounded-full"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
        whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.1)" }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.7, 1, 0.7],
            boxShadow: [
              "0 0 4px rgba(52,211,153,0.4)",
              "0 0 12px rgba(52,211,153,0.8)",
              "0 0 4px rgba(52,211,153,0.4)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Listening...
        </span>
        <Activity size={13} style={{ color: "rgba(255,255,255,0.25)" }} />
      </motion.div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
          v0.1.0-alpha
        </span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, #4c1d95, #0891b2)",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          R
        </div>
      </div>
    </motion.header>
  );
}
