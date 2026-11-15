"""
ThriftTheLook - make "pieces" for the seeded outfits.

For every outfit that came from seed.py (image link contains fp_<number>.jpg):
  1. finds the same photo in Fashionpedia "train"
  2. cuts out each garment (top, bottom, dress, outerwear, shoes, bag)
     - keeps only the BIGGEST box per category, so 2 shoes become 1 piece
  3. uploads the crop to the "outfits" bucket under pieces/
  4. makes a CLIP embedding
  5. saves it in the pieces table (outfit_id, category, image_url, embedding)

WARNING: every run first DELETES all rows in the pieces table, then refills it.

Run from the seed folder with the venv active:
    python make_pieces.py
"""

import io
import os
import re
import sys
from pathlib import Path

from datasets import load_dataset
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import create_client

SEED_DIR = Path(__file__).resolve().parent
ROOT_DIR = SEED_DIR.parent
BUCKET = "outfits"
MODEL_NAME = "clip-ViT-B-32"

# Fashionpedia category id -> our category (same as auto_products.py)
CATEGORY_MAP = {
    0: "top", 1: "top", 2: "top", 5: "top",
    6: "bottom", 7: "bottom", 8: "bottom",
    10: "dress", 11: "dress",
    3: "outerwear", 4: "outerwear", 9: "outerwear",
    23: "shoes",
    24: "bag",
}
MIN_SIDE = {"top": 80, "bottom": 80, "dress": 100, "outerwear": 80, "shoes": 40, "bag": 40}

load_dotenv(SEED_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def fail(message):
    print("ERROR: " + message)
    sys.exit(1)


def get_seeded_outfits(sb):
    res = sb.table("outfits").select("id, image_url").execute()
    wanted = {}
    for row in res.data:
        match = re.search(r"fp_(\d+)\.jpg", row["image_url"] or "")
        if match:
            wanted[int(match.group(1))] = row["id"]
    return wanted


def best_box_per_category(objs, img_w, img_h):
    best = {}
    for cat_id, bbox in zip(objs["category"], objs["bbox"]):
        if cat_id not in CATEGORY_MAP:
            continue
        category = CATEGORY_MAP[cat_id]
        x1, y1, x2, y2 = bbox  # Pascal VOC
        bw, bh = x2 - x1, y2 - y1
        if bw <= 0 or bh <= 0 or min(bw, bh) < MIN_SIDE[category]:
            continue
        area = bw * bh
        if category not in best or area > best[category][0]:
            pad_x, pad_y = bw * 0.06, bh * 0.06
            box = (
                max(0, int(x1 - pad_x)), max(0, int(y1 - pad_y)),
                min(img_w, int(x2 + pad_x)), min(img_h, int(y2 + pad_y)),
            )
            best[category] = (area, box)
    return {cat: box for cat, (area, box) in best.items()}


def main():
    if not SUPABASE_URL:
        fail("SUPABASE_URL not found in seed/.env")
    if not SUPABASE_KEY:
        fail("SUPABASE_SERVICE_KEY not found in seed/.env")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    wanted = get_seeded_outfits(sb)
    if not wanted:
        fail("No seeded outfits found (looking for image links with fp_<number>.jpg)")
    last_index = max(wanted)
    print("Found " + str(len(wanted)) + " seeded outfits (fp_0 to fp_" + str(last_index) + ")")

    print("Streaming Fashionpedia train images...")
    ds = load_dataset("detection-datasets/fashionpedia", split="train", streaming=True)

    pieces = []  # each: dict with outfit_id, category, image, filename
    for i, row in enumerate(ds):
        if i > last_index:
            break
        if i not in wanted:
            continue
        img = row["image"].convert("RGB")
        boxes = best_box_per_category(row["objects"], img.width, img.height)
        for category, box in boxes.items():
            crop = img.crop(box)
            crop.thumbnail((512, 512))
            pieces.append({
                "outfit_id": wanted[i],
                "category": category,
                "image": crop,
                "filename": "fp_" + str(i) + "_" + category + ".jpg",
            })
        print("  fp_" + str(i) + ": " + (", ".join(sorted(boxes)) if boxes else "no pieces found"))

    if not pieces:
        fail("No pieces cut out.")

    print("Loading CLIP model...")
    model = SentenceTransformer(MODEL_NAME)
    print("Making embeddings for " + str(len(pieces)) + " pieces...")
    vectors = model.encode([p["image"] for p in pieces], batch_size=16,
                           normalize_embeddings=True, show_progress_bar=True)

    print("Clearing old rows in pieces table...")
    sb.table("pieces").delete().neq("category", "__none__").execute()

    saved, failed = 0, 0
    for p, vec in zip(pieces, vectors):
        try:
            buf = io.BytesIO()
            p["image"].save(buf, format="JPEG", quality=88)
            storage_path = "pieces/" + p["filename"]
            sb.storage.from_(BUCKET).upload(
                storage_path, buf.getvalue(),
                {"content-type": "image/jpeg", "upsert": "true"},
            )
            url = sb.storage.from_(BUCKET).get_public_url(storage_path).rstrip("?")
            sb.table("pieces").insert({
                "outfit_id": p["outfit_id"],
                "category": p["category"],
                "image_url": url,
                "embedding": "[" + ",".join(f"{x:.6f}" for x in vec.tolist()) + "]",
            }).execute()
            saved += 1
            print("OK   " + p["filename"])
        except Exception as e:
            failed += 1
            print("FAIL " + p["filename"] + ": " + str(e))

    print("")
    print("Finished: " + str(saved) + " pieces saved, " + str(failed) + " failed.")


if __name__ == "__main__":
    main()