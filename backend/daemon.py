"""
OVO Daemon — Zero-Friction Background Audio Capture
─────────────────────────────────────────────────────
Runs locally, captures the microphone using Silero VAD, and
POSTs captured musical ideas to the OVO FastAPI backend.

State Machine:
  IDLE      → Listening for audio activity (VAD confidence < threshold)
  CAPTURING → Recording audio chunks (VAD confidence ≥ threshold)
  SILENCE   → Confidence dropped, counting silence duration
  SENDING   → 3.0s of silence elapsed — exporting + uploading

Flow:
  1. Load Silero VAD from torch.hub
  2. Open sounddevice InputStream at 16000 Hz
  3. Run VAD on each audio chunk
  4. When VAD fires → start recording
  5. When 3.0s of continuous silence → trim, save, POST to /api/v1/ingest
  6. Clear buffer, delete local .wav, return to IDLE

Dependencies:
  pip install sounddevice torch scipy numpy requests

Usage:
  cd backend
  python daemon.py
  python daemon.py --threshold 0.4 --backend http://localhost:8000
"""

import argparse
import os
import sys
import time
import threading
from datetime import datetime

# ──────────────────────────────────────────────
# Dependency Guard
# ──────────────────────────────────────────────
# Provide a clear error message if optional deps are missing.

try:
    import numpy as np
    import sounddevice as sd
    import torch
    from scipy.io import wavfile
    import requests
except ImportError as e:
    print(
        "\n"
        "  ╔══════════════════════════════════════════════════════╗\n"
        "  ║        OVO DAEMON — MISSING DEPENDENCIES            ║\n"
        "  ╠══════════════════════════════════════════════════════╣\n"
        "  ║                                                      ║\n"
        "  ║  Install the required packages:                      ║\n"
        "  ║                                                      ║\n"
        "  ║    pip install sounddevice torch scipy numpy requests ║\n"
        "  ║                                                      ║\n"
        f"  ║  Missing: {str(e):<43}║\n"
        "  ║                                                      ║\n"
        "  ╚══════════════════════════════════════════════════════╝\n"
    )
    sys.exit(1)


# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────

SAMPLE_RATE = 16000          # Silero VAD requires exactly 16000 Hz
CHUNK_DURATION_MS = 32       # 32ms chunks (512 samples at 16kHz) — required by Silero VAD v5+
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION_MS / 1000)  # = 512
SILENCE_TRIGGER_SEC = 3.0    # 3 seconds of silence = idea is finished
MIN_RECORDING_SEC = 1.0      # Ignore recordings shorter than 1 second

# Derived: how many silent chunks = 3.0s
SILENCE_CHUNKS_NEEDED = int(SILENCE_TRIGGER_SEC * 1000 / CHUNK_DURATION_MS)  # ~94

# Terminal colors (ANSI escape codes)
CYAN    = "\033[96m"
GREEN   = "\033[92m"
RED     = "\033[91m"
YELLOW  = "\033[93m"
MAGENTA = "\033[95m"
BOLD    = "\033[1m"
DIM     = "\033[2m"
RESET   = "\033[0m"


# ──────────────────────────────────────────────
# Pretty Printing
# ──────────────────────────────────────────────

def _banner():
    """Prints the startup banner."""
    print(f"""
{CYAN}{BOLD}
  ╔══════════════════════════════════════════════════════╗
  ║                                                      ║
  ║          ██████╗ ██╗   ██╗ ██████╗                   ║
  ║         ██╔═══██╗██║   ██║██╔═══██╗                  ║
  ║         ██║   ██║██║   ██║██║   ██║                  ║
  ║         ██║   ██║╚██╗ ██╔╝██║   ██║                  ║
  ║         ╚██████╔╝ ╚████╔╝ ╚██████╔╝                  ║
  ║          ╚═════╝   ╚═══╝   ╚═════╝                   ║
  ║                                                      ║
  ║       Z E R O - F R I C T I O N   D A E M O N       ║
  ║       ─────────────────────────────────────────      ║
  ║       Capture musical ideas. Automatically.          ║
  ║       Press [Enter] anytime to Pause/Resume.         ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
{RESET}""")


