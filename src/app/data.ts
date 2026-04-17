export interface TrackNode {
  id: string;
  parent: string | null;
  type: "raw_capture" | "ai_split";
  stems: string[];
  bpm: number;
  key: string;
  mood: string;
  duration: string;
  timestamp: string;
  title: string;
}

export const MOCK_TRACKS: TrackNode[] = [
  { id: "v1", parent: null, type: "raw_capture", stems: ["guitar"], bpm: 110, key: "A Min", mood: "Melancholic", duration: "0:30", timestamp: "Just now", title: "Midnight Acoustic" },
  { id: "v2", parent: "v1", type: "ai_split", stems: ["guitar", "drums"], bpm: 110, key: "A Min", mood: "Driving", duration: "0:45", timestamp: "2 mins ago", title: "Midnight + Beat" },
  { id: "v3", parent: null, type: "raw_capture", stems: ["synth"], bpm: 124, key: "F# Min", mood: "Cyberpunk", duration: "0:15", timestamp: "1 hour ago", title: "Neon Arp" },
  { id: "v4", parent: "v2", type: "ai_split", stems: ["guitar", "drums", "bass"], bpm: 110, key: "A Min", mood: "Anthemic", duration: "1:02", timestamp: "5 mins ago", title: "Midnight Full Band" },
  { id: "v5", parent: "v3", type: "ai_split", stems: ["synth", "vocals"], bpm: 124, key: "F# Min", mood: "Ethereal", duration: "0:38", timestamp: "30 mins ago", title: "Neon Vox" },
];

export const LIBRARY_FILTERS = ["All", "Raw Captures", "AI Splits"] as const;
export const STEM_FILTERS = ["Guitar", "Drums", "Bass", "Vocals", "Synth"] as const;

export type LibraryFilter = typeof LIBRARY_FILTERS[number];
export type StemFilter = typeof STEM_FILTERS[number];
