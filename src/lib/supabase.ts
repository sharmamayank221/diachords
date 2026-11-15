import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isNativeApp = process.env.NEXT_PUBLIC_NATIVE_APP === "1";

// Without credentials (local dev, previews without env vars) createClient would throw at import
// and take down every page under AuthProvider. Use an inert placeholder instead and let the UI
// hide sign-in / favourites via this flag. The iOS app has no accounts; its library syncs via iCloud.
export const isSupabaseConfigured = !isNativeApp && Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
