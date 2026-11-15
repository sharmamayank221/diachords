// TONE3000 integration (Select flow): the user browses tone3000.com in a popup, picks a
// tone, and we download the model they choose straight into their browser. Everything
// runs client-side with OAuth 2.0 + PKCE; the publishable key is safe to ship.
// Based on TONE3000's MIT-licensed example client (github.com/tone-3000/t3k-api).

import { APP_URL_SCHEME, IS_NATIVE_APP, NativeShell, SITE_URL } from "@/lib/native";

const T3K = "https://www.tone3000.com";
export const TONE3000_KEY = process.env.NEXT_PUBLIC_TONE3000_KEY ?? "";

export type T3KKind = "nam" | "ir";
export type T3KArchitecture = "1" | "2";

export interface T3KTone {
  id: number;
  title: string;
  description: string | null;
  gear: string;
  format: string;
  license: string;
  images: string[] | null;
  url: string;
  user: { username: string; display_name: string | null; avatar_url: string | null; url: string };
}

export interface T3KModel {
  id: number;
  name: string;
  size: string;
  model_url: string;
  architecture_version: string | null;
}

/** Attribution we keep with every downloaded tone (TONE3000 terms: never strip it). */
export interface T3KSource {
  source: "tone3000";
  toneId: number;
  toneUrl: string;
  title: string;
  creator: string;
  creatorUrl: string;
  avatar: string | null;
  image: string | null;
  license: string;
  gear: string;
}

interface Tokens {
  access: string;
  refresh: string;
  expiresAt: number;
}
let tokens: Tokens | null = null;

// The app has no web origin of its own, so it uses the website's callback page, which hands
// the result back through the app's URL scheme (see public/tone3000-callback.html).
const redirectUri = () => `${IS_NATIVE_APP ? SITE_URL : window.location.origin}/tone3000-callback.html`;
const NATIVE_STATE_PREFIX = "app.";

type PickResult = { code: string | null; toneId: string | null; error: string | null } | null;

