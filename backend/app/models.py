"""
OVO Backend — Pydantic Models
──────────────────────────────
Response models that enforce the exact JSON shape the Next.js frontend expects.

Frontend contract (from data.ts → TrackNode interface):
{
  id, parent_id, type, stems, bpm, key, mood,
  duration, timestamp, title, file_url
}

The DB stores `created_at` as a timestamptz. The API serializes it into
a human-readable relative string like "Just now" or "5 mins ago".
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, computed_field


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def humanize_timestamp(dt: datetime) -> str:
    """
    Converts a datetime into a human-friendly relative time string.
    Examples: "Just now", "2 mins ago", "1 hour ago", "3 days ago"
    """
    now = datetime.now(timezone.utc)

    # Ensure the input is timezone-aware (Supabase returns UTC)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    diff = now - dt
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins} min{'s' if mins != 1 else ''} ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif seconds < 604800:
        days = seconds // 86400
        return f"{days} day{'s' if days != 1 else ''} ago"
    else:
        return dt.strftime("%b %d, %Y")


# ──────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────

class FragmentResponse(BaseModel):
    """
    The exact JSON shape the Next.js frontend expects for each track node.
    Maps 1:1 to the TypeScript `TrackNode` interface in data.ts.
    """

    id: str = Field(..., description="UUID of the fragment")
    parent_id: str | None = Field(
        None, description="UUID of parent fragment (null = root node)"
    )
    type: Literal["raw_capture", "ai_split"] = Field(
        ..., description="Fragment classification"
    )
    stems: list[str] = Field(
        default_factory=list, description='Instrument stems, e.g. ["guitar", "drums"]'
    )
    bpm: int = Field(0, description="Detected BPM")
    key: str = Field("", description='Musical key, e.g. "A Min"')
    mood: str = Field("", description='AI-generated mood tag, e.g. "Melancholic"')
    duration: str = Field("0:00", description='Formatted duration, e.g. "0:30"')
    timestamp: str = Field(
        "Just now",
        description='Human-readable relative time, e.g. "2 mins ago"',
    )
    title: str = Field("", description='AI-generated title, e.g. "Midnight Acoustic"')
    file_url: str = Field(
        "", description="Public URL to the .wav file in Supabase Storage"
    )
    stem_urls: dict[str, str] = Field(
        default_factory=dict,
        description='URLs to individual stem files, e.g. {"vocals": "https://...", "drums": "https://..."}',
    )

    class Config:
        # Allow creating from ORM / dict objects returned by Supabase
        from_attributes = True


def fragment_from_db_row(row: dict) -> FragmentResponse:
    """
    Converts a raw Supabase DB row (dict) into a FragmentResponse.
    Handles the created_at → timestamp conversion.
    """
    # Parse the created_at timestamp from the DB
    created_at_str = row.get("created_at", "")
    if created_at_str:
        # Supabase returns ISO 8601 strings like "2026-04-18T03:21:43+00:00"
        created_at = datetime.fromisoformat(created_at_str)
        timestamp = humanize_timestamp(created_at)
    else:
        timestamp = "Just now"

    return FragmentResponse(
        id=str(row.get("id", "")),
        parent_id=str(row["parent_id"]) if row.get("parent_id") else None,
        type=row.get("type", "raw_capture"),
        stems=row.get("stems", []),
        bpm=row.get("bpm", 0),
        key=row.get("key", ""),
        mood=row.get("mood", ""),
        duration=row.get("duration", "0:00"),
        timestamp=timestamp,
        title=row.get("title", ""),
        file_url=row.get("file_url", ""),
        stem_urls=row.get("stem_urls", {}),
    )


# ──────────────────────────────────────────────
# Request Models (for Phase 2 — ingest logic)
# ──────────────────────────────────────────────

class IngestResponse(BaseModel):
    """Wrapper for the ingest endpoint response."""
    success: bool = True
    fragment: FragmentResponse
    message: str = "Fragment ingested successfully"


class ScrobbleRequest(BaseModel):
    """Payload sent by the frontend when syncing the current track to ListenBrainz."""
    track_name: str = Field(..., description="The title of the track/fragment")
    artist_name: str = Field(default="OVO User", description="The artist name. Default is 'OVO User'")
    duration: int | None = Field(None, description="Duration in seconds, if known")

class ScrobbleResponse(BaseModel):
    """Result of the ListenBrainz API call."""
    success: bool
    message: str
