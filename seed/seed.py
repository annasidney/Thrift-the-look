import io
import os
import random
import sys

from datasets import load_dataset
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 20
MAX_WIDTH = 800

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
owner = os.environ["OWNER_USER_ID"]

VIBES = ["y2k", "party", "college", "old money", "streetwear",
         "minimal", "summer", "date night", "ethnic", "casual"]

print("Loading dataset (streaming, no full download)...")
ds = load_dataset("detection-datasets/fashionpedia", split="train", streaming=True)

count = 0
for i, row in enumerate(ds):
    if count >= LIMIT:
        break

    img = row["image"].convert("RGB")
    if img.width > MAX_WIDTH:
        ratio = MAX_WIDTH / img.width
        img = img.resize((MAX_WIDTH, int(img.height * ratio)))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)

    path = f"seed/fp_{i}.jpg"
    supabase.storage.from_("outfits").upload(
        path, buf.getvalue(),
        {"content-type": "image/jpeg", "upsert": "true"},
    )
    url = supabase.storage.from_("outfits").get_public_url(path)

    # skip if this image is already in the table (safe to re-run)
    exists = supabase.table("outfits").select("id").eq("image_url", url).execute()
    if not exists.data:
        supabase.table("outfits").insert({
            "user_id": owner,
            "title": f"Outfit #{i + 1}",
            "image_url": url,
            "vibe_tags": random.sample(VIBES, 2),
        }).execute()

    count += 1
    print(f"{count}/{LIMIT} done")

print("Finished.")