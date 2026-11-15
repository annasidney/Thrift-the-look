export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-8">
      {/* Intro skeleton */}
      <div className="mb-8 max-w-lg space-y-3">
        <div className="h-8 w-3/4 rounded-lg bg-neutral-200 sm:h-10" />
        <div className="h-4 w-full rounded bg-neutral-200" />
      </div>

      {/* Trending row skeleton */}
      <div className="mb-10">
        <div className="mb-3 h-5 w-40 rounded bg-neutral-200" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2 sm:-mx-8 sm:px-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-36 flex-none space-y-2 sm:w-44">
              <div className="h-52 rounded-2xl bg-neutral-200 sm:h-60" />
              <div className="h-3 w-3/4 rounded bg-neutral-200" />
              <div className="h-2 w-1/3 rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Discover grid skeleton */}
      <div className="mb-4 h-6 w-32 rounded bg-neutral-200" />
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
        {[260, 320, 240, 300, 280, 340, 220, 300, 250, 310].map((h, i) => (
          <div key={i} className="mb-4 break-inside-avoid space-y-2.5">
            <div
              className="w-full rounded-2xl bg-neutral-200"
              style={{ height: `${h}px` }}
            />
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-1/2 rounded bg-neutral-200" />
              <div className="h-5 w-12 rounded-full bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
