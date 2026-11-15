"""
ThriftTheLook - process user-uploaded outfits.

For every outfit that needs it:
  1. no embedding yet  -> make a CLIP embedding (similar outfits + vibes start working)
  2. no pieces yet     -> detect garments with a Fashionpedia-trained model, crop them,
                          embed them, save them in the pieces table (shop the look starts working)
     If nothing is detected, it saves ONE piece from the whole photo so the page is never empty.

Seeded outfits (fp_<number>.jpg) are skipped for pieces, because make_pieces.py already did them.

Run from the seed folder with the venv active:
    python process_uploads.py           (process once, then stop)
    python process_uploads.py --watch   (keep checking every 20 seconds, Ctrl+C to stop)
"""

import argparse
import io
import os
import re
import sys
import time
from pathlib import Path

import httpx
import numpy as np
from dotenv import load_dotenv
from PIL import Image, ImageOps
from sentence_transformers import SentenceTransformer
from supabase import create_client

SEED_DIR = Path(__file__).resolve().parent
ROOT_DIR = SEED_DIR.parent
BUCKET = "outfits"
CLIP_NAME = "clip-ViT-B-32"
DETECTOR_NAME = "valentinafeve/yolos-fashionpedia"
DETECTOR_FALLBACK_PROCESSOR = "hustvl/yolos-small"
SCORE_MIN = 0.35
WATCH_SECONDS = 20

# detector label name -> our category
NAME_MAP = {
    "shirt, blouse": "top",
    "top, t-shirt, sweatshirt": "top",
    "sweater": "top",
    "vest": "top",
    "pants": "bottom",
    "shorts": "bottom",
    "skirt": "bottom",
    "dress": "dress",
    "jumpsuit": "dress",
    "cardigan": "outerwear",
    "jacket": "outerwear",
    "coat": "outerwear",
    "shoe": "shoes",
    "bag, wallet": "bag",
}
# same thing by Fashionpedia id, in case the model only gives LABEL_<id>
ID_MAP = {
    0: "top", 1: "top", 2: "top", 5: "top",
    6: "bottom", 7: "bottom", 8: "bottom",
    10: "dress", 11: "dress",
    3: "outerwear", 4: "outerwear", 9: "outerwear",
    23: "shoes", 24: "bag",
}
MIN_SIDE = {"top": 60, "bottom": 60, "dress": 80, "outerwear": 60, "shoes": 30, "bag": 30}

# used when the detector finds nothing: CLIP guesses the main garment type
FALLBACK_PROMPTS = {
    "top": "a photo of a person wearing a shirt or top",
    "bottom": "a photo of pants, jeans or a skirt",
    "dress": "a photo of a person wearing a dress",
    "outerwear": "a photo of a person wearing a jacket or coat",
    "shoes": "a photo of shoes",
    "bag": "a photo of a handbag",
}

