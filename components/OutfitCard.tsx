import Link from "next/link";
import SaveButton from "@/components/SaveButton";

export type OutfitCardProps = {
  id: string;
  title: string;
  imageUrl: string;
  subtitle?: string;
  showSave?: boolean;
};

export default function OutfitCard({
  id,
  title,
  imageUrl,
  subtitle,
  showSave = true,
}: OutfitCardProps) {
  return (
    <div className="group mb-4 break-inside-avoid">
      <Link
        href={`/outfit/${id}`}
        className="block overflow-hidden rounded-2xl bg-neutral-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link href={`/outfit/${id}`}>
            <p className="line-clamp-1 text-sm font-medium text-neutral-900 group-hover:text-rose-600">
              {title}
            </p>
          </Link>
          {subtitle && (
            <p className="line-clamp-1 text-xs text-neutral-400">{subtitle}</p>
          )}
        </div>
        {showSave && <SaveButton outfitId={id} />}
      </div>
    </div>
  );
}