def _status(icon: str, label: str, detail: str = "", color: str = CYAN):
    """Prints a formatted status line."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    line = f"  {DIM}{timestamp}{RESET}  {color}{BOLD}[ {icon} {label} ]{RESET}"
    if detail:
        line += f"  {DIM}{detail}{RESET}"
    print(line, flush=True)


# ──────────────────────────────────────────────
# Silero VAD Loader
# ──────────────────────────────────────────────

def _load_vad():
    """
    Downloads and loads the Silero VAD model from torch.hub.
    Returns the VAD model callable.
    """
    _status("⏳", "LOADING", "Downloading Silero VAD model...", YELLOW)

    model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        onnx=False,
    )

    _status("✅", "VAD READY", "Silero VAD loaded successfully", GREEN)
    return model


# ──────────────────────────────────────────────
# WAV Export
# ──────────────────────────────────────────────

def _save_wav(audio_chunks: list, filename: str) -> str:
    """
    Concatenates audio chunks and saves as a 16kHz mono WAV file.
    Returns the absolute path to the saved file.

    CRITICAL FIX: sounddevice captures audio as float32 in the range [-1.0, 1.0],
    but mic input can exceed ±1.0 (clipping peaks, gain spikes). If we just do
    `(audio * 32767).astype(np.int16)`, values outside [-32768, 32767] silently
    wrap around in numpy, producing near-silent or distorted audio.

    The fix: multiply → clamp → cast. This guarantees Demucs receives full-volume,
    correctly normalized 16-bit PCM audio.
    """
    # Concatenate all numpy arrays in the buffer
    audio = np.concatenate(audio_chunks, axis=0)

    # ── Float32 → Int16 normalization with proper clamping ──
    # Step 1: Scale from [-1.0, 1.0] float range to [-32767, 32767] int range
    # Step 2: Clamp to prevent int16 overflow (values outside ±1.0 are common)
    # Step 3: Cast to int16 — now safe because all values are in-range
    if audio.dtype == np.float32:
        scaled = audio * 32767.0
        clamped = np.clip(scaled, -32768, 32767)
        audio = clamped.astype(np.int16)

    # Write using scipy
    filepath = os.path.join(os.getcwd(), filename)
    wavfile.write(filepath, SAMPLE_RATE, audio)

    _status("🔊", "AUDIO OK", f"Peak amplitude: {np.max(np.abs(audio))}/32767", CYAN)

    return filepath


# ──────────────────────────────────────────────
# POST to OVO API
# ──────────────────────────────────────────────

def _send_to_api(filepath: str, backend_url: str) -> bool:
    """
    POSTs the WAV file as multipart/form-data to the OVO ingest endpoint.
    Returns True on success, False on failure.
    """
    url = f"{backend_url}/api/v1/ingest"

    try:
        with open(filepath, "rb") as f:
            files = {"file": (os.path.basename(filepath), f, "audio/wav")}
            response = requests.post(url, files=files, timeout=120)

        if response.status_code == 200:
            data = response.json()
            frag = data.get("fragment", {})
            title = frag.get("title", "Untitled")
            mood = frag.get("mood", "?")
            bpm = frag.get("bpm", "?")
            key = frag.get("key", "?")
            stems = frag.get("stems", [])

            _status("✅", "INGESTED", f'"{title}" — {mood} · {key} · {bpm} BPM · stems={stems}', GREEN)
            return True
        else:
            _status("❌", "API ERROR", f"HTTP {response.status_code}: {response.text[:150]}", RED)
            return False

    except requests.exceptions.ConnectionError:
        _status("❌", "CONN ERROR", f"Cannot reach {backend_url} — is the server running?", RED)
        return False
    except Exception as e:
        _status("❌", "SEND FAIL", str(e)[:100], RED)
        return False


# ──────────────────────────────────────────────
# Main Listener (State Machine)
# ──────────────────────────────────────────────

def run_daemon(
    threshold: float = 0.5,
    backend_url: str = "http://localhost:8000",
):
    """
    The main daemon loop. Implements a 3-state machine:

    State: IDLE
      → VAD confidence is below threshold. Waiting for sound.
      → When confidence ≥ threshold → transition to CAPTURING.

    State: CAPTURING
      → VAD confidence is above threshold. Appending chunks to buffer.
      → When confidence drops → transition to SILENCE.

    State: SILENCE
      → Counting consecutive silent chunks.
      → If silence lasts ≥ 3.0 seconds → trim buffer, export, POST.
      → If sound resumes (confidence ≥ threshold) → back to CAPTURING.
    """

    # ─── Init: Load VAD ───
    vad_model = _load_vad()

    # ─── Print config ───
    print(f"""
  {DIM}──────────────────────────────────────────{RESET}
  {CYAN}Sample Rate    {RESET}│ {BOLD}{SAMPLE_RATE} Hz{RESET}
  {CYAN}Chunk Size     {RESET}│ {BOLD}{CHUNK_DURATION_MS}ms ({CHUNK_SAMPLES} samples){RESET}
  {CYAN}VAD Threshold  {RESET}│ {BOLD}{threshold}{RESET}
  {CYAN}Silence Trigger{RESET}│ {BOLD}{SILENCE_TRIGGER_SEC}s ({SILENCE_CHUNKS_NEEDED} chunks){RESET}
  {CYAN}Min Recording  {RESET}│ {BOLD}{MIN_RECORDING_SEC}s{RESET}
  {CYAN}Backend URL    {RESET}│ {BOLD}{backend_url}{RESET}
  {DIM}──────────────────────────────────────────{RESET}
