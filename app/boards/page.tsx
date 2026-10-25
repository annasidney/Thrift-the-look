"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import SaveButton from "@/components/SaveButton";
import { createClient } from "@/lib/supabase-browser";

type Outfit = {
  id: string;
  title: string;
  image_url: string;
  vibe_tags: string[] | null;
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

      const list = (data ?? [])
        .map((row: any) => row.outfits)
        .filter(Boolean) as Outfit[];
      setOutfits(list);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          ThriftTheLook
        </Link>
        <div className="flex items-center gap-6">
          <Link className="underline text-sm" href="/upload">
            Upload
          </Link>
          <AuthStatus />
        </div>
      </header>

      <h2 className="mb-6 text-xl font-semibold">Your saved outfits</h2>

      {loading ? (
        <p>Loading...</p>
      ) : !loggedIn ? (
        <p>
          Please <Link className="underline" href="/login">log in</Link> to see
          your saved outfits.
        </p>
      ) : outfits.length === 0 ? (
        <p>
          Nothing saved yet. Go to the{" "}
          <Link className="underline" href="/">feed</Link> and save some outfits.
        </p>
      ) : (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {outfits.map((outfit) => (
            <div key={outfit.id} className="mb-4 break-inside-avoid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={outfit.image_url}
                alt={outfit.title}
                className="w-full rounded-xl"
              />
              <p className="mt-2 text-sm font-semibold">{outfit.title}</p>
              <p className="text-xs text-gray-400">
                {outfit.vibe_tags?.map((t) => `#${t}`).join(" ")}
              </p>
              <SaveButton outfitId={outfit.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}