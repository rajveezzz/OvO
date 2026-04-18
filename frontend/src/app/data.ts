// ──────────────────────────────────────────────
// OVO — Data Types & API Client
// ──────────────────────────────────────────────

export interface TrackNode {
  id: string;
  parent_id: string | null;
  type: "raw_capture" | "ai_split";
  stems: string[];
  bpm: number;
  key: string;
  mood: string;
  duration: string;
  timestamp: string;
  title: string;
  file_url: string;
}

export const LIBRARY_FILTERS = ["All", "Raw Captures", "AI Splits"] as const;
export const STEM_FILTERS = ["vocals", "drums", "bass", "other"] as const;

export type LibraryFilter = typeof LIBRARY_FILTERS[number];
export type StemFilter = typeof STEM_FILTERS[number];

// ──────────────────────────────────────────────
// API Client
// ──────────────────────────────────────────────

const API_BASE = "http://localhost:8000/api/v1";

/**
 * Fetches all fragments from the backend.
 * Points directly to the FastAPI backend to bypass Next.js payload limits.
 */
export async function fetchFragments(limit: number = 50): Promise<TrackNode[]> {
  const res = await fetch(`${API_BASE}/fragments?limit=${limit}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch fragments: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Uploads a .wav file to the ingest pipeline.
 * Returns the newly created fragment.
 */
export async function ingestFile(
  file: File,
  parentId?: string | null,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; fragment: TrackNode; message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const url = parentId
    ? `${API_BASE}/ingest?parent_id=${parentId}`
    : `${API_BASE}/ingest`;

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Ingest failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

/**
 * Deletes a fragment by ID from the backend.
 */
export async function deleteFragment(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/fragments/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    console.error(`Failed to delete fragment ${id}: ${res.statusText}`);
    return false;
  }

  return true;
}
