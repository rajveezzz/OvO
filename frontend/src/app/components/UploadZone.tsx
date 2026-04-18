"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileAudio, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { ingestFile, type TrackNode } from "../data";

interface UploadZoneProps {
  onUploadComplete: (fragment: TrackNode) => void;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState("dragging");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState("idle");
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      const supportedExts = [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".aiff", ".wma", ".webm", ".opus"];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!supportedExts.includes(ext)) {
        setState("error");
        setErrorMsg(`Unsupported format. Accepted: ${supportedExts.join(", ")}`);
        setTimeout(() => {
          setState("idle");
          setErrorMsg("");
        }, 3000);
        return;
      }

      setState("uploading");
      setFileName(file.name);
      setProgress(0);

      try {
        const result = await ingestFile(file, null, (pct) => {
          setProgress(pct);
        });

        setState("success");
        setProgress(100);
        onUploadComplete(result.fragment);

        // Reset after showing success
        setTimeout(() => {
          setState("idle");
          setProgress(0);
          setFileName("");
          setIsExpanded(false);
        }, 2500);
      } catch (err) {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Upload failed");
        setTimeout(() => {
          setState("idle");
          setErrorMsg("");
        }, 4000);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processFile]
  );

  const borderColor =
    state === "dragging"
      ? "rgba(34,211,238,0.4)"
      : state === "uploading"
        ? "rgba(34,211,238,0.2)"
        : state === "success"
          ? "rgba(52,211,153,0.3)"
          : state === "error"
            ? "rgba(239,68,68,0.3)"
            : "rgba(255,255,255,0.06)";

  return (
    <div className="mb-6">
      {/* Toggle button */}
      <AnimatePresence mode="wait">
        {!isExpanded && state === "idle" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(139,92,246,0.08))",
              border: "1px solid rgba(34,211,238,0.15)",
              color: "#22d3ee",
            }}
          >
            <Upload size={14} />
            Upload Audio
          </motion.button>
        )}
      </AnimatePresence>

      {/* Upload zone */}
      <AnimatePresence>
        {(isExpanded || state !== "idle") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div
              className="relative rounded-2xl p-8 text-center cursor-pointer transition-all duration-300"
              style={{
                background:
                  state === "dragging"
                    ? "rgba(34,211,238,0.04)"
                    : "rgba(255,255,255,0.015)",
                border: `2px dashed ${borderColor}`,
                backdropFilter: "blur(20px)",
                boxShadow:
                  state === "dragging"
                    ? "0 0 60px rgba(34,211,238,0.08) inset"
                    : "none",
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                state === "idle" && fileInputRef.current?.click()
              }
            >
              {/* Close button */}
              {state === "idle" && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-3 right-3 p-1 rounded-lg cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                >
                  <X size={14} />
                </motion.button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3,.flac,.ogg,.m4a,.aac,.aiff,.wma,.webm,.opus,audio/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <AnimatePresence mode="wait">
                {/* Idle / Dragging state */}
                {(state === "idle" || state === "dragging") && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <motion.div
                      animate={
                        state === "dragging"
                          ? {
                              scale: [1, 1.15, 1],
                              rotate: [0, 5, -5, 0],
                            }
                          : {}
                      }
                      transition={{ duration: 0.6, repeat: state === "dragging" ? Infinity : 0 }}
                    >
                      <FileAudio
                        size={28}
                        style={{
                          color:
                            state === "dragging"
                              ? "#22d3ee"
                              : "rgba(255,255,255,0.25)",
                        }}
                      />
                    </motion.div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color:
                            state === "dragging"
                              ? "#22d3ee"
                              : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {state === "dragging"
                          ? "Drop it like it's hot 🔥"
                          : "Drag & drop any audio file here"}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "rgba(255,255,255,0.25)" }}
                      >
                        MP3, WAV, FLAC, OGG, M4A, AAC & more
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Uploading state */}
                {state === "uploading" && (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Loader2
                        size={28}
                        style={{ color: "#22d3ee" }}
                      />
                    </motion.div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                      >
                        Processing {fileName}...
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Analyzing BPM, key, generating AI metadata
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="w-full max-w-xs h-1.5 rounded-full overflow-hidden mt-1"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, #22d3ee, #8b5cf6)",
                        }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Success state */}
                {state === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        damping: 10,
                        stiffness: 300,
                      }}
                    >
                      <CheckCircle size={28} style={{ color: "#34d399" }} />
                    </motion.div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#34d399" }}
                    >
                      Fragment created successfully!
                    </p>
                  </motion.div>
                )}

                {/* Error state */}
                {state === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <AlertCircle size={28} style={{ color: "#ef4444" }} />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#ef4444" }}
                    >
                      {errorMsg}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
