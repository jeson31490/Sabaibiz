import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Removes every file under a folder of a storage bucket (folders are listed level by level). */
async function emptyFolder(admin: SupabaseClient, bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 4) return;
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return;
  const files: string[] = [];
  for (const entry of data) {
    const path = `${prefix}/${entry.name}`;
    // Folders come back without an id.
    if (entry.id) files.push(path);
    else await emptyFolder(admin, bucket, path, depth + 1);
  }
  if (files.length > 0) await admin.storage.from(bucket).remove(files);
}

/**
 * Deletes a login for good. An owner's whole business follows (database rows go through "on delete cascade";
 * the stored photos are removed here first because the cascade doesn't reach them). A team member only loses
 * their own login and avatar.
 */
export async function purgeAccount(admin: SupabaseClient, userId: string, isMember: boolean): Promise<boolean> {
  if (!isMember) await emptyFolder(admin, "payment-scans", userId);
  await admin.storage.from("avatars").remove([userId]);
  const { error } = await admin.auth.admin.deleteUser(userId);
  return !error;
}
