"use client";

import { useState } from "react";
import OutfitCard from "@/components/OutfitCard";
import { createClient } from "@/lib/supabase-browser";

export type FeedOutfit = {
  id: string;
  title: string;
  image_url: string;
  vibe_tags: string[] | null;
};

const PAGE_SIZE = 20;

export default function FeedGrid({
  initialOutfits,
}: {
  initialOutfits: FeedOutfit[];
}) {
  const supabase = createClient();
  const [outfits, setOutfits] = useState<FeedOutfit[]>(initialOutfits);
  const [hasMore, setHasMore] = useState(initialOutfits.length >= PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLoadMore() {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    const start = outfits.length;
    const end = start + PAGE_SIZE - 1;

    try {
      const { data, error } = await supabase
        .from("outfits")
        .select("id, title, image_url, vibe_tags")
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) {
        setHasMore(false);
        return;
      }

      const rows = (data as FeedOutfit[]) ?? [];
      if (rows.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setOutfits((prev) => {
        const existingIds = new Set(prev.map((o) => o.id));
        const newUnique = rows.filter((o) => !existingIds.has(o.id));
        return [...prev, ...newUnique];
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (outfits.length === 0) {
    return <p className="text-neutral-500">No outfits yet. Upload the first one!</p>;
  }

  return (
    <div>
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
        {outfits.map((outfit) => (
          <OutfitCard
            key={outfit.id}
            id={outfit.id}
            title={outfit.title}
            imageUrl={outfit.image_url}
            subtitle={outfit.vibe_tags?.map((t: string) => `#${t}`).join(" ")}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
