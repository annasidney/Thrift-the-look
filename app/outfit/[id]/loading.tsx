export default function OutfitLoading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-8">
      <div className="mb-14 grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Left column skeleton */}
        <div className="space-y-4">
          <div className="aspect-[3/4] w-full rounded-2xl bg-neutral-200" />
          <div className="flex items-start justify-between gap-3">
            <div className="w-2/3 space-y-2">
              <div className="h-6 rounded bg-neutral-200" />
              <div className="h-4 w-1/2 rounded bg-neutral-200" />
            </div>
            <div className="h-7 w-16 rounded-full bg-neutral-200" />
          </div>
        </div>

        {/* Right column skeleton: Shop this look */}
        <div>
          <div className="mb-2 h-7 w-48 rounded bg-neutral-200" />
          <div className="mb-6 h-4 w-72 rounded bg-neutral-200" />

          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-neutral-200 p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl bg-neutral-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-neutral-200" />
                    <div className="h-3 w-32 rounded bg-neutral-200" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[...Array(3)].map((_, j) => (
                    <div
                      key={j}
                      className="overflow-hidden rounded-xl border border-neutral-200"
                    >
                      <div className="aspect-square bg-neutral-200" />
                      <div className="space-y-2 p-3">
                        <div className="h-3 w-12 rounded-full bg-neutral-200" />
                        <div className="h-4 w-3/4 rounded bg-neutral-200" />
                        <div className="h-3 w-1/3 rounded bg-neutral-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Similar outfits skeleton */}
      <div className="mt-12 border-t border-neutral-200 pt-10">
        <div className="mb-4 h-6 w-36 rounded bg-neutral-200" />
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mb-4 break-inside-avoid space-y-2">
              <div className="h-56 rounded-2xl bg-neutral-200" />
              <div className="h-3 w-2/3 rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
