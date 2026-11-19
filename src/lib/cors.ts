import type { NextApiRequest, NextApiResponse } from "next";

// The iOS app is served from capacitor://localhost and calls these API routes on the website.
const APP_ORIGINS = new Set(["capacitor://localhost", "ionic://localhost"]);

/** Adds CORS headers for the app. Returns true when the request was a preflight and is done. */
export function applyCors(req: NextApiRequest, res: NextApiResponse, methods = "GET, OPTIONS"): boolean {
  const origin = req.headers.origin;
  if (origin && APP_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", methods);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
