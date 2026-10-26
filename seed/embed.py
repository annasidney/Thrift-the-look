import io
import os

import requests
from dotenv import load_dotenv
from PIL import Image
from sentence_transformers import SentenceTransformer
from supabase import create_client

load_dotenv()

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

print("Loading CLIP model (first run downloads about 350 MB)...")
model = SentenceTransformer("clip-ViT-B-32")

rows = (
    supabase.table("outfits")
    .select("id, image_url")
    .is_("embedding", "null")
    .execute()
    .data
)
print(f"{len(rows)} outfits need embeddings")

for n, row in enumerate(rows, start=1):
    try:
        resp = requests.get(row["image_url"], timeout=30)
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        vec = model.encode(img, normalize_embeddings=True)
        supabase.table("outfits").update(
            {"embedding": str(vec.tolist())}
        ).eq("id", row["id"]).execute()
        print(f"{n}/{len(rows)} done")
    except Exception as e:
        print(f"{n}/{len(rows)} skipped: {e}")

print("Finished.")