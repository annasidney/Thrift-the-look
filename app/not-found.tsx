import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-rose-600">
        404 error
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        Look not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-neutral-500">
        We couldn&apos;t find the outfit you were looking for. It might have been removed or the link might be broken.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Back to Discover
        </Link>
      </div>
    </main>
  );
}
