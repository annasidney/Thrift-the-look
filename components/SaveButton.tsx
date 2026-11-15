"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SaveButton({ outfitId }: { outfitId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setLoggedIn(true);
      const { data } = await supabase
        .from("saves")
        .select("id")
        .eq("outfit_id", outfitId)
        .maybeSingle();
      setSaved(!!data);
    }
    check();
  }, [outfitId, supabase]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!loggedIn) {
      router.push("/login");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      if (saved) {
        await supabase.from("saves").delete().eq("outfit_id", outfitId);
        setSaved(false);
      } else {
        await supabase.from("saves").insert({ outfit_id: outfitId });
        setSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={isSaving}
      aria-label={saved ? "Unsave outfit" : "Save outfit"}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        saved
          ? "border-rose-600 bg-rose-600 text-white"
          : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400"
      } disabled:opacity-50`}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
