"""Patch existing fragments: map storage files to DB records by order."""
from app.supabase_client import get_supabase
from app.config import get_settings

settings = get_settings()
c = get_supabase()
base = f"{settings.supabase_url}/storage/v1/object/public/ovo_audio"

# Get all storage files
storage_files = c.storage.from_("ovo_audio").list("fragments", {"limit": 50})
wav_files = [f for f in storage_files if f["name"].endswith(".wav")]
print(f"Storage WAV files: {[f['name'] for f in wav_files]}")

# Get all fragments ordered by creation
frags = c.table("fragments").select("id,title,file_url,created_at").order("created_at").execute()
print(f"DB fragments: {[(f['title'], f['id'][:8]) for f in frags.data]}")

# Match them by order (oldest storage file → oldest fragment)
wav_files.sort(key=lambda f: f.get("created_at", ""))
frags.data.sort(key=lambda f: f.get("created_at", ""))

for i, frag in enumerate(frags.data):
    if i < len(wav_files):
        storage_name = wav_files[i]["name"]
        file_url = f"{base}/fragments/{storage_name}"
        print(f"\nPatching fragment '{frag['title']}' ({frag['id'][:8]}...):")
        print(f"  file_url → {file_url}")
        c.table("fragments").update({"file_url": file_url}).eq("id", frag["id"]).execute()
        print(f"  ✅ Done!")

# Verify
print("\n=== VERIFICATION ===")
frags2 = c.table("fragments").select("id,title,file_url").execute()
for f in frags2.data:
    print(f"  {f['title']}: {f['file_url']}")
