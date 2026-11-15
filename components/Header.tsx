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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className={`${playfair.className} text-2xl font-bold tracking-tight text-neutral-900`}
        >
          Thrift<span className="italic text-rose-600">The</span>Look
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${
                item.hideOnMobile ? "hidden sm:inline-flex" : "inline-flex"
              } rounded-full px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-black`}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-1 text-sm text-neutral-800 sm:ml-3">
            <AuthStatus />
          </div>
        </nav>
      </div>
    </header>
  );
}