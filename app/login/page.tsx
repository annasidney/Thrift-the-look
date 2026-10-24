"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setMessage("Logging in...");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto mt-20 max-w-sm rounded-xl bg-neutral-900 p-6 text-white">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
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
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="w-full rounded bg-white p-2 font-semibold text-black hover:bg-gray-200"
        onClick={handleLogin}
      >
        Log in
      </button>
      <p className="mt-4 text-sm text-white">{message}</p>
    </main>
  );
}