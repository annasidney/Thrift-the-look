import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import SaveButton from "@/components/SaveButton";
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
    <main className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          ThriftTheLook
        </Link>
        <div className="flex items-center gap-6">
          <Link className="underline text-sm font-semibold" href="/vibes">
            Vibes
          </Link>
          <Link className="underline text-sm" href="/upload">
            Upload
          </Link>
          <Link className="underline text-sm" href="/boards">
            Saved
          </Link>
          <AuthStatus />
        </div>
      </header>

      <h1 className="mb-1 text-xl font-semibold">Shop by vibe</h1>
      <p className="mb-5 text-sm text-gray-500">
        Pick a vibe and our AI finds outfits that look like it.
      </p>

      {vibes.length === 0 ? (
        <p className="text-sm">
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
                    ? "border-black bg-black text-white"
                    : "border-gray-300 hover:border-black"
                }`}
              >
                {vb.label}
              </Link>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <p className="mb-4 text-sm text-red-600">
          Could not load outfits: {errorMessage}
        </p>
      )}

      {activeVibe && results.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">{activeVibe.label} looks</h2>
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-5 xl:columns-6">
            {results.map((outfit) => (
              <div key={outfit.id} className="mb-3 break-inside-avoid">
                <Link href={`/outfit/${outfit.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={outfit.image_url}
                    alt={outfit.title}
                    className="w-full max-h-96 rounded-2xl object-cover"
                  />
                </Link>
                <p className="mt-2 text-xs font-medium">{outfit.title}</p>
                <p className="text-[10px] text-gray-400">
                  {Math.round(outfit.similarity * 100)}% vibe match
                </p>
                <SaveButton outfitId={outfit.id} />
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}