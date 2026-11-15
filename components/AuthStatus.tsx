"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

export default function AuthStatus() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) {
    return <span className="text-xs text-neutral-400">...</span>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
        <span className="hidden max-w-[120px] truncate text-neutral-600 md:inline">
          {user.email}
        </span>
        <button
          className="rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-400 sm:px-3"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
      <Link
        className="rounded-full px-2 py-1 text-neutral-600 transition hover:text-black"
        href="/login"
      >
        Log in
      </Link>
      <Link
        className="rounded-full bg-neutral-900 px-2.5 py-1 font-semibold text-white transition hover:bg-neutral-800 sm:px-3"
        href="/signup"
      >
        Sign up
      </Link>
    </div>
  );
}