""")

    # ─── State variables ───
    state = "IDLE"                      # Current state: IDLE, CAPTURING, SILENCE
    recording_buffer: list = []         # Audio chunks accumulated during capture
    silence_counter = 0                 # How many consecutive silent chunks
    capture_count = 0                   # Total captures this session
    is_paused = False                   # Controls if we are listening or paused

    # ─── API Poller for UI Control ───
    def poll_backend_state():
        nonlocal is_paused, state, recording_buffer, silence_counter
        import requests
        url = f"{backend_url}/api/v1/daemon/state"
        while True:
            try:
                resp = requests.get(url, timeout=2)
                if resp.status_code == 200:
                    backend_paused = resp.json().get("paused", False)
                    if backend_paused != is_paused:
                        is_paused = backend_paused
                        print()
                        if is_paused:
                            state = "IDLE"
                            recording_buffer = []
                            silence_counter = 0
                            _status("⏸️", "PAUSED", "Listening paused. Press [Enter] or use UI to resume.", YELLOW)
                        else:
                            _status("🟢", "LISTENING...", "Waiting for your next idea", GREEN)
            except Exception:
                pass
            time.sleep(1)

    api_thread = threading.Thread(target=poll_backend_state, daemon=True)
    api_thread.start()

    # ─── Keyboard Listener for Pause/Resume ───
    def keyboard_listener():
        nonlocal is_paused, state, recording_buffer, silence_counter
        import requests
        url = f"{backend_url}/api/v1/daemon/state"
        while True:
            try:
                input() # Wait for the user to press Enter
                try:
                    # Sync with backend
                    requests.post(url, json={"paused": not is_paused}, timeout=2)
                except Exception:
                    # Fallback if backend is down
                    is_paused = not is_paused
                    print()
                    if is_paused:
                        state = "IDLE"
                        recording_buffer = []
                        silence_counter = 0
                        _status("⏸️", "PAUSED", "Backend unreachable. Paused locally.", YELLOW)
                    else:
                        _status("🟢", "LISTENING...", "Backend unreachable. Resumed locally.", GREEN)
            except EOFError:
                break
            except Exception:
                pass

    kbd_thread = threading.Thread(target=keyboard_listener, daemon=True)
    kbd_thread.start()

    # ─── Audio callback (runs in a separate thread by sounddevice) ───
    def audio_callback(indata: np.ndarray, frames: int, time_info, status):
        nonlocal state, recording_buffer, silence_counter, capture_count, is_paused

        if is_paused:
            return  # Skip processing entirely to save CPU

        if status:
            _status("⚠️", "AUDIO WARN", str(status), YELLOW)

        # Extract mono channel as float32 and run VAD
        chunk = indata[:, 0].copy()
        tensor = torch.from_numpy(chunk).float()
        confidence = vad_model(tensor, SAMPLE_RATE).item()
        
        # Calculate overall volume (RMS) to detect instruments, not just voices
        rms = float(np.sqrt(np.mean(chunk ** 2)))
        
        # Audio is active if EITHER voice is detected OR volume is loud enough 
        # (0.015 represents a moderately quiet instrument hit)
        is_active = (confidence >= threshold) or (rms >= 0.015)

        # ╔═══════════════════════════╗
        # ║   STATE: IDLE             ║
        # ╚═══════════════════════════╝
        if state == "IDLE":
            if is_active:
                # Activity detected! Start capturing.
                state = "CAPTURING"
                recording_buffer = [chunk]
                silence_counter = 0
                _status("🔴", "RECORDING", f"Audio activity detected (conf={confidence:.2f})", RED)

        # ╔═══════════════════════════╗
        # ║   STATE: CAPTURING        ║
        # ╚═══════════════════════════╝
        elif state == "CAPTURING":
            recording_buffer.append(chunk)

            if is_active:
                # Still active — reset silence counter
                silence_counter = 0
            else:
                # Silence started — transition to SILENCE state
                silence_counter = 1
                state = "SILENCE"

        # ╔═══════════════════════════╗
        # ║   STATE: SILENCE          ║
        # ╚═══════════════════════════╝
        elif state == "SILENCE":
            recording_buffer.append(chunk)
            silence_counter += 1

            if is_active:
                # Sound resumed! Back to CAPTURING.
                silence_counter = 0
                state = "CAPTURING"

            elif silence_counter >= SILENCE_CHUNKS_NEEDED:
                # ─── 3.0 seconds of silence: idea is finished! ───
                state = "IDLE"

                # Trim the trailing 3s of silence from the buffer
                trim_count = SILENCE_CHUNKS_NEEDED
                if len(recording_buffer) > trim_count:
                    recording_buffer = recording_buffer[:-trim_count]

                # Calculate recording duration
                duration_sec = len(recording_buffer) * CHUNK_DURATION_MS / 1000

                # Check minimum length
                if duration_sec < MIN_RECORDING_SEC:
                    _status("⏭️", "TOO SHORT", f"{duration_sec:.1f}s — discarding", DIM)
                    recording_buffer = []
                    silence_counter = 0
                    return

                capture_count += 1
                _status(
                    "⚡", "PROCESSING",
                    f"Capture #{capture_count} — {duration_sec:.1f}s of audio",
                    MAGENTA,
                )

                # ─── Export to WAV ───
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"capture_{timestamp}.wav"
                filepath = _save_wav(recording_buffer, filename)
                _status("💾", "SAVED", f"{filename} ({os.path.getsize(filepath)} bytes)", CYAN)

                # ─── Send to OVO API ───
                _status("⚡", "SENDING TO OVO API...", backend_url, MAGENTA)
                success = _send_to_api(filepath, backend_url)

                # ─── Cleanup: delete local WAV ───
                try:
                    os.remove(filepath)
                    _status("🧹", "CLEANUP", f"Deleted {filename}", DIM)
                except OSError:
                    pass

                # ─── Reset state ───
                recording_buffer = []
                silence_counter = 0

                # Print listening status again
                print()
                _status("🟢", "LISTENING...", "Waiting for your next idea", GREEN)

    # ─── Open the microphone stream ───
    try:
        _status("🟢", "LISTENING...", "Waiting for your next idea", GREEN)
        print()

        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32",
            blocksize=CHUNK_SAMPLES,
            callback=audio_callback,
        ):
            # Keep the main thread alive
            while True:
                time.sleep(0.1)

    except KeyboardInterrupt:
        print(f"\n\n  {YELLOW}{BOLD}[ 👋 GOODBYE ]{RESET}  {DIM}Daemon stopped. {capture_count} ideas captured this session.{RESET}\n")
    except Exception as e:
        _status("💀", "FATAL ERROR", str(e), RED)
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
            "  python daemon.py\n"
            "  python daemon.py --threshold 0.4\n"
            "  python daemon.py --backend http://192.168.1.10:8000\n"
        ),
    )
    parser.add_argument(
        "--threshold", type=float, default=0.5,
        help="VAD confidence threshold 0.0–1.0 (default: 0.5)",
    )
    parser.add_argument(
        "--backend", type=str, default="http://localhost:8000",
        help="Backend API URL (default: http://localhost:8000)",
    )

    args = parser.parse_args()

    _banner()
    run_daemon(
        threshold=args.threshold,
        backend_url=args.backend,
    )


if __name__ == "__main__":
    main()
