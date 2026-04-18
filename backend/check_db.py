"""Quick check: what's in the fragments table?"""
from app.supabase_client import get_supabase

c = get_supabase()
r = c.table("fragments").select("id,title,file_url,stem_urls").limit(5).execute()

if not r.data:
    print("DATABASE IS EMPTY — no fragments found!")
else:
    for x in r.data:
        print(f"Title: {x['title']}")
        print(f"  file_url:  {x['file_url'] or 'EMPTY'}")
        print(f"  stem_urls: {x['stem_urls']}")
        print()

# Also check the storage bucket
try:
    files = c.storage.from_("ovo_audio").list("fragments", {"limit": 10})
    print(f"\nSupabase Storage bucket 'ovo_audio/fragments/': {len(files)} items")
    for f in files:
        print(f"  {f['name']}  ({f.get('metadata', {}).get('size', '?')} bytes)")
except Exception as e:
    print(f"\nStorage bucket check FAILED: {e}")
