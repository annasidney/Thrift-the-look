I'm building a portfolio project called ThriftTheLook, a Pinterest-style fashion site. I'm a beginner on Windows (PowerShell + VS Code), so please guide me ONE small step at a time, tell me exactly which file to edit, and give full file contents rather than partial snippets (partial pastes caused errors before).

One-liner: Turn any outfit photo into a shoppable look at thrift, mid and premium budgets, for Indian shoppers (prices in ₹).

Stack: Next.js (App Router, TypeScript, Tailwind), Supabase (Postgres, Auth, Storage, pgvector), Python scripts in /seed with a venv, CLIP (sentence-transformers clip-ViT-B-32). Repo: github.com/annasidney/Thrift-the-look

Folder notes: there is NO src folder. Folders are at the root: app/, components/, lib/, seed/. Import alias @/ points to the root.

DONE so far:
- Login/signup/logout (Supabase Auth; email confirm off for testing)
- Upload page (app/upload) saving to storage bucket "outfits" and table outfits
- Pinterest-style masonry feed (app/page.tsx), Save button (components/SaveButton.tsx), Saved page (app/boards)
- Seeded 50 outfits from the Fashionpedia dataset (detection-datasets/fashionpedia, CC BY 4.0) via seed/seed.py; titles/tags are random placeholders
- CLIP embeddings for all outfits via seed/embed.py (vector(512) column)
- SQL function similar_outfits(target_id, match_count) and outfit page app/outfit/[id] showing similar outfits
- Created tables products (name, category, price_inr, tier thrift/mid/premium, store, link, image_url, embedding) and pieces (outfit_id, category, image_url, embedding), with RLS read-only for everyone

IN PROGRESS:
- Hand-made catalog of 18 products (6 categories: top, bottom, dress, outerwear, shoes, bag x 3 tiers) in seed/products.csv with photos in seed/products/, imported by seed/import_products.py. I was about to test the import with 3 rows.

NEXT:
1. Finish product import
2. Create "pieces" for seeded outfits using Fashionpedia's garment annotations (crop each piece, embed it)
3. Outfit page: show each piece with 3 budget options (thrift/mid/premium) matched by CLIP similarity
4. Trending row (most saved this week), optional vibe search
5. Frontend polish (fonts, spacing, header, hover), pagination
6. Deploy (Vercel), README with architecture + Fashionpedia credit, demo video

Please confirm you understand, then continue with the in-progress step.
