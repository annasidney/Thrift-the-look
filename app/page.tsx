import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import { supabase } from "@/lib/supabase";
import SaveButton from "@/components/SaveButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: outfits } = await supabase
    .from("outfits")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ThriftTheLook</h1>
        <div className="flex items-center gap-6">
          <Link className="underline text-sm" href="/upload">
            Upload
          </Link>
          <AuthStatus />
        </div>
      </header>

      {!outfits || outfits.length === 0 ? (
        <p>No outfits yet. Upload the first one!</p>
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
                {outfit.vibe_tags?.map((t: string) => `#${t}`).join(" ")}
              </p>
              <SaveButton outfitId={outfit.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}