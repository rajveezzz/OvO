"""
OVO Backend — FastAPI Server (Phase 2: Core Engine)
────────────────────────────────────────────────────
Multi-agent orchestration gateway with full audio pipeline.

Pipeline:
  1. Receive audio file (.wav/.mp3/.flac/.ogg/etc.) → convert to WAV
  2. Librosa   → extract BPM, Key, Duration
  3. Demucs    → source-separate into stems (vocals, drums, bass, other)
  4. Groq AI   → generate creative title + mood from audio metadata
  5. Embeddings→ sentence-transformers vector (384-dim, all-MiniLM-L6-v2)
  6. Supabase  → upload .wav to storage, insert row with embedding

Endpoints:
  GET  /health            → Health check
  GET  /api/v1/fragments  → List all fragments (newest first)
  POST /api/v1/ingest     → Full ingestion pipeline

Run with:
  cd backend
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
import httpx

import librosa
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import (
    FragmentResponse, 
    IngestResponse, 
    ScrobbleRequest, 
    ScrobbleResponse, 
    fragment_from_db_row
)

# ──────────────────────────────────────────────
# Supported audio formats
# ──────────────────────────────────────────────

SUPPORTED_AUDIO_EXTENSIONS = {
    ".wav", ".mp3", ".flac", ".ogg", ".m4a",
    ".aac", ".wma", ".aiff", ".webm", ".opus",
}


def _get_ffmpeg_path() -> str:
    """Returns the path to the bundled ffmpeg binary from imageio-ffmpeg."""
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"  # Fall back to system ffmpeg


def _convert_to_wav(input_path: str, output_wav_path: str) -> None:
    """
    Converts any supported audio file to 16-bit PCM WAV using ffmpeg directly.
    Uses the bundled ffmpeg from imageio-ffmpeg (no system install needed).
    """
    ffmpeg_path = _get_ffmpeg_path()

    result = subprocess.run(
        [
            ffmpeg_path,
            "-y",             # Overwrite output without asking
            "-i", input_path, # Input file
            "-ar", "22050",   # Sample rate (matches librosa default)
            "-ac", "1",       # Mono
            "-sample_fmt", "s16",  # 16-bit PCM
            output_wav_path,
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr[:300]}")

    logger.info(f"  🔄 Converted to WAV: {output_wav_path}")

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ovo")


# ──────────────────────────────────────────────
# Global: Sentence-Transformers model
# ──────────────────────────────────────────────
# CRITICAL: Loaded ONCE at startup via lifespan, never inside /ingest.
# all-MiniLM-L6-v2 produces 384-dimensional vectors.

_embedding_model = None


# ──────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on server startup and shutdown.
    - Initializes the Supabase client
    - Loads the sentence-transformers embedding model ONCE (global)
    - Starts the audio capture daemon as a background process
    """
    global _embedding_model
    import sys

    settings = get_settings()
    logger.info("═══════════════════════════════════════════")
    logger.info("  OVO Backend starting up (Phase 2)")
    logger.info(f"  Supabase: {settings.supabase_url}")
    logger.info(f"  Groq key: {settings.groq_api_key[:8]}...****")
    logger.info("═══════════════════════════════════════════")

    # ─── Initialize Supabase ───
    from app.supabase_client import get_supabase
    client = get_supabase()
    if client:
        logger.info("✓ Supabase connected")
    else:
        logger.warning("⚠ Running WITHOUT Supabase — update backend/.env")

    # ─── Load sentence-transformers model (ONCE, globally) ───
    logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
    try:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("✓ Embedding model loaded (384-dim vectors)")
    except Exception as e:
        logger.warning(f"⚠ Embedding model failed to load: {e}")
        logger.warning("  → Fragments will be inserted WITHOUT embeddings.")

    # ─── Start Audio Daemon Subprocess ───
    daemon_process = None
    try:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        daemon_process = subprocess.Popen(
            [sys.executable, "daemon.py"],
            cwd=backend_dir
        )
        logger.info("✓ Background audio daemon started automatically")
    except Exception as e:
        logger.warning(f"⚠ Failed to start background daemon: {e}")

    yield  # ← Server is running

    logger.info("OVO Backend shutting down")
    if daemon_process:
        logger.info("Shutting down background audio daemon...")
        daemon_process.terminate()
        daemon_process.wait()


