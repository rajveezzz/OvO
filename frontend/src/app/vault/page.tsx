"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import EvolutionTree from "../components/EvolutionTree";
import VaultFeed from "../components/VaultFeed";
import BottomPlayer from "../components/BottomPlayer";
import UploadZone from "../components/UploadZone";
import EmptyState from "../components/EmptyState";
import {
  fetchFragments,
  deleteFragment,
  type LibraryFilter,
  type StemFilter,
  type TrackNode,
} from "../data";

export default function DashboardPage() {
  // ── Data state ──
  const [tracks, setTracks] = useState<TrackNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──
  const [activeLibrary, setActiveLibrary] = useState<LibraryFilter>("All");
  const [activeStems, setActiveStems] = useState<StemFilter[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  // ── Audio ref ──
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Fetch fragments on mount ──
  const loadFragments = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchFragments();
      setTracks(data);
      // Auto-select the first track if none selected
      if (data.length > 0 && !activeTrackId) {
        setActiveTrackId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch fragments:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [activeTrackId]);

  useEffect(() => {
    loadFragments();
  }, [loadFragments]);

  // ── Audio playback ──
  useEffect(() => {
    if (!playingId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const track = tracks.find((t) => t.id === playingId);
    if (!track?.file_url) return;

    // Create or update audio element
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.file_url);
    audio.play().catch((e) => console.warn("Audio play failed:", e));
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;

    return () => {
      audio.pause();
    };
  }, [playingId, tracks]);

  // ── Handlers ──
  const handleStemToggle = useCallback((stem: StemFilter) => {
    setActiveStems((prev) =>
      prev.includes(stem) ? prev.filter((s) => s !== stem) : [...prev, stem]
    );
  }, []);

  const handleTogglePlay = useCallback((id: string) => {
    setPlayingId((prev) => (prev === id ? null : id));
    setActiveTrackId(id);
  }, []);

  const handleDeleteTrack = useCallback(async (id: string) => {
    // Optimistic UI update
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setPlayingId((prev) => (prev === id ? null : prev));
    setActiveTrackId((prev) => (prev === id ? null : prev));
    
    // Delete from backend
    const success = await deleteFragment(id);
    if (!success) {
      console.warn("Failed to delete fragment from backend, it might still exist.");
    }
  }, []);

  const handleUploadComplete = useCallback(
    (fragment: TrackNode) => {
      // Prepend the new fragment and select it
      setTracks((prev) => [fragment, ...prev]);
      setActiveTrackId(fragment.id);
    },
    []
  );

  const handleScrollToUpload = useCallback(() => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ── Filtering ──
  const filteredTracks = useMemo(() => {
    let result = tracks;

    if (activeLibrary === "Raw Captures") {
      result = result.filter((t) => t.type === "raw_capture");
    } else if (activeLibrary === "AI Splits") {
      result = result.filter((t) => t.type === "ai_split");
    }

    if (activeStems.length > 0) {
      result = result.filter((t) =>
        activeStems.some((stem) =>
          t.stems.includes(stem.toLowerCase())
        )
      );
    }

    return result;
  }, [activeLibrary, activeStems, tracks]);

  const activeTrack: TrackNode | null =
    tracks.find((t) => t.id === (playingId || activeTrackId)) || null;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#030303" }}
    >
      {/* Aurora ambient blobs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "-20%",
          left: "-10%",
          width: "60vw",
          height: "60vh",
          background: "radial-gradient(ellipse, #4c1d95 0%, transparent 70%)",
          opacity: 0.12,
          filter: "blur(150px)",
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: "-15%",
          right: "-5%",
          width: "50vw",
          height: "50vh",
          background: "radial-gradient(ellipse, #0891b2 0%, transparent 70%)",
          opacity: 0.1,
          filter: "blur(150px)",
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          top: "40%",
          left: "50%",
          width: "40vw",
          height: "40vh",
          background: "radial-gradient(ellipse, #4c1d95 0%, transparent 70%)",
          opacity: 0.06,
          filter: "blur(120px)",
          transform: "translateX(-50%)",
        }}
      />

      {/* Header */}
      <Header />

      {/* Sidebar */}
      <Sidebar
        activeLibrary={activeLibrary}
        activeStems={activeStems}
        onLibraryChange={setActiveLibrary}
        onStemToggle={handleStemToggle}
        trackCount={tracks.length}
      />

      {/* Main content area */}
      <main
        className="pt-20 pb-32 overflow-y-auto"
        style={{
          marginLeft: "17rem",
          marginRight: "1.5rem",
          height: "100vh",
        }}
      >
        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="flex gap-1.5 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    background: "#22d3ee",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <p
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Loading your vault...
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <span className="text-2xl">⚠</span>
            </div>
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Couldn&apos;t connect to OVO backend
            </p>
            <p
              className="text-xs mb-4 max-w-xs"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                loadFragments();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && (
          <>
            {/* Evolution Tree */}
            <EvolutionTree
              tracks={tracks}
              activeTrackId={activeTrackId}
              onSelectTrack={(id) => setActiveTrackId(id)}
            />

            {/* Upload Zone */}
            <div ref={uploadRef}>
              <UploadZone onUploadComplete={handleUploadComplete} />
            </div>

            {/* Empty state or Vault Feed */}
            {tracks.length === 0 ? (
              <EmptyState onUploadClick={handleScrollToUpload} />
            ) : (
              <AnimatePresence mode="wait">
                <VaultFeed
                  key={`${activeLibrary}-${activeStems.join(",")}`}
                  tracks={filteredTracks}
                  playingId={playingId}
                  onTogglePlay={handleTogglePlay}
                  onDelete={handleDeleteTrack}
                />
              </AnimatePresence>
            )}
          </>
        )}
      </main>

      {/* Bottom Player */}
      <BottomPlayer
        track={activeTrack}
        isPlaying={!!playingId}
        onTogglePlay={() =>
          setPlayingId((prev) => (prev ? null : activeTrackId))
        }
      />
    </div>
  );
}
