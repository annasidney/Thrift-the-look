"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function UploadPage() {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file || !title) {
      setMessage("Please add a title and choose a photo.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage("Please log in first.");
      return;
    }

    setMessage("Uploading...");

    // 1. Upload the photo to the storage bucket
    const ext = file.name.split(".").pop();
    const path = `${userData.user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("outfits")
      .upload(path, file);

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    // 2. Get the public link of the photo
    const { data: urlData } = supabase.storage
      .from("outfits")
      .getPublicUrl(path);

    // 3. Save the outfit in the database
    const vibeTags = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const { error: insertError } = await supabase.from("outfits").insert({
      title,
      image_url: urlData.publicUrl,
      vibe_tags: vibeTags,
    });

    if (insertError) {
      setMessage(insertError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto mt-20 max-w-sm rounded-xl bg-neutral-900 p-6 text-white">
      <h1 className="mb-6 text-2xl font-bold">Upload an outfit</h1>
      <input
        className="mb-3 w-full rounded border border-neutral-600 bg-white p-2 text-black placeholder-gray-500"
        type="text"
        placeholder="Title (e.g. Y2K party look)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="mb-3 w-full rounded border border-neutral-600 bg-white p-2 text-black placeholder-gray-500"
        type="text"
        placeholder="Vibe tags, comma separated (y2k, party)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <input
        className="mb-3 w-full text-sm"
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        className="w-full rounded bg-white p-2 font-semibold text-black hover:bg-gray-200"
        onClick={handleUpload}
      >
        Upload
      </button>
      <p className="mt-4 text-sm text-white">{message}</p>
    </main>
  );
}