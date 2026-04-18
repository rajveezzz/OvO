"""
OVO Daemon — Background Audio Listener
────────────────────────────────────────
Zero-friction audio capture daemon that runs in the background,
listens to the system microphone, and automatically captures
musical ideas when it detects audio activity.

Flow:
  1. Opens the default microphone via sounddevice
  2. Runs Silero VAD (Voice Activity Detection) on audio chunks
  3. When audio activity is detected, starts recording
  4. When silence returns, saves the buffer as a .wav file
  5. POSTs the .wav to the OVO backend ingest endpoint
  6. Returns to listening state

Dependencies (install when ready):
  pip install sounddevice torch scipy

Usage:
  python -m daemon.listener
  # or
  python -m daemon.listener --threshold 0.5 --silence-ms 2000
"""

import argparse
import io
import logging
import sys
import time
import wave
from collections import deque
from datetime import datetime
from pathlib import Path

try:
    import numpy as np
    import sounddevice as sd
    import torch
    from scipy.io import wavfile
except ImportError as e:
    print(
        "═══════════════════════════════════════════════════════\n"
        "  OVO Daemon — Missing dependencies\n"
        "═══════════════════════════════════════════════════════\n"
        "\n"
        "  The audio daemon requires these packages:\n"
        "    pip install sounddevice torch scipy numpy\n"
        "\n"
        "  Note: torch is ~2GB. Install only when you're\n"
        "  ready to use background audio capture.\n"
        "═══════════════════════════════════════════════════════"
    )
    sys.exit(1)

import httpx

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ovo.daemon")


# ──────────────────────────────────────────────
# Silero VAD Loader
# ──────────────────────────────────────────────

def load_vad_model() -> tuple:
    """
    Downloads and loads the Silero VAD model.
    Returns: (model, utils)
    """
    logger.info("Loading Silero VAD model...")
    model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        onnx=False,
    )
    logger.info("✓ Silero VAD loaded")
    return model, utils


# ──────────────────────────────────────────────
# Audio Buffer → WAV bytes
# ──────────────────────────────────────────────

def buffer_to_wav_bytes(audio_chunks: list[np.ndarray], sample_rate: int) -> bytes:
    """Concatenates audio chunks and encodes as WAV bytes."""
    audio = np.concatenate(audio_chunks, axis=0)
    # Ensure int16 format
    if audio.dtype == np.float32:
        audio = (audio * 32767).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)  # mono
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(audio.tobytes())

    return buf.getvalue()


# ──────────────────────────────────────────────
# Ingest Client
# ──────────────────────────────────────────────

def send_to_ingest(wav_bytes: bytes, filename: str, backend_url: str) -> bool:
    """
    POSTs a .wav file to the OVO backend ingest endpoint.
    Returns True on success, False on failure.
    """
    try:
        url = f"{backend_url}/api/v1/ingest"
        files = {"file": (filename, wav_bytes, "audio/wav")}

        response = httpx.post(url, files=files, timeout=60.0)

        if response.status_code == 200:
            data = response.json()
            fragment = data.get("fragment", {})
            logger.info(
                f"✅ Ingested: \"{fragment.get('title', 'Untitled')}\" "
                f"({fragment.get('key', '?')}, {fragment.get('bpm', '?')} BPM)"
            )
            return True
        else:
            logger.warning(f"⚠ Ingest failed ({response.status_code}): {response.text[:200]}")
            return False

    except Exception as e:
        logger.error(f"❌ Failed to send to backend: {e}")
        return False


# ──────────────────────────────────────────────
# Main Listener Loop
# ──────────────────────────────────────────────

