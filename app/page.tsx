import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import SaveButton from "@/components/SaveButton";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type TrendingOutfit = {
  id: string;
  title: string;
  image_url: string;
  save_count: number;
};

export default async function Home() {
  const { data: outfits } = await supabase
    .from("outfits")
    .select("id, title, image_url, vibe_tags")
    .order("created_at", { ascending: false });

  const { data: trendingData } = await supabase.rpc("trending_outfits", {
    window_days: 7,
    match_count: 10,
  });
  const trending = (trendingData as TrendingOutfit[]) ?? [];

  return (
    <main className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ThriftTheLook</h1>
        <div className="flex items-center gap-6">
          <Link className="underline text-sm" href="/upload">
            Upload
          </Link>
          <Link className="underline text-sm" href="/boards">
            Saved
          </Link>
          <AuthStatus />
        </div>
      </header>

      {/* Trending this week */}
      {trending.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Trending this week</h2>
            <p className="text-xs text-gray-400">Most saved in the last 7 days</p>
          </div>
          <div className="-mx-8 flex gap-3 overflow-x-auto px-8 pb-2">
            {trending.map((t, index) => (
              <Link
                key={t.id}
                href={`/outfit/${t.id}`}
                className="group relative w-36 flex-none sm:w-44"
              >
                <div className="relative overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.image_url}
                    alt={t.title}
                    className="h-52 w-full object-cover transition group-hover:scale-105 sm:h-60"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
                    #{index + 1}
                  </span>
                </div>
                <p className="mt-2 line-clamp-1 text-xs font-medium">{t.title}</p>
                <p className="text-[10px] text-gray-400">
                  {t.save_count} {Number(t.save_count) === 1 ? "save" : "saves"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main feed */}
      {!outfits || outfits.length === 0 ? (
        <p>No outfits yet. Upload the first one!</p>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">Discover</h2>
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-5 xl:columns-6">
            {outfits.map((outfit) => (
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
                  {outfit.vibe_tags?.map((t: string) => `#${t}`).join(" ")}
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