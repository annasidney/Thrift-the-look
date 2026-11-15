"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup() {
    setIsLoading(true);
    setMessage("Creating account...");
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : "Account created! You are signed up.");
    setIsLoading(false);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          Sign up
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create an account to save outfits and curate boards.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Password
            </label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            className="w-full rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            onClick={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>

          {message && (
            <p className="text-center text-sm font-medium text-rose-600">
              {message}
            </p>
          )}

          <p className="text-center text-xs text-neutral-500">
            Already have an account?{" "}
            <Link className="font-semibold text-neutral-900 underline" href="/login">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
