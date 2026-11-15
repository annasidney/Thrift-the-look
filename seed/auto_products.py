"""
ThriftTheLook - make shop products automatically from Fashionpedia.

What it does:
  1. Streams Fashionpedia "val" images (skips the first 200 so they never clash with your 50 outfits)
  2. Cuts out garments using the dataset's boxes (top, bottom, dress, outerwear, shoes, bag)
  3. Gives each one a name, a tier (thrift/mid/premium), a Rs price and a store (demo data)
  4. Saves the crop in seed/products/, uploads it to the "products" bucket
  5. Makes a CLIP embedding and saves everything in the products table

WARNING: every run first DELETES all rows in the products table, then refills it.

Run from the seed folder with the venv active:
    python auto_products.py --per-category 3     (quick test: 18 products)
    python auto_products.py                      (full: 12 per category = 72 products)
"""

import argparse
import random
import sys
from pathlib import Path
from urllib.parse import quote_plus
import os

from datasets import load_dataset
from dotenv import load_dotenv
from PIL import Image, ImageStat
from sentence_transformers import SentenceTransformer
from supabase import create_client

# ---------- paths and settings ----------
SEED_DIR = Path(__file__).resolve().parent
ROOT_DIR = SEED_DIR.parent
OUT_DIR = SEED_DIR / "products"
BUCKET = "products"
MODEL_NAME = "clip-ViT-B-32"
SKIP_IMAGES = 200

# Fashionpedia category id -> (our category, word used in the product name)
CATEGORY_MAP = {
    0: ("top", "Shirt"),
    1: ("top", "Tee"),
    2: ("top", "Sweater"),
    5: ("top", "Vest"),
    6: ("bottom", "Pants"),
    7: ("bottom", "Shorts"),
    8: ("bottom", "Skirt"),
    10: ("dress", "Dress"),
    11: ("dress", "Jumpsuit"),
    3: ("outerwear", "Cardigan"),
    4: ("outerwear", "Jacket"),
    9: ("outerwear", "Coat"),
    23: ("shoes", "Shoes"),
    24: ("bag", "Bag"),
}
OUR_CATEGORIES = ["top", "bottom", "dress", "outerwear", "shoes", "bag"]
TIERS = ["thrift", "mid", "premium"]

# smallest crop (in pixels) we accept per category
MIN_SIDE = {"top": 120, "bottom": 120, "dress": 140, "outerwear": 120, "shoes": 60, "bag": 60}

PRICE_RANGES = {
    "top":       {"thrift": (199, 599), "mid": (799, 1999),  "premium": (2999, 6999)},
    "bottom":    {"thrift": (249, 699), "mid": (999, 2499),  "premium": (3499, 7999)},
    "dress":     {"thrift": (299, 899), "mid": (1299, 2999), "premium": (4499, 11999)},
    "outerwear": {"thrift": (399, 999), "mid": (1999, 3999), "premium": (5999, 14999)},
    "shoes":     {"thrift": (299, 899), "mid": (1499, 3499), "premium": (5999, 12999)},
    "bag":       {"thrift": (199, 699), "mid": (999, 2499),  "premium": (3999, 9999)},
}

# made-up demo stores
STORES = {
    "thrift": ["Second Stitch Thrift", "Old Soul Vintage", "Rewear Room"],
    "mid": ["Urban Loom", "Daily Thread", "Street Edit"],
    "premium": ["Maison Kora", "Atelier Noir", "The Linen Co."],
}

TIER_WORD = {"thrift": "Pre-loved", "mid": "Everyday", "premium": "Premium"}

COLORS = {
    "Black": (30, 30, 30), "White": (235, 235, 235), "Grey": (128, 128, 128),
    "Beige": (210, 190, 160), "Brown": (120, 80, 50), "Red": (180, 40, 40),
    "Pink": (225, 150, 170), "Orange": (230, 130, 50), "Yellow": (230, 200, 60),
    "Green": (60, 130, 70), "Olive": (110, 110, 60), "Blue": (50, 90, 170),
    "Navy": (30, 40, 80), "Denim": (80, 110, 150), "Purple": (120, 70, 140),
}

