import posthog from "posthog-js";
import { GA_MEASUREMENT_ID } from "./gtag";

type Params = Record<string, string | number | boolean | undefined>;

// One call sends the event to Google Analytics (as a GA4 event) and PostHog.
// Mark the important ones as key events in GA: Admin → Events → "Mark as key event".
export function track(name: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  try {
    if (GA_MEASUREMENT_ID && typeof window.gtag === "function") window.gtag("event", name, params);
  } catch {
    // analytics must never break the app
  }
  try {
    if ((posthog as any).__loaded) posthog.capture(name, params);
  } catch {
    // ignore
  }
}
