import { supabase } from "./supabaseClient";

// This mirrors the simple key -> JSON blob pattern the app was originally built on
// (one row per data type: "students", "teachers", "results", etc.), just backed by a
// real Postgres table (see supabase/schema.sql) instead of Claude's artifact storage.
// Because every read/write in App.jsx goes through these two functions, the rest of
// the app's code did not need to change to move to a real database.

export async function getItem(key) {
  const { data, error } = await supabase.from("app_storage").select("value").eq("key", key).maybeSingle();
  if (error) {
    console.error(`Storage read error for "${key}":`, error);
    return null;
  }
  return data ? data.value : null;
}

export async function setItem(key, value) {
  const { error } = await supabase.from("app_storage").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) {
    console.error(`Storage write error for "${key}":`, error);
    return false;
  }
  return true;
}

// Uploads a compressed image blob to the "photos" bucket in Supabase Storage and
// returns a public URL. Requires the bucket to exist (see supabase/storage-setup.sql).
export async function uploadPhoto(blob, folder = "photos") {
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("photos").upload(fileName, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) {
    console.error("Photo upload error:", error);
    return null;
  }
  const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
  return data?.publicUrl || null;
}
