import httpx
r = httpx.get("https://jkxdngzccgarglczwxnk.supabase.co/storage/v1/object/public/ovo_audio/fragments/23c808df-a0db-4caa-906a-bfaa643c39f5.wav")
print(f"HTTP {r.status_code}")
print(f"Content-Type: {r.headers.get('content-type')}")
print(f"Size: {len(r.content)} bytes")
