"""
ThriftTheLook - pins + cut-out models for the runway hero.

1. For ALL seeded outfits (fp_<n>.jpg): finds each piece's position in the photo
   (Fashionpedia boxes) and saves pin_x / pin_y (0-100, % of the ORIGINAL photo) on pieces.
2. Picks the best 6 full-body outfits (most pieces, has shoes) or the ids you pass with --ids,
   removes the background, crops to the person, uploads to outfits/cutouts/, and saves on outfits:
     featured = true, cutout_url, cutout_box = {x0,y0,x1,y1} (fractions of the original photo)
   Frontend pin position on the cut-out:  (pin_x/100 - x0) / (x1 - x0)  and the same for y.
3. Saves the cut-outs in seed/cutouts/ so you can look at them.

Run from the seed folder with the venv active:
    python make_cutouts.py
    python make_cutouts.py --count 8
    python make_cutouts.py --ids 12,15,20,3,7,9       (fp numbers you like)
"""

import argparse
import io
import os
import re
import sys
from pathlib import Path

import httpx
from datasets import load_dataset
from dotenv import load_dotenv
from PIL import Image
from rembg import new_session, remove
from supabase import create_client

SEED_DIR = Path(__file__).resolve().parent
ROOT_DIR = SEED_DIR.parent
OUT_DIR = SEED_DIR / "cutouts"
BUCKET = "outfits"

CATEGORY_MAP = {
    0: "top", 1: "top", 2: "top", 5: "top",
    6: "bottom", 7: "bottom", 8: "bottom",
    10: "dress", 11: "dress",
    3: "outerwear", 4: "outerwear", 9: "outerwear",
    23: "shoes", 24: "bag",
}
MIN_SIDE = {"top": 80, "bottom": 80, "dress": 100, "outerwear": 80, "shoes": 40, "bag": 40}

load_dotenv(SEED_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def fail(message):
    print("ERROR: " + message)
    sys.exit(1)


def best_boxes(objs):
    """Same rule as make_pieces.py: biggest box per category."""
    best = {}
    for cat_id, bbox in zip(objs["category"], objs["bbox"]):
        if cat_id not in CATEGORY_MAP:
            continue
        category = CATEGORY_MAP[cat_id]
        x1, y1, x2, y2 = bbox
        bw, bh = x2 - x1, y2 - y1
        if bw <= 0 or bh <= 0 or min(bw, bh) < MIN_SIDE[category]:
            continue
        area = bw * bh
        if category not in best or area > best[category][0]:
            best[category] = (area, (x1, y1, x2, y2))
    return {c: b for c, (a, b) in best.items()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=6)
    parser.add_argument("--ids", type=str, default="", help="comma separated fp numbers, e.g. 3,7,12")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        fail("SUPABASE_URL or SUPABASE_SERVICE_KEY missing in seed/.env")
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    OUT_DIR.mkdir(exist_ok=True)

    rows = sb.table("outfits").select("id, image_url").execute().data or []
    seeded = {}
    for r in rows:
        m = re.search(r"fp_(\d+)\.jpg", r["image_url"] or "")
        if m:
            seeded[int(m.group(1))] = r
    if not seeded:
        fail("No seeded outfits found")
    last = max(seeded)

    # ---------- 1. pins for every seeded outfit ----------
    print("Streaming Fashionpedia train to read garment positions...")
    ds = load_dataset("detection-datasets/fashionpedia", split="train", streaming=True)
    info = {}  # fp number -> {"w","h","boxes"}
    for i, ex in enumerate(ds):
        if i > last:
            break
        if i not in seeded:
            continue
        W, H = ex["width"], ex["height"]
        boxes = best_boxes(ex["objects"])
        info[i] = {"w": W, "h": H, "boxes": boxes}
        oid = seeded[i]["id"]
        for cat, (x1, y1, x2, y2) in boxes.items():
            pin_x = round(((x1 + x2) / 2) / W * 100, 2)
            pin_y = round(((y1 + y2) / 2) / H * 100, 2)
            sb.table("pieces").update({"pin_x": pin_x, "pin_y": pin_y}) \
                .eq("outfit_id", oid).eq("category", cat).execute()
        print("  pins fp_" + str(i) + ": " + ", ".join(sorted(boxes)))

    # ---------- 2. choose featured ----------
    if args.ids.strip():
        chosen = [int(x) for x in args.ids.split(",") if x.strip().isdigit() and int(x) in info]
    else:
        def score(i):
            b = info[i]["boxes"]
            full_body = ("shoes" in b) and (("top" in b and "bottom" in b) or "dress" in b)
            return (1 if full_body else 0, len(b))
        chosen = sorted(info, key=score, reverse=True)[: args.count]
    print("Featured fp numbers: " + ", ".join(str(c) for c in chosen))

    sb.table("outfits").update({"featured": False}).eq("featured", True).execute()

    # ---------- 3. cut-outs ----------
    print("Loading background remover (first time downloads a model)...")
    session = new_session("u2net_human_seg")

    for i in chosen:
        row = seeded[i]
        try:
            resp = httpx.get(row["image_url"], timeout=60, follow_redirects=True)
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            cut = remove(img, session=session)  # RGBA, same size
            alpha_box = cut.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
            if not alpha_box:
                print("  fp_" + str(i) + ": nothing found, skipped")
                continue
            W, H = cut.size
            x0, y0, x1, y1 = alpha_box
            person = cut.crop(alpha_box)
            person.thumbnail((1100, 1400))

            local = OUT_DIR / ("fp_" + str(i) + ".webp")
            person.save(local, "WEBP", quality=90)
            path = "cutouts/fp_" + str(i) + ".webp"
            with open(local, "rb") as f:
                sb.storage.from_(BUCKET).upload(path, f.read(),
                                                {"content-type": "image/webp", "upsert": "true"})
            url = sb.storage.from_(BUCKET).get_public_url(path).rstrip("?")

            sb.table("outfits").update({
                "featured": True,
                "cutout_url": url,
                "cutout_box": {"x0": round(x0 / W, 4), "y0": round(y0 / H, 4),
                               "x1": round(x1 / W, 4), "y1": round(y1 / H, 4)},
            }).eq("id", row["id"]).execute()
            print("OK   fp_" + str(i) + " -> " + path)
        except Exception as e:
            print("FAIL fp_" + str(i) + ": " + str(e)[:200])

    print("")
    print("Done. Look at seed/cutouts/. If one looks bad, re-run with --ids and pick others.")


if __name__ == "__main__":
    main()