import Link from "next/link";
import OutfitCard from "@/components/OutfitCard";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Vibe = { slug: string; label: string };
type VibeOutfit = {
  id: string;
  title: string;
  image_url: string;
  similarity: number;
};

export default async function VibesPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;

  const { data: vibesData } = await supabase
    .from("vibes")
    .select("slug, label")
    .order("label");
  const vibes = (vibesData as Vibe[]) ?? [];

  const activeSlug = v ?? vibes[0]?.slug;
  const activeVibe = vibes.find((vb) => vb.slug === activeSlug);

  let results: VibeOutfit[] = [];
  let errorMessage = "";
  if (activeSlug) {
    const { data, error } = await supabase.rpc("vibe_outfits", {
      vibe_slug: activeSlug,
      match_count: 30,
    });
    if (error) errorMessage = error.message;
    results = (data as VibeOutfit[]) ?? [];
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-neutral-900">
        Shop by vibe
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Pick a vibe and our AI finds outfits that match the aesthetic.
      </p>

      {vibes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No vibes yet. Run <code>python embed_vibes.py</code> in the seed folder.
        </p>
      ) : (
        <div className="mb-8 flex flex-wrap gap-2">
          {vibes.map((vb) => {
            const active = vb.slug === activeSlug;
            return (
              <Link
                key={vb.slug}
                href={`/vibes?v=${vb.slug}`}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  active
                    ? "border-neutral-900 bg-neutral-900 font-medium text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900"
                }`}
              >
                {vb.label}
              </Link>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <p className="mb-4 text-sm text-rose-600">
          Could not load outfits: {errorMessage}
        </p>
      )}

      {activeVibe && results.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            {activeVibe.label} looks
          </h2>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
            {results.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                id={outfit.id}
                title={outfit.title}
                imageUrl={outfit.image_url}
                subtitle={`${Math.round(outfit.similarity * 100)}% vibe match`}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
