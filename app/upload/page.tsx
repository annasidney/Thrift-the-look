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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  }

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

    setIsUploading(true);
    setMessage("Uploading...");

    try {
      // 1. Upload the photo to the storage bucket
      const ext = file.name.split(".").pop();
      const path = `${userData.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("outfits")
        .upload(path, file);

      if (uploadError) {
        setMessage(uploadError.message);
        setIsUploading(false);
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
        setIsUploading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          Upload an outfit
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Share your style with the community.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Title
            </label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900"
              type="text"
              placeholder="e.g. Y2K party look"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Vibe tags
            </label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900"
              type="text"
              placeholder="Comma separated: y2k, party, casual"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Photo
            </label>
            <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 p-4 text-center transition hover:border-neutral-400">
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="max-h-64 rounded-xl object-contain shadow-sm"
                  />
                  <span className="mt-2 text-xs font-medium text-neutral-500 hover:text-neutral-800">
                    Click to choose a different photo
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <svg
                    className="h-8 w-8 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-neutral-700">
                    Click to choose photo
                  </p>
                  <p className="text-xs text-neutral-400">PNG, JPG, WEBP</p>
                </div>
              )}
              <input
                className="hidden"
                type="file"
                accept="image/*"
                disabled={isUploading}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <button
            className="w-full rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>

          {message && (
            <p className="text-center text-sm font-medium text-rose-600">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
