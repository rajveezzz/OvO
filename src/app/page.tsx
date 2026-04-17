"use client";

import { useState, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import EvolutionTree from "./components/EvolutionTree";
import VaultFeed from "./components/VaultFeed";
import BottomPlayer from "./components/BottomPlayer";
import { MOCK_TRACKS, type LibraryFilter, type StemFilter, type TrackNode } from "./data";

export default function DashboardPage() {
  const [activeLibrary, setActiveLibrary] = useState<LibraryFilter>("All");
  const [activeStems, setActiveStems] = useState<StemFilter[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>("v1");

  const handleStemToggle = useCallback((stem: StemFilter) => {
    setActiveStems((prev) =>
      prev.includes(stem) ? prev.filter((s) => s !== stem) : [...prev, stem]
    );
  }, []);

  const handleTogglePlay = useCallback((id: string) => {
    setPlayingId((prev) => (prev === id ? null : id));
    setActiveTrackId(id);
  }, []);

  const filteredTracks = useMemo(() => {
    let result = MOCK_TRACKS;

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
  }, [activeLibrary, activeStems]);

  const activeTrack: TrackNode | null =
    MOCK_TRACKS.find((t) => t.id === (playingId || activeTrackId)) || null;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#030303" }}>
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
        {/* Evolution Tree */}
        <EvolutionTree
          activeTrackId={activeTrackId}
          onSelectTrack={(id) => setActiveTrackId(id)}
        />

        {/* Vault Feed */}
        <AnimatePresence mode="wait">
          <VaultFeed
            key={`${activeLibrary}-${activeStems.join(",")}`}
            tracks={filteredTracks}
            playingId={playingId}
            onTogglePlay={handleTogglePlay}
          />
        </AnimatePresence>
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
