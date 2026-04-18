"""Generate a test MP3 and send it to the ingest endpoint."""
import imageio_ffmpeg
import subprocess
import os
import httpx

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Generate a 2-second 440Hz sine wave as MP3
subprocess.run(
    [ffmpeg, "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
     "-b:a", "128k", "test_audio.mp3"],
    capture_output=True,
)
print(f"Created test_audio.mp3 ({os.path.getsize('test_audio.mp3')} bytes)")

# Upload to ingest endpoint
with open("test_audio.mp3", "rb") as f:
    r = httpx.post(
        "http://localhost:8000/api/v1/ingest",
        files={"file": ("test_audio.mp3", f, "audio/mpeg")},
        timeout=60,
    )

print(f"Status: {r.status_code}")
print(f"Response: {r.text[:500]}")

# Cleanup
os.remove("test_audio.mp3")