# ---------- load keys ----------
load_dotenv(SEED_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")


def fail(message):
    print("ERROR: " + message)
    sys.exit(1)


def color_name(img):
    w, h = img.size
    center = img.crop((int(w * 0.25), int(h * 0.25), int(w * 0.75), int(h * 0.75)))
    r, g, b = ImageStat.Stat(center).mean[:3]
    best, best_dist = "Black", None
    for name, (cr, cg, cb) in COLORS.items():
        dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
        if best_dist is None or dist < best_dist:
            best, best_dist = name, dist
    return best


def crop_box(img, bbox, category):
    # bbox is Pascal VOC: [x_min, y_min, x_max, y_max]
    W, H = img.size
    x1, y1, x2, y2 = bbox
    bw, bh = x2 - x1, y2 - y1
    if bw <= 0 or bh <= 0:
        return None
    if min(bw, bh) < MIN_SIDE[category]:
        return None
    if max(bw, bh) / min(bw, bh) > 4:
        return None
    pad_x, pad_y = bw * 0.06, bh * 0.06
    box = (
        max(0, int(x1 - pad_x)), max(0, int(y1 - pad_y)),
        min(W, int(x2 + pad_x)), min(H, int(y2 + pad_y)),
    )
    crop = img.crop(box)
    crop.thumbnail((512, 512))
    return crop


def collect_crops(per_category):
    print("Streaming Fashionpedia val images (needs internet)...")
    ds = load_dataset("detection-datasets/fashionpedia", split="val", streaming=True)
    counts = {c: 0 for c in OUR_CATEGORIES}
    items = []
    seen = 0
    for example in ds:
        seen += 1
        if seen <= SKIP_IMAGES:
            continue
        if all(counts[c] >= per_category for c in OUR_CATEGORIES):
            break

        img = example["image"].convert("RGB")
        objs = example["objects"]
        used_here = set()
        for cat_id, bbox in zip(objs["category"], objs["bbox"]):
            if cat_id not in CATEGORY_MAP:
                continue
            category, word = CATEGORY_MAP[cat_id]
            if counts[category] >= per_category or category in used_here:
                continue
            crop = crop_box(img, bbox, category)
            if crop is None:
                continue
            tier = TIERS[counts[category] % 3]
            counts[category] += 1
            used_here.add(category)
            items.append({"category": category, "word": word, "tier": tier,
                          "image": crop, "source_image_id": example["image_id"]})
            if len(used_here) >= 2:
                break  # max 2 pieces per photo, for variety

        if seen % 50 == 0:
            print("  looked at " + str(seen) + " images, counts: " + str(counts))

    print("Collected: " + str(counts))
    for c in OUR_CATEGORIES:
        if counts[c] < per_category:
            print("  note: only found " + str(counts[c]) + " for " + c)
    return items


def build_record(item, index):
    category, tier = item["category"], item["tier"]
    color = color_name(item["image"])
    name = TIER_WORD[tier] + " " + color + " " + item["word"]
    low, high = PRICE_RANGES[category][tier]
    price = int(round(random.randint(low, high) / 50.0) * 50 - 1)  # e.g. 1299
    store = random.choice(STORES[tier])
    query = color + " " + item["word"] + (" thrift" if tier == "thrift" else "") + " india"
    link = "https://www.google.com/search?tbm=shop&q=" + quote_plus(query)
    filename = "auto_" + category + "_" + str(index).zfill(3) + ".jpg"
    return {"name": name, "category": category, "price_inr": price, "tier": tier,
            "store": store, "link": link}, filename


def main():
    parser = argparse.ArgumentParser(description="Auto-create products from Fashionpedia")
    parser.add_argument("--per-category", type=int, default=12,
                        help="products per category (split across 3 tiers)")
    args = parser.parse_args()

    if not SUPABASE_URL:
        fail("SUPABASE_URL not found. Add it to seed/.env")
    if not SUPABASE_KEY:
        fail("SUPABASE_SERVICE_ROLE_KEY not found. Add it to seed/.env (service role key, NOT anon key)")

    random.seed(42)
    OUT_DIR.mkdir(exist_ok=True)
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # make sure the storage bucket exists and is public
    try:
        sb.storage.create_bucket(BUCKET, options={"public": True})
        print("Created public storage bucket 'products'")
    except Exception:
        print("Storage bucket 'products' already exists (ok)")

    items = collect_crops(args.per_category)
    if not items:
        fail("No crops collected.")

    print("Loading CLIP model (first time can take a minute)...")
    model = SentenceTransformer(MODEL_NAME)
    print("Making embeddings for " + str(len(items)) + " products...")
    vectors = model.encode([it["image"] for it in items], batch_size=16,
                           normalize_embeddings=True, show_progress_bar=True)

    print("Clearing old rows in products table...")
    sb.table("products").delete().gte("price_inr", 0).execute()

    saved, failed = 0, 0
    for i, (item, vec) in enumerate(zip(items, vectors), start=1):
        record, filename = build_record(item, i)
        try:
            local_path = OUT_DIR / filename
            item["image"].save(local_path, "JPEG", quality=88)

            storage_path = "auto/" + filename
            with open(local_path, "rb") as f:
                sb.storage.from_(BUCKET).upload(
                    storage_path, f.read(),
                    {"content-type": "image/jpeg", "upsert": "true"},
                )
            record["image_url"] = sb.storage.from_(BUCKET).get_public_url(storage_path).rstrip("?")
            record["embedding"] = "[" + ",".join(f"{x:.6f}" for x in vec.tolist()) + "]"

            sb.table("products").insert(record).execute()
            saved += 1
            print("OK   " + str(i).rjust(3) + "  " + record["category"].ljust(9) + " "
                  + record["tier"].ljust(7) + " Rs " + str(record["price_inr"]).ljust(6)
                  + " " + record["name"])
        except Exception as e:
            failed += 1
            print("FAIL " + str(i) + " " + record["name"] + ": " + str(e))

    print("")
    print("Finished: " + str(saved) + " saved, " + str(failed) + " failed.")
    print("Crops saved in seed/products/ so you can look at them.")


if __name__ == "__main__":
    main()