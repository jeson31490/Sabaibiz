import { supabase } from "./supabase";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png"];

type AuthUserLike = { id: string; user_metadata?: Record<string, unknown> | null };

// The photo lives at avatars/<user id>. The same path is reused on every upload, so the
// version saved in the user metadata is appended to bust browser and CDN caches.
export function getAvatarUrl(user: AuthUserLike): string | null {
  const version = user.user_metadata?.avatar_version;
  if (!version) return null;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(user.id);
  return `${data.publicUrl}?v=${version}`;
}

// Uploads the photo (replacing any previous one) and records its version in the user metadata.
export async function uploadAvatar(user: AuthUserLike, file: File) {
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(user.id, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (uploadError) throw uploadError;

  const { data, error: updateError } = await supabase.auth.updateUser({
    data: { avatar_version: Date.now() },
  });
  if (updateError) throw updateError;

  return getAvatarUrl(data.user);
}
