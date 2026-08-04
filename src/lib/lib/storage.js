import { supabase } from "./supabaseClient";

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
