"""
ThriftTheLook - turn vibe words into CLIP embeddings and save them in the vibes table.

Run from the seed folder with the venv active:
    python embed_vibes.py

Safe to re-run: it updates existing vibes. Add or change vibes in the VIBES list below.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import create_client

SEED_DIR = Path(__file__).resolve().parent
ROOT_DIR = SEED_DIR.parent
MODEL_NAME = "clip-ViT-B-32"

# (slug, label shown on the chip, words CLIP reads)
VIBES = [
    ("old-money", "Old money", "elegant old money style, tailored classic neutral clothes"),
    ("streetwear", "Streetwear", "streetwear, oversized hoodie, sneakers, urban street style"),
    ("y2k", "Y2K", "y2k fashion, early 2000s, low rise, baby tee, bold colors"),
    ("minimal", "Minimal", "minimalist outfit, simple clean lines, plain neutral colors"),
    ("college", "College", "casual college student outfit, jeans and t-shirt, backpack"),
    ("party", "Party", "party outfit, glamorous, sparkly, night out"),
    ("date-night", "Date night", "date night outfit, stylish dress, chic and romantic"),
    ("ethnic", "Ethnic", "indian ethnic wear, kurta, saree, traditional embroidered clothing"),
    ("summer", "Summer", "light summer outfit, shorts, sundress, bright sunny day"),
    ("boho", "Boho", "bohemian boho style, flowy fabrics, earthy tones, layered accessories"),
    ("office", "Office", "formal office wear, blazer, trousers, business professional"),
    ("athleisure", "Athleisure", "athleisure, sporty leggings, track jacket, gym wear"),
    ("all-black", "All black", "all black monochrome outfit"),
    ("winter", "Cozy winter", "cozy winter outfit, coat, sweater, scarf, boots"),
    ("denim", "Denim", "denim outfit, jeans and denim jacket"),
    ("vintage", "Vintage", "vintage retro thrifted outfit, 70s 80s 90s style"),
]

load_dotenv(SEED_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY missing in seed/.env")
        sys.exit(1)

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Loading CLIP model...")
    model = SentenceTransformer(MODEL_NAME)

    prompts = ["a photo of a person wearing an outfit in " + words + " style"
               for _, _, words in VIBES]
    vectors = model.encode(prompts, normalize_embeddings=True)

    for (slug, label, words), prompt, vec in zip(VIBES, prompts, vectors):
        sb.table("vibes").upsert({
            "slug": slug,
            "label": label,
            "prompt": prompt,
            "embedding": "[" + ",".join(f"{x:.6f}" for x in vec.tolist()) + "]",
        }).execute()
        print("OK   " + label)

    print("")
    print("Finished: " + str(len(VIBES)) + " vibes saved.")


if __name__ == "__main__":
    main()