# ──────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────

app = FastAPI(
    title="OVO API",
    description="Zero-friction version control for musical ideas",
    version="0.2.0",
    lifespan=lifespan,
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Helpers: Audio Analysis
# ──────────────────────────────────────────────

# Krumhansl-Kessler key profiles
_MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# RMS threshold — stems below this are considered silent
_RMS_SILENCE_THRESHOLD = 0.001


def _estimate_key(y: np.ndarray, sr: int) -> str:
    """Estimates musical key via chroma + Krumhansl-Kessler correlation."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    chroma_mean = chroma_mean / (np.linalg.norm(chroma_mean) + 1e-8)

    best_corr, best_key, best_mode = -2.0, "C", "Maj"

    for shift in range(12):
        rotated = np.roll(chroma_mean, -shift)
        major_corr = np.corrcoef(rotated, _MAJOR_PROFILE)[0, 1]
        if major_corr > best_corr:
            best_corr, best_key, best_mode = major_corr, _NOTE_NAMES[shift], "Maj"
        minor_corr = np.corrcoef(rotated, _MINOR_PROFILE)[0, 1]
        if minor_corr > best_corr:
            best_corr, best_key, best_mode = minor_corr, _NOTE_NAMES[shift], "Min"

    return f"{best_key} {best_mode}"


def _format_duration(seconds: float) -> str:
    """Formats seconds into M:SS string."""
    return f"{int(seconds) // 60}:{int(seconds) % 60:02d}"


# ──────────────────────────────────────────────
# Helpers: Demucs Stem Separation
# ──────────────────────────────────────────────

def _run_demucs(wav_path: str, output_dir: str) -> list[str]:
    """
    Runs Meta's Demucs (htdemucs) via subprocess to separate a track
    into 4 stems: vocals, drums, bass, other.

    Returns a list of active (non-silent) stem names.
    """
    logger.info("  🎛️  Running Demucs source separation...")

    # Run demucs — outputs to <output_dir>/htdemucs/<filename_without_ext>/
    try:
        result = subprocess.run(
            ["demucs", "-n", "htdemucs", "--out", output_dir, wav_path],
            capture_output=True,
            text=True,
            timeout=300,  # 5-minute timeout for long files
        )
    except FileNotFoundError:
        logger.warning("  ⚠ Demucs is not installed — skipping stem separation")
        return []

    if result.returncode != 0:
        logger.warning(f"  ⚠ Demucs failed (code {result.returncode}): {result.stderr[:300]}")
        return []

    # Locate the separated stems directory
    # Demucs outputs to: <output_dir>/htdemucs/<stem_name>/
    wav_name = os.path.splitext(os.path.basename(wav_path))[0]
    stems_dir = os.path.join(output_dir, "htdemucs", wav_name)

    if not os.path.isdir(stems_dir):
        logger.warning(f"  ⚠ Demucs output directory not found: {stems_dir}")
        return []

    # Check each stem's RMS energy to determine which are active
    active_stems = []
    stem_names = ["vocals", "drums", "bass", "other"]

    for stem_name in stem_names:
        stem_path = os.path.join(stems_dir, f"{stem_name}.wav")
        if not os.path.exists(stem_path):
            continue

        try:
            # Load the separated stem and compute RMS energy
            y_stem, _ = librosa.load(stem_path, sr=22050, mono=True)
            rms = float(np.sqrt(np.mean(y_stem ** 2)))

            if rms > _RMS_SILENCE_THRESHOLD:
                active_stems.append(stem_name)
                logger.info(f"    ✓ {stem_name}: ACTIVE (RMS={rms:.4f})")
            else:
                logger.info(f"    · {stem_name}: silent  (RMS={rms:.6f})")
        except Exception as e:
            logger.warning(f"    ⚠ Could not analyze stem '{stem_name}': {e}")

    logger.info(f"  🎛️  Active stems: {active_stems or ['none detected']}")
    return active_stems


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {
        "status": "ok",
        "service": "ovo-backend",
        "version": "0.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "embedding_model_loaded": _embedding_model is not None,
    }


# ──────────────────────────────────────────────
# GET/POST /api/v1/daemon/state — Daemon Control
# ──────────────────────────────────────────────

from pydantic import BaseModel

class DaemonState(BaseModel):
    paused: bool

_daemon_paused = False

@app.get("/api/v1/daemon/state", tags=["daemon"])
async def get_daemon_state():
    return {"paused": _daemon_paused}

@app.post("/api/v1/daemon/state", tags=["daemon"])
async def set_daemon_state(state: DaemonState):
    global _daemon_paused
    _daemon_paused = state.paused
    return {"paused": _daemon_paused}


# ──────────────────────────────────────────────
# GET /api/v1/fragments — List all fragments
# ──────────────────────────────────────────────

@app.get(
    "/api/v1/fragments",
    response_model=list[FragmentResponse],
    summary="List all fragments",
    description="Returns all fragments from the database, newest first.",
)
async def list_fragments(
    limit: int = Query(default=50, ge=1, le=200, description="Max results"),
):
    """
    Fetches all fragments from Supabase, ordered by created_at descending.
    Converts each DB row into the frontend-expected FragmentResponse shape.
    """
    from app.supabase_client import get_supabase

    client = get_supabase()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Update backend/.env with Supabase credentials.",
        )

    try:
        response = (
            client.table("fragments")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        fragments = [fragment_from_db_row(row) for row in response.data]
        logger.info(f"📦 Returning {len(fragments)} fragments")
        return fragments

    except Exception as e:
        logger.error(f"❌ Failed to fetch fragments: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ──────────────────────────────────────────────
# DELETE /api/v1/fragments/{fragment_id}
# ──────────────────────────────────────────────

@app.delete(
    "/api/v1/fragments/{fragment_id}",
    summary="Delete a fragment",
    description="Deletes a fragment from the database.",
)
async def delete_fragment(fragment_id: str):
    """Deletes a fragment from Supabase."""
    from app.supabase_client import get_supabase

    client = get_supabase()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Update backend/.env with Supabase credentials.",
        )

    try:
        response = client.table("fragments").delete().eq("id", fragment_id).execute()
        logger.info(f"🗑️ Deleted fragment {fragment_id}")
        return {"success": True, "message": f"Deleted fragment {fragment_id}"}
    except Exception as e:
        logger.error(f"❌ Failed to delete fragment {fragment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ──────────────────────────────────────────────
# POST /api/v1/ingest — Full Ingestion Pipeline
# ──────────────────────────────────────────────

@app.post(
    "/api/v1/ingest",
    response_model=IngestResponse,
    summary="Ingest an audio file",
    description=(
        "Accepts .wav, .mp3, .flac, .ogg, .m4a, .aac, .aiff, .wma, .webm, .opus. "
        "Non-WAV files are auto-converted to WAV. "
        "Full pipeline: Librosa analysis → Demucs stem separation → "
        "Groq AI tagging → sentence-transformers embedding → "
        "Supabase storage + DB insert."
    ),
)
async def ingest_audio(
    file: UploadFile = File(..., description="The audio file to ingest (.wav, .mp3, .flac, .ogg, .m4a, etc.)"),
    parent_id: str | None = Query(
        default=None,
        description="UUID of the parent fragment (for branching). Leave empty for root.",
    ),
):
    """
    Full ingest pipeline:
      1. Receive audio file → convert to WAV if needed
      2. Librosa  → BPM, Key, Duration
      3. Demucs   → stem separation → active stems list
      4. Groq AI  → creative title + mood (using stems context)
      5. Embed    → sentence-transformers 384-dim vector
      6. Upload   → Supabase Storage (ovo_audio bucket)
      7. Commit   → Insert into fragments table (with embedding)
      8. Cleanup  → Delete temp files guaranteed via finally
    """
    from app.supabase_client import get_supabase

    # ─── Step 0: Validate file type ───
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    file_ext = os.path.splitext(file.filename.lower())[1]
    if file_ext not in SUPPORTED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported format '{file_ext}'. "
                f"Accepted: {', '.join(sorted(SUPPORTED_AUDIO_EXTENSIONS))}"
            ),
        )

    logger.info(f"🎙️ Received file: {file.filename} ({file.size or 'unknown'} bytes)")

    # ─── Step 1: Verify Supabase ───
    client = get_supabase()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Update backend/.env with Supabase credentials.",
        )

    # ─── Step 2: Save to temp file & convert to WAV if needed ───
    fragment_id = str(uuid.uuid4())
    # Save with original extension so pydub/ffmpeg can detect the format
    tmp_original_path = os.path.join(tempfile.gettempdir(), f"temp_{fragment_id}{file_ext}")
    tmp_path = os.path.join(tempfile.gettempdir(), f"temp_{fragment_id}.wav")
    demucs_out_dir = os.path.join(tempfile.gettempdir(), f"demucs_{fragment_id}")

    try:
        # Write uploaded bytes to disk
        file_content = await file.read()
        with open(tmp_original_path, "wb") as f:
            f.write(file_content)
        logger.info(f"  → Saved temp: {tmp_original_path} ({len(file_content)} bytes)")

        # Convert to WAV if the uploaded file isn't already WAV
        if file_ext != ".wav":
            logger.info(f"  🔄 Converting {file_ext} → .wav ...")
            _convert_to_wav(tmp_original_path, tmp_path)
            # Read the converted WAV for later upload to storage
            with open(tmp_path, "rb") as f:
                file_content = f.read()
        else:
            # Already WAV — just rename / use directly
            tmp_path = tmp_original_path

        # ─── Step 3: Librosa analysis (BPM, Key, Duration) ───
        logger.info("  🎵 Running Librosa analysis...")
        y, sr = librosa.load(tmp_path, sr=22050, mono=True)

        # BPM
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = int(round(float(np.atleast_1d(tempo)[0])))

        # Key
        key = _estimate_key(y, sr)

        # Duration
        duration_sec = librosa.get_duration(y=y, sr=sr)
        duration = _format_duration(duration_sec)

        logger.info(f"  🎵 Librosa: {bpm} BPM, {key}, {duration}")

        # ─── Step 4: Demucs stem separation ───
        # HACKATHON OPTIMIZATION: Trim audio to max 20s to make Demucs lightning fast!
        demucs_input_path = tmp_path
        try:
            if duration_sec > 20:
                logger.info("  ✂️  Trimming audio to 20s for ultra-fast stem separation...")
                demucs_input_path = os.path.join(tempfile.gettempdir(), f"trim_{fragment_id}.wav")
                subprocess.run(
                    [_get_ffmpeg_path(), "-y", "-t", "20", "-i", tmp_path, demucs_input_path],
                    capture_output=True, timeout=10
                )
        except Exception as e:
            logger.warning(f"  ⚠ Failed to trim for Demucs: {e}")
            demucs_input_path = tmp_path

        stems = _run_demucs(demucs_input_path, demucs_out_dir)

        # ─── Step 5: Groq AI tagging & Numeric Sequence Title ───
        logger.info("  🤖 Generating AI metadata via Groq...")
        from app.ai_services import generate_metadata_with_stems

        ai_meta = await generate_metadata_with_stems(
            bpm=bpm,
            key=key,
            duration=duration,
            stems=stems,
            filename=file.filename or "",
        )
        
        # Override title with numeric sequence
        try:
            # Query Supabase for total number of fragments
            count_res = client.table("fragments").select("*", count="exact", head=True).execute()
            fragment_count = count_res.count if count_res.count is not None else 0
        except Exception as e:
            logger.warning(f"  ⚠ Failed to count fragments: {e}")
            fragment_count = 0
            
        idea_number = fragment_count + 1
        title = str(idea_number)
        mood = ai_meta["mood"]

        # ─── Step 6: Vector embedding ───
        embedding = None
        if _embedding_model is not None:
            # Concatenate "title - mood" and encode to 384-dim vector
            embed_text = f"{title} - {mood}"
            embedding_vec = _embedding_model.encode(embed_text)
            # Convert numpy array to a Python list for JSON serialization
            embedding = embedding_vec.tolist()
            logger.info(f"  🧠 Embedding: '{embed_text}' → {len(embedding)}-dim vector")
        else:
            logger.warning("  ⚠ Embedding model not loaded — skipping vector")

        # ─── Step 7: Upload to Supabase Storage ───
        storage_path = f"fragments/{fragment_id}.wav"
        file_url = ""
        stem_urls: dict[str, str] = {}

        settings = get_settings()
        base_public_url = f"{settings.supabase_url}/storage/v1/object/public/ovo_audio"

        try:
            client.storage.from_("ovo_audio").upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": "audio/wav"},
            )
            file_url = f"{base_public_url}/{storage_path}"
            logger.info(f"  ☁️  Uploaded to storage: {storage_path}")
        except Exception as e:
            logger.warning(f"  ⚠ Storage upload failed: {e}")

        # ─── Step 7b: Upload individual stems (compressed to MP3 for fast playback) ───
        wav_name = os.path.splitext(os.path.basename(tmp_path))[0]
        stems_dir = os.path.join(demucs_out_dir, "htdemucs", wav_name)

        for stem_name in stems:
            stem_wav_path = os.path.join(stems_dir, f"{stem_name}.wav")
            if not os.path.exists(stem_wav_path):
                continue
            try:
                # Convert WAV → MP3 for fast browser streaming (~35MB → ~2MB)
                stem_mp3_path = os.path.join(stems_dir, f"{stem_name}.mp3")
                ffmpeg_path = _get_ffmpeg_path()
                conv_result = subprocess.run(
                    [ffmpeg_path, "-y", "-i", stem_wav_path,
                     "-codec:a", "libmp3lame", "-b:a", "192k", stem_mp3_path],
                    capture_output=True, text=True, timeout=60,
                )
                if conv_result.returncode != 0:
                    logger.warning(f"  ⚠ Stem MP3 conversion failed ({stem_name}): {conv_result.stderr[:200]}")
                    continue

                with open(stem_mp3_path, "rb") as sf:
                    stem_bytes = sf.read()
                stem_storage_path = f"fragments/{fragment_id}/{stem_name}.mp3"
                client.storage.from_("ovo_audio").upload(
                    path=stem_storage_path,
                    file=stem_bytes,
                    file_options={"content-type": "audio/mpeg"},
                )
                stem_urls[stem_name] = f"{base_public_url}/{stem_storage_path}"
                logger.info(f"  ☁️  Uploaded stem: {stem_storage_path} ({len(stem_bytes) // 1024}KB)")
            except Exception as e:
                logger.warning(f"  ⚠ Stem upload failed ({stem_name}): {e}")

        # ─── Step 8: Database commit ───
        db_record = {
            "id": fragment_id,
            "parent_id": parent_id,       # NULL for root fragments
            "type": "raw_capture",
            "stems": stems,               # e.g. ["vocals", "drums", "bass"]
            "bpm": bpm,
            "key": key,
            "duration": duration,
            "mood": mood,
            "title": title,
            "file_url": file_url,
            "stem_urls": stem_urls,
        }

        # Only include embedding if we successfully generated one
        if embedding is not None:
            db_record["embedding"] = embedding

        result = client.table("fragments").insert(db_record).execute()
        logger.info(f"  💾 Inserted into DB: {fragment_id}")

        # ─── Step 9: Build and return response ───
        fragment = FragmentResponse(
            id=fragment_id,
            parent_id=parent_id,
            type="raw_capture",
            stems=stems,
            bpm=bpm,
            key=key,
            mood=mood,
            duration=duration,
            timestamp="Just now",
            title=title,
            file_url=file_url,
            stem_urls=stem_urls,
        )

        logger.info(
            f"✅ Ingest complete: \"{title}\" "
            f"({key}, {bpm} BPM, {mood}, stems={stems})"
        )

        return IngestResponse(
            success=True,
            fragment=fragment,
            message=f"Fragment '{title}' ingested successfully.",
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"❌ Ingest pipeline failed: {e}\n{tb}")
        raise HTTPException(status_code=500, detail=f"Ingest failed: {str(e)}\n\nTraceback:\n{tb}")
    finally:
        # ─── Guaranteed cleanup: temp files + Demucs output directory ───
        for path in (tmp_original_path, tmp_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                    logger.info(f"  🧹 Cleaned up: {path}")
                except OSError:
                    pass
        if os.path.isdir(demucs_out_dir):
            try:
                shutil.rmtree(demucs_out_dir)
                logger.info(f"  🧹 Cleaned up: {demucs_out_dir}")
            except OSError:
                pass


# ──────────────────────────────────────────────
# Entry point (for running directly)
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
