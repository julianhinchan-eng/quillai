import { supabase } from "@/integrations/supabase/client";

const signedCache = new Map<string, { url: string; expires: number }>();

export async function getSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  // If full URL already, return as-is
  if (path.startsWith("http")) return path;

  const cached = signedCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  signedCache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

const ALLOWED_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export async function uploadMedia(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const safeContentType = ALLOWED_TYPES[ext];
  if (!safeContentType) {
    throw new Error("Unsupported file type. Allowed: jpg, png, webp, gif, mp4, mov, webm.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File too large (max 50 MB).");
  }
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: safeContentType,
  });
  if (error) throw error;
  return path;
}