load_dotenv(SEED_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def fail(message):
    print("ERROR: " + message)
    sys.exit(1)


def vec_to_str(vec):
    return "[" + ",".join(f"{x:.6f}" for x in np.asarray(vec).tolist()) + "]"


def to_category(label):
    label = str(label).strip().lower()
    if label.startswith("label_"):
        try:
            return ID_MAP.get(int(label.split("_")[1]))
        except ValueError:
            return None
    return NAME_MAP.get(label)


def load_detector():
    from transformers import pipeline
    print("Loading garment detector (first time downloads the model)...")
    try:
        return pipeline("object-detection", model=DETECTOR_NAME)
    except Exception:
        pass
    try:
        return pipeline("object-detection", model=DETECTOR_NAME,
                        image_processor=DETECTOR_FALLBACK_PROCESSOR)
    except Exception as e:
        print("WARNING: detector could not load, using whole-photo pieces only.")
        print("         reason: " + str(e)[:200])
        return None


def detect_boxes(detector, img):
    """Returns {category: (x1, y1, x2, y2)} keeping the biggest box per category."""
    if detector is None:
        return {}
    try:
        results = detector(img, threshold=SCORE_MIN)
    except TypeError:
        results = detector(img)
    except Exception as e:
        print("   detector error: " + str(e)[:150])
        return {}

    W, H = img.size
    best = {}
    for r in results:
        if r.get("score", 0) < SCORE_MIN:
            continue
        category = to_category(r.get("label", ""))
        if not category:
            continue
        b = r["box"]
        x1, y1, x2, y2 = b["xmin"], b["ymin"], b["xmax"], b["ymax"]
        bw, bh = x2 - x1, y2 - y1
        if bw <= 0 or bh <= 0 or min(bw, bh) < MIN_SIDE[category]:
            continue
        area = bw * bh
        if category not in best or area > best[category][0]:
            pad_x, pad_y = bw * 0.06, bh * 0.06
            box = (max(0, int(x1 - pad_x)), max(0, int(y1 - pad_y)),
                   min(W, int(x2 + pad_x)), min(H, int(y2 + pad_y)))
            best[category] = (area, box)
    return {cat: box for cat, (area, box) in best.items()}


def download_image(url):
    resp = httpx.get(url, timeout=60, follow_redirects=True)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((1600, 1600))
    return img


def find_work(sb):
    outfits = sb.table("outfits").select("id, image_url").execute().data or []
    no_embedding = sb.table("outfits").select("id").is_("embedding", "null").execute().data or []
    need_embedding = {str(r["id"]) for r in no_embedding}

    piece_rows = sb.table("pieces").select("outfit_id").execute().data or []
    has_pieces = {str(r["outfit_id"]) for r in piece_rows}

    work = []
    for o in outfits:
        oid = str(o["id"])
        is_seeded = bool(re.search(r"/seed/fp_\d+\.jpg", o["image_url"] or ""))
        needs_pieces = (oid not in has_pieces) and not is_seeded
        needs_emb = oid in need_embedding
        if needs_pieces or needs_emb:
            work.append({"id": o["id"], "image_url": o["image_url"],
                         "needs_pieces": needs_pieces, "needs_embedding": needs_emb})
    return work


def process_outfit(sb, clip, detector, fallback_vecs, job):
    oid = job["id"]
    print("-> outfit " + str(oid))
    img = download_image(job["image_url"])

    if job["needs_embedding"]:
        vec = clip.encode(img, normalize_embeddings=True)
        sb.table("outfits").update({"embedding": vec_to_str(vec)}).eq("id", oid).execute()
        print("   embedding saved")

    if not job["needs_pieces"]:
        return

    boxes = detect_boxes(detector, img)
    crops = []
    for category, box in boxes.items():
        crop = img.crop(box)
        crop.thumbnail((512, 512))
        crops.append((category, crop))

    if not crops:
        # fallback: whole photo as one piece, CLIP picks the category
        whole = img.copy()
        whole.thumbnail((512, 512))
        img_vec = clip.encode(whole, normalize_embeddings=True)
        best_cat = max(fallback_vecs, key=lambda c: float(np.dot(img_vec, fallback_vecs[c])))
        crops.append((best_cat, whole))
        print("   nothing detected, using whole photo as '" + best_cat + "'")
    else:
        print("   detected: " + ", ".join(sorted(c for c, _ in crops)))

    vectors = clip.encode([c for _, c in crops], normalize_embeddings=True)

    # replace any old pieces for THIS outfit only
    sb.table("pieces").delete().eq("outfit_id", oid).execute()

    for (category, crop), vec in zip(crops, vectors):
        buf = io.BytesIO()
        crop.save(buf, format="JPEG", quality=88)
        path = "pieces/upload_" + str(oid) + "_" + category + ".jpg"
        sb.storage.from_(BUCKET).upload(path, buf.getvalue(),
                                        {"content-type": "image/jpeg", "upsert": "true"})
        url = sb.storage.from_(BUCKET).get_public_url(path).rstrip("?")
        sb.table("pieces").insert({
            "outfit_id": oid,
            "category": category,
            "image_url": url,
            "embedding": vec_to_str(vec),
        }).execute()
    print("   " + str(len(crops)) + " pieces saved")


def run_once(sb, clip, detector, fallback_vecs):
    work = find_work(sb)
    if not work:
        return 0
    print("Found " + str(len(work)) + " outfit(s) to process")
    done = 0
    for job in work:
        try:
            process_outfit(sb, clip, detector, fallback_vecs, job)
            done += 1
        except Exception as e:
            print("   FAIL: " + str(e)[:300])
    return done


def main():
    parser = argparse.ArgumentParser(description="Process user-uploaded outfits")
    parser.add_argument("--watch", action="store_true", help="keep checking every 20 seconds")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        fail("SUPABASE_URL or SUPABASE_SERVICE_KEY missing in seed/.env")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Loading CLIP model...")
    clip = SentenceTransformer(CLIP_NAME)
    text_vecs = clip.encode(list(FALLBACK_PROMPTS.values()), normalize_embeddings=True)
    fallback_vecs = dict(zip(FALLBACK_PROMPTS.keys(), text_vecs))

    detector = load_detector()

    if not args.watch:
        done = run_once(sb, clip, detector, fallback_vecs)
        print("")
        print("Finished: " + str(done) + " outfit(s) processed.")
        return

    print("")
    print("Watching for new uploads every " + str(WATCH_SECONDS) + "s. Press Ctrl+C to stop.")
    try:
        while True:
            run_once(sb, clip, detector, fallback_vecs)
            time.sleep(WATCH_SECONDS)
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()