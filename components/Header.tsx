import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import { playfair } from "@/lib/fonts";

const NAV = [
  { href: "/", label: "Discover", hideOnMobile: true },
  { href: "/vibes", label: "Vibes", hideOnMobile: false },
  { href: "/upload", label: "Upload", hideOnMobile: false },
  { href: "/boards", label: "Saved", hideOnMobile: false },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-8 sm:py-3">
        <Link
          href="/"
          className={`${playfair.className} shrink-0 text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl`}
        >
          Thrift<span className="italic text-rose-600">The</span>Look
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto py-0.5 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${
                item.hideOnMobile ? "hidden sm:inline-flex" : "inline-flex"
              } shrink-0 rounded-full px-2.5 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100 hover:text-black sm:px-3 sm:py-1.5 sm:text-sm`}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-1 shrink-0 text-xs text-neutral-800 sm:ml-3 sm:text-sm">
            <AuthStatus />
          </div>
        </nav>
      </div>
    </header>
  );
}
