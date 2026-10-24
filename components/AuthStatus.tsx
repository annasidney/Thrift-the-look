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
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) return <p className="text-sm">Checking login...</p>;

  if (user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span>Logged in as {user.email}</span>
        <button
          className="rounded bg-white px-3 py-1 font-semibold text-black hover:bg-gray-200"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link className="underline" href="/login">Log in</Link>
      <Link className="underline" href="/signup">Sign up</Link>
    </div>
  );
}