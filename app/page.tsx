import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import SaveButton from "@/components/SaveButton";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: outfits } = await supabase
    .from("outfits")
    .select("id, title, image_url, vibe_tags")
    .order("created_at", { ascending: false });

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

      {!outfits || outfits.length === 0 ? (
        <p>No outfits yet. Upload the first one!</p>
      ) : (
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
      )}
    </main>
  );
}