async function pickInNativeSheet(url: URL, state: string): Promise<PickResult> {
  const { url: callback, canceled } = await NativeShell.startWebAuth({ url: url.toString(), callbackScheme: APP_URL_SCHEME });
  if (canceled || !callback) return null;
  const p = new URL(callback.replace(`${APP_URL_SCHEME}://`, "https://app/")).searchParams;
  if (p.get("state") !== state) return null;
  if (p.get("canceled") === "true" && !p.get("tone_id")) return null;
  return { code: p.get("code"), toneId: p.get("tone_id"), error: p.get("error") };
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function pkce() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, state, challenge: base64url(new Uint8Array(hash)) };
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch(`${T3K}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, client_id: TONE3000_KEY }),
  });
  if (!res.ok) throw new Error("TONE3000 sign-in failed. Please try again.");
  const d = await res.json();
  return { access: d.access_token, refresh: d.refresh_token, expiresAt: Date.now() + d.expires_in * 1000 };
}

async function accessToken(): Promise<string> {
  if (!tokens) throw new Error("Not signed in to TONE3000.");
  if (Date.now() > tokens.expiresAt - 30_000) tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: tokens.refresh });
  return tokens.access;
}

async function api(path: string): Promise<Response> {
  const res = await fetch(path.startsWith("http") ? path : `${T3K}${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (res.status === 429) throw new Error("TONE3000 is busy right now. Try again in a minute.");
  if (!res.ok) throw new Error(`TONE3000 request failed (${res.status}).`);
  return res;
}

/**
 * Opens TONE3000's tone browser. Resolves with the picked tone and its models,
 * or null if the user closed the window without picking.
 */
export async function browseTone3000(kind: T3KKind, architecture: T3KArchitecture = "2"): Promise<{ tone: T3KTone; models: T3KModel[] } | null> {
  if (!TONE3000_KEY) throw new Error("TONE3000 isn’t set up on this site yet.");
  // open synchronously so popup blockers see the click
  const popup = IS_NATIVE_APP
    ? null
    : window.open("about:blank", "t3k_select", "width=480,height=720,left=" + Math.round(window.screenX + (window.outerWidth - 480) / 2) + ",top=" + Math.round(window.screenY + 40));
  if (!IS_NATIVE_APP && !popup) throw new Error("Your browser blocked the TONE3000 window. Allow pop-ups for this site and try again.");

  const { verifier, state: rawState, challenge } = await pkce();
  const state = IS_NATIVE_APP ? NATIVE_STATE_PREFIX + rawState : rawState;
  const url = new URL(`${T3K}/api/v1/oauth/authorize`);
  const params: Record<string, string> = {
    client_id: TONE3000_KEY,
    redirect_uri: redirectUri(),
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    prompt: "select_tone",
    menubar: "true",
    preview: "true",
    format: kind,
    gears: kind === "nam" ? "amp_amp-cab_pedal" : "cab",
  };
  if (kind === "nam") params.architecture = architecture;
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const result = popup ? await pickInPopup(popup, url, state) : await pickInNativeSheet(url, state);

  if (!result) return null;
  if (result.error || !result.code) throw new Error("TONE3000 sign-in didn’t complete. Please try again.");
  tokens = await tokenRequest({ grant_type: "authorization_code", code: result.code, code_verifier: verifier, redirect_uri: redirectUri() });
  if (!result.toneId) return null;

  const arch = kind === "nam" ? `&architecture=${architecture}` : "";
  const [tone, models] = await Promise.all([
    api(`/api/v1/tones/${result.toneId}?${arch.slice(1)}`).then((r) => r.json() as Promise<T3KTone>),
    api(`/api/v1/models?tone_id=${result.toneId}&page_size=100${arch}`).then((r) => r.json() as Promise<{ data: T3KModel[] }>),
  ]);
  return { tone, models: models.data };
}

function pickInPopup(popup: Window, url: URL, state: string): Promise<PickResult> {
  popup.location.href = url.toString();
  return new Promise<PickResult>((resolve) => {
    let done = false;
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("t3k_oauth") : null;
    const finish = (v: PickResult) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      bc?.close();
      clearInterval(poll);
      resolve(v);
    };
    const handle = (data: any) => {
      if (data?.type !== "t3k_oauth_callback" || data.state !== state) return;
      if (data.canceled && !data.tone_id) return finish(null);
      finish({ code: data.code, toneId: data.tone_id, error: data.error });
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin) handle(e.data);
    };
    window.addEventListener("message", onMessage);
    if (bc) bc.onmessage = (e) => handle(e.data);
    // closed without picking (allow a moment for a last relayed message)
    const poll = setInterval(() => {
      if (popup.closed) setTimeout(() => finish(null), 800);
    }, 500);
  });
}

/** Downloads one model of a picked tone as a File our tone store understands. */
export async function downloadTone3000Model(tone: T3KTone, model: T3KModel, kind: T3KKind): Promise<{ file: File; source: T3KSource }> {
  const blob = await (await api(model.model_url)).blob();
  const base = tone.title.toLowerCase() === model.name.toLowerCase() ? tone.title : `${tone.title} · ${model.name}`;
  const file = new File([blob], `${base.replace(/[\\/:*?"<>|]/g, "-")}.${kind === "nam" ? "nam" : "wav"}`);
  return {
    file,
    source: {
      source: "tone3000",
      toneId: tone.id,
      toneUrl: tone.url,
      title: base,
      creator: tone.user.display_name || tone.user.username,
      creatorUrl: tone.user.url,
      avatar: tone.user.avatar_url,
      image: tone.images?.[0] ?? null,
      license: tone.license,
      gear: tone.gear,
    },
  };
}

export const LICENSE_LABEL: Record<string, string> = {
  t3k: "TONE3000 licence",
  "cc-by": "CC BY",
  "cc-by-sa": "CC BY-SA",
  "cc-by-nc": "CC BY-NC",
  "cc-by-nc-sa": "CC BY-NC-SA",
  "cc-by-nd": "CC BY-ND",
  "cc-by-nc-nd": "CC BY-NC-ND",
  cco: "CC0",
};

export const GEAR_LABEL: Record<string, string> = { amp: "Amp", "amp-cab": "Amp + cab", "full-rig": "Amp + cab", pedal: "Pedal", cab: "Cabinet", outboard: "Outboard", ir: "IR" };
