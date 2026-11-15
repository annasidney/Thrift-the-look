import { notFound } from "next/navigation";
import SaveButton from "@/components/SaveButton";
import OutfitCard from "@/components/OutfitCard";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ShopRow = {
  piece_id: string;
  piece_category: string;
  piece_image_url: string;
  tier: string;
  product_id: string;
  product_name: string;
  price_inr: number;
  store: string;
  link: string;
  product_image_url: string;
  similarity: number;
};

type PieceGroup = {
  pieceId: string;
  category: string;
  imageUrl: string;
  options: ShopRow[];
};

type SimilarOutfit = {
  id: string;
  title: string;
  image_url: string;
  similarity: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Dress",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bag: "Bag",
};

const TIER_STYLES: Record<string, { label: string; badge: string }> = {
  thrift: { label: "Thrift", badge: "bg-emerald-100 text-emerald-800" },
  mid: { label: "Mid", badge: "bg-blue-100 text-blue-800" },
  premium: { label: "Premium", badge: "bg-amber-100 text-amber-800" },
};

const CATEGORY_ORDER = ["outerwear", "top", "dress", "bottom", "shoes", "bag"];

function formatINR(value: number) {
  return "₹" + Number(value).toLocaleString("en-IN");
}

function groupByPiece(rows: ShopRow[]): PieceGroup[] {
  const map = new Map<string, PieceGroup>();
  for (const row of rows) {
    if (!map.has(row.piece_id)) {
      map.set(row.piece_id, {
        pieceId: row.piece_id,
        category: row.piece_category,
        imageUrl: row.piece_image_url,
        options: [],
      });
    }
    map.get(row.piece_id)!.options.push(row);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );
}

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

  if (!outfit) {
    notFound();
  }

  const { data: similarData } = await supabase.rpc("similar_outfits", {
    target_id: id,
    match_count: 8,
  });
  const similar = (similarData as SimilarOutfit[]) ?? [];

  const { data: shopRows, error: shopError } = await supabase.rpc(
    "outfit_shop",
    { target_outfit_id: id }
  );

  const pieces = groupByPiece((shopRows as ShopRow[]) ?? []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-14 grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Left: the outfit */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={outfit.image_url}
            alt={outfit.title}
            className="w-full rounded-2xl object-cover shadow-sm"
          />
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                {outfit.title}
              </h1>
              <p className="mt-0.5 text-xs text-neutral-400">
                {outfit.vibe_tags?.map((t: string) => `#${t}`).join(" ")}
              </p>
            </div>
            <SaveButton outfitId={outfit.id} />
          </div>
        </div>

        {/* Right: shop the look */}
        <section>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-neutral-900">
            Shop this look
          </h2>
          <p className="mb-6 text-sm text-neutral-500">
            Every piece at three budgets: thrift, mid and premium.
          </p>

          {shopError ? (
            <p className="text-sm text-rose-600">
              Could not load products: {shopError.message}
            </p>
          ) : pieces.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No pieces detected for this outfit yet.
            </p>
          ) : (
            <div className="space-y-8">
              {pieces.map((piece) => (
                <div
                  key={piece.pieceId}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={piece.imageUrl}
                      alt={piece.category}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {CATEGORY_LABELS[piece.category] ?? piece.category}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Spotted in this outfit
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {piece.options.map((option) => {
                      const style = TIER_STYLES[option.tier] ?? {
                        label: option.tier,
                        badge: "bg-neutral-100 text-neutral-800",
                      };
                      return (
                        <a
                          key={option.product_id}
                          href={option.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md"
                        >
                          <div className="aspect-square overflow-hidden bg-neutral-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={option.product_image_url}
                              alt={option.product_name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-3">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
                            >
                              {style.label}
                            </span>
                            <p className="mt-2 line-clamp-1 text-sm font-medium text-neutral-900 group-hover:text-rose-600">
                              {option.product_name}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {option.store}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-semibold text-neutral-900">
                                {formatINR(option.price_inr)}
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                {Math.round(option.similarity * 100)}% match
                              </span>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-12 border-t border-neutral-200 pt-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight text-neutral-900">
          Similar outfits
        </h2>
        {similar.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No similar outfits found yet.
          </p>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
            {similar.map((s) => (
              <OutfitCard
                key={s.id}
                id={s.id}
                title={s.title}
                imageUrl={s.image_url}
                subtitle={`${Math.round(s.similarity * 100)}% match`}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
