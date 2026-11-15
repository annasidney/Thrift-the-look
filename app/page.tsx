import Link from "next/link";
import FeedGrid from "@/components/FeedGrid";
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
    .order("created_at", { ascending: false })
    .range(0, 19);

  const { data: trendingData } = await supabase.rpc("trending_outfits", {
    window_days: 7,
    match_count: 10,
  });
  const trending = (trendingData as TrendingOutfit[]) ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      {/* Intro */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Love the look? Shop it at your budget.
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Every outfit broken into pieces, with thrift, mid and premium picks in ₹.
        </p>
      </div>

      {/* Trending this week */}
      {trending.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              Trending this week
            </h2>
            <p className="text-xs text-neutral-400">Most saved in the last 7 days</p>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
            {trending.map((t, index) => (
              <Link
                key={t.id}
                href={`/outfit/${t.id}`}
                className="group relative w-36 flex-none sm:w-44"
              >
                <div className="relative overflow-hidden rounded-2xl bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.image_url}
                    alt={t.title}
                    className="h-52 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-60"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
                    #{index + 1}
                  </span>
                </div>
                <p className="mt-2 line-clamp-1 text-xs font-medium text-neutral-900 group-hover:text-rose-600">
                  {t.title}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {t.save_count} {Number(t.save_count) === 1 ? "save" : "saves"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main feed */}
      <h2 className="mb-4 text-xl font-bold tracking-tight text-neutral-900">
        Discover
      </h2>
      <FeedGrid initialOutfits={outfits ?? []} />
    </main>
  );
}
