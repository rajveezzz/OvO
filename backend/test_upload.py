"""Test: Upload a small WAV to Supabase and see the EXACT response."""
import io
import struct
from app.supabase_client import get_supabase
from app.config import get_settings

# Generate a tiny valid WAV file (1 second of 440Hz sine tone)
import math
SAMPLE_RATE = 16000
DURATION = 1
num_samples = SAMPLE_RATE * DURATION
samples = [int(32767 * math.sin(2 * math.pi * 440 * i / SAMPLE_RATE)) for i in range(num_samples)]
wav_data = struct.pack(f"<{num_samples}h", *samples)

# Build WAV header
wav_bytes = b"RIFF"
data_size = len(wav_data)
file_size = 36 + data_size
wav_bytes += struct.pack("<I", file_size)
wav_bytes += b"WAVEfmt "
wav_bytes += struct.pack("<IHHIIHH", 16, 1, 1, SAMPLE_RATE, SAMPLE_RATE * 2, 2, 16)
wav_bytes += b"data"
wav_bytes += struct.pack("<I", data_size)
wav_bytes += wav_data

print(f"Generated test WAV: {len(wav_bytes):,} bytes")

settings = get_settings()
c = get_supabase()
base = f"{settings.supabase_url}/storage/v1/object/public/ovo_audio"

# Test 1: Upload with raw bytes (old broken way)
print("\n=== TEST 1: Upload with raw bytes ===")
try:
    res = c.storage.from_("ovo_audio").upload(
        path="test/raw_bytes.wav",
        file=wav_bytes,
        file_options={"content-type": "audio/wav", "x-upsert": "true"},
    )
    print(f"Result: {res}")
    print(f"Type: {type(res)}")
except Exception as e:
    print(f"EXCEPTION: {type(e).__name__}: {e}")

# Test 2: Upload with io.BytesIO (new fixed way)
print("\n=== TEST 2: Upload with io.BytesIO ===")
try:
    res = c.storage.from_("ovo_audio").upload(
        path="test/bytesio.wav",
        file=io.BytesIO(wav_bytes),
        file_options={"content-type": "audio/wav", "x-upsert": "true"},
    )
    print(f"Result: {res}")
    print(f"Type: {type(res)}")
except Exception as e:
    print(f"EXCEPTION: {type(e).__name__}: {e}")

# Test 3: Verify the uploaded file is accessible
print(f"\n=== VERIFY ===")
url = f"{base}/test/bytesio.wav"
print(f"Public URL: {url}")

import httpx
resp = httpx.get(url)
print(f"HTTP {resp.status_code}, Content-Length: {resp.headers.get('content-length', '?')}")
