import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import SaveButton from "@/components/SaveButton";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function OutfitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: outfit } = await supabase
    .from("outfits")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: similar } = await supabase.rpc("similar_outfits", {
    target_id: id,
    match_count: 8,
  });

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
          <Link className="underline text-sm" href="/boards">
            Saved
          </Link>
          <AuthStatus />
        </div>
      </header>

      {!outfit ? (
        <p>Outfit not found.</p>
      ) : (
        <>
          <div className="mx-auto mb-12 max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outfit.image_url}
              alt={outfit.title}
              className="w-full rounded-2xl"
            />
            <p className="mt-3 text-lg font-semibold">{outfit.title}</p>
            <p className="text-sm text-gray-400">
              {outfit.vibe_tags?.map((t: string) => `#${t}`).join(" ")}
            </p>
            <SaveButton outfitId={outfit.id} />
          </div>

          <h2 className="mb-4 text-lg font-semibold">Similar outfits</h2>
          {!similar || similar.length === 0 ? (
            <p className="text-sm">No similar outfits found yet.</p>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-5 xl:columns-6">
              {similar.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/outfit/${s.id}`}
                  className="mb-3 block break-inside-avoid"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image_url}
                    alt={s.title}
                    className="w-full max-h-96 rounded-2xl object-cover"
                  />
                  <p className="mt-2 text-xs font-medium">{s.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {Math.round(s.similarity * 100)}% match
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}