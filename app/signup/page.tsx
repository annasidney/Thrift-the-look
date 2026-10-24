"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup() {
    setMessage("Creating account...");
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : "Account created! You are signed up.");
  }

  return (
    <main className="mx-auto mt-20 max-w-sm rounded-xl bg-neutral-900 p-6 text-white">
      <h1 className="mb-6 text-2xl font-bold">Sign up</h1>
      <input
        className="mb-3 w-full rounded border border-neutral-600 bg-white p-2 text-black placeholder-gray-500"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="mb-3 w-full rounded border border-neutral-600 bg-white p-2 text-black placeholder-gray-500"
        type="password"
        placeholder="Password (min 6 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="w-full rounded bg-white p-2 font-semibold text-black hover:bg-gray-200"
        onClick={handleSignup}
      >
        Sign up
      </button>
      <p className="mt-4 text-sm text-white">{message}</p>
    </main>
  );
}