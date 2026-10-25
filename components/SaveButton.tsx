"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function SaveButton({ outfitId }: { outfitId: string }) {
  const supabase = createClient();
  const [saved, setSaved] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

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
  }, [outfitId]);

  async function toggle() {
    if (!loggedIn) {
      alert("Please log in to save outfits.");
      return;
    }
    if (saved) {
      await supabase.from("saves").delete().eq("outfit_id", outfitId);
      setSaved(false);
    } else {
      await supabase.from("saves").insert({ outfit_id: outfitId });
      setSaved(true);
    }
  }

  return (
    <button
      onClick={toggle}
      className={`mt-2 rounded px-3 py-1 text-xs font-semibold ${
        saved ? "bg-pink-500 text-white" : "bg-white text-black"
      }`}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}