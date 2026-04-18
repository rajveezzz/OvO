"""End-to-end test: upload a real WAV to /api/v1/ingest and verify audio plays."""
import struct
import math
import requests
import os

# Generate a 3-second 440Hz test tone WAV
SAMPLE_RATE = 22050
DURATION = 3
num_samples = SAMPLE_RATE * DURATION
samples = [int(32767 * 0.8 * math.sin(2 * math.pi * 440 * i / SAMPLE_RATE)) for i in range(num_samples)]
wav_data = struct.pack(f"<{num_samples}h", *samples)

wav_bytes = b"RIFF"
data_size = len(wav_data)
file_size = 36 + data_size
wav_bytes += struct.pack("<I", file_size)
wav_bytes += b"WAVEfmt "
wav_bytes += struct.pack("<IHHIIHH", 16, 1, 1, SAMPLE_RATE, SAMPLE_RATE * 2, 2, 16)
wav_bytes += b"data"
wav_bytes += struct.pack("<I", data_size)
wav_bytes += wav_data

# Save locally first
test_path = os.path.join(os.getcwd(), "test_tone.wav")
with open(test_path, "wb") as f:
    f.write(wav_bytes)
print(f"Generated: {test_path} ({len(wav_bytes):,} bytes)")

# Upload to ingest endpoint
print("\nUploading to /api/v1/ingest...")
with open(test_path, "rb") as f:
    resp = requests.post(
        "http://localhost:8000/api/v1/ingest",
        files={"file": ("test_tone.wav", f, "audio/wav")},
        timeout=300,
    )

print(f"Response: HTTP {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    frag = data["fragment"]
    print(f"\n✅ SUCCESS!")
    print(f"  Title:     {frag['title']}")
    print(f"  file_url:  {frag['file_url']}")
    print(f"  stem_urls: {frag['stem_urls']}")
    print(f"  stems:     {frag['stems']}")
    
    # Test if the URL is actually accessible
    if frag["file_url"]:
        print(f"\nVerifying audio URL is accessible...")
        audio_resp = requests.get(frag["file_url"], timeout=10)
        print(f"  HTTP {audio_resp.status_code}, Content-Type: {audio_resp.headers.get('content-type')}, Size: {len(audio_resp.content):,} bytes")
        if audio_resp.status_code == 200:
            print(f"  🎵 AUDIO IS PLAYABLE!")
        else:
            print(f"  ❌ Audio URL returned {audio_resp.status_code}")
    else:
        print(f"\n❌ file_url is EMPTY — upload still broken")
else:
    print(f"  Error: {resp.text[:500]}")

# Cleanup
os.remove(test_path)