def run_listener(
    threshold: float = 0.5,
    silence_duration_ms: int = 2000,
    min_recording_ms: int = 1000,
    sample_rate: int = 16000,
    chunk_size_ms: int = 32,
    backend_url: str = "http://localhost:8000",
    save_local: bool = False,
    output_dir: str = "./captures",
):
    """
    Main listener loop.

    Args:
        threshold: VAD confidence threshold (0.0–1.0). Higher = less sensitive.
        silence_duration_ms: How long silence must last to stop recording.
        min_recording_ms: Minimum recording length to submit (avoids noise blips).
        sample_rate: Audio sample rate. Silero VAD expects 16000.
        chunk_size_ms: Size of each audio chunk to process (32, 64, or 96ms).
        backend_url: URL of the OVO backend API.
        save_local: If True, also save captures locally.
        output_dir: Directory for local saves.
    """
    # Load VAD model
    model, _ = load_vad_model()

    chunk_samples = int(sample_rate * chunk_size_ms / 1000)
    silence_chunks = int(silence_duration_ms / chunk_size_ms)
    min_chunks = int(min_recording_ms / chunk_size_ms)

    logger.info("═══════════════════════════════════════════")
    logger.info("  OVO Daemon — Listening")
    logger.info(f"  Sample rate: {sample_rate} Hz")
    logger.info(f"  VAD threshold: {threshold}")
    logger.info(f"  Silence timeout: {silence_duration_ms}ms")
    logger.info(f"  Backend: {backend_url}")
    logger.info("  Press Ctrl+C to stop")
    logger.info("═══════════════════════════════════════════")

    recording = False
    audio_buffer: list[np.ndarray] = []
    silent_count = 0
    capture_count = 0

    def audio_callback(indata: np.ndarray, frames: int, time_info, status):
        nonlocal recording, audio_buffer, silent_count, capture_count

        if status:
            logger.warning(f"Audio status: {status}")

        # Get mono audio as float32 tensor
        chunk = indata[:, 0].copy()
        tensor = torch.from_numpy(chunk).float()

        # Run VAD
        confidence = model(tensor, sample_rate).item()

        if confidence >= threshold:
            # Activity detected
            if not recording:
                recording = True
                audio_buffer = []
                silent_count = 0
                logger.info("🎙️  Activity detected — recording...")

            audio_buffer.append(chunk)
            silent_count = 0

        elif recording:
            # Still recording but silence detected
            audio_buffer.append(chunk)
            silent_count += 1

            if silent_count >= silence_chunks:
                # Silence timeout — stop recording
                recording = False

                if len(audio_buffer) >= min_chunks:
                    capture_count += 1
                    duration_sec = len(audio_buffer) * chunk_size_ms / 1000
                    logger.info(
                        f"🔴 Capture #{capture_count} complete "
                        f"({duration_sec:.1f}s, {len(audio_buffer)} chunks)"
                    )

                    # Convert to WAV
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"capture_{timestamp}.wav"
                    wav_bytes = buffer_to_wav_bytes(audio_buffer, sample_rate)

                    # Save locally if requested
                    if save_local:
                        out_path = Path(output_dir)
                        out_path.mkdir(parents=True, exist_ok=True)
                        local_file = out_path / filename
                        local_file.write_bytes(wav_bytes)
                        logger.info(f"  💾 Saved locally: {local_file}")

                    # Send to backend
                    send_to_ingest(wav_bytes, filename, backend_url)

                else:
                    duration_sec = len(audio_buffer) * chunk_size_ms / 1000
                    logger.info(
                        f"  ⏭️  Too short ({duration_sec:.1f}s), discarding"
                    )

                audio_buffer = []
                silent_count = 0

    # Open audio stream
    try:
        with sd.InputStream(
            samplerate=sample_rate,
            channels=1,
            dtype="float32",
            blocksize=chunk_samples,
            callback=audio_callback,
        ):
            logger.info("🎧 Microphone stream opened — waiting for sound...")
            while True:
                time.sleep(0.1)

    except KeyboardInterrupt:
        logger.info("\n👋 Daemon stopped by user")
    except Exception as e:
        logger.error(f"❌ Audio stream error: {e}")
        raise


# ──────────────────────────────────────────────
# CLI Entry Point
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="OVO Daemon — Zero-friction background audio capture",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python -m daemon.listener\n"
            "  python -m daemon.listener --threshold 0.3 --silence-ms 1500\n"
            "  python -m daemon.listener --save-local --output-dir ./my-captures\n"
        ),
    )
    parser.add_argument(
        "--threshold", type=float, default=0.5,
        help="VAD confidence threshold 0.0–1.0 (default: 0.5)",
    )
    parser.add_argument(
        "--silence-ms", type=int, default=2000,
        help="Silence duration (ms) to stop recording (default: 2000)",
    )
    parser.add_argument(
        "--min-ms", type=int, default=1000,
        help="Minimum recording length (ms) to submit (default: 1000)",
    )
    parser.add_argument(
        "--backend", type=str, default="http://localhost:8000",
        help="Backend API URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--save-local", action="store_true",
        help="Also save captures locally",
    )
    parser.add_argument(
        "--output-dir", type=str, default="./captures",
        help="Directory for local saves (default: ./captures)",
    )

    args = parser.parse_args()

    run_listener(
        threshold=args.threshold,
        silence_duration_ms=args.silence_ms,
        min_recording_ms=args.min_ms,
        backend_url=args.backend,
        save_local=args.save_local,
        output_dir=args.output_dir,
    )


if __name__ == "__main__":
    main()
