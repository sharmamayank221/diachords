import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { applyCors } from "@/lib/cors";

// Permanently deletes the signed-in user's account and saved chords.
// Needs SUPABASE_SERVICE_ROLE_KEY on the server (never exposed to the browser).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (applyCors(req, res, "POST, OPTIONS")) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "Account deletion isn't configured on the server." });

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not signed in." });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Your session has expired. Sign in again." });

  const { error: favError } = await admin.from("user_favorites").delete().eq("user_id", data.user.id);
  if (favError) return res.status(500).json({ error: "Couldn't delete your saved chords. Try again." });

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return res.status(500).json({ error: "Couldn't delete your account. Try again." });

  return res.status(200).json({ ok: true });
}
