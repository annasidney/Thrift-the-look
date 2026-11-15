"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OutfitCard from "@/components/OutfitCard";
import { createClient } from "@/lib/supabase-browser";

type Outfit = {
  id: string;
  title: string;
  image_url: string;
  vibe_tags: string[] | null;
};

type SaveRow = {
  created_at: string;
  outfits: Outfit | null;
};

export default function BoardsPage() {
  const supabase = createClient();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      setLoggedIn(true);

      const { data } = await supabase
        .from("saves")
        .select("created_at, outfits(id, title, image_url, vibe_tags)")
        .order("created_at", { ascending: false });

      const list = ((data as unknown as SaveRow[]) ?? [])
        .map((row) => row.outfits)
        .filter((o): o is Outfit => Boolean(o));
      setOutfits(list);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">
        Your saved outfits
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Outfits you have saved to your board.
      </p>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : !loggedIn ? (
        <p className="text-sm text-neutral-600">
          Please{" "}
          <Link className="font-semibold text-neutral-900 underline" href="/login">
            log in
          </Link>{" "}
          to see your saved outfits.
        </p>
      ) : outfits.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Nothing saved yet. Go to the{" "}
          <Link className="font-semibold text-neutral-900 underline" href="/">
            feed
          </Link>{" "}
          and save some outfits.
        </p>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              id={outfit.id}
              title={outfit.title}
              imageUrl={outfit.image_url}
              subtitle={outfit.vibe_tags?.map((t) => `#${t}`).join(" ")}
            />
          ))}
        </div>
      )}
    </main>
  );
}
