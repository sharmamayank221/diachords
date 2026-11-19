// Bridge between the web app and the iOS shell (Capacitor). Everything here is a no-op or a
// browser fallback on the website, so components can call it unconditionally.
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/** Baked in at build time: the static export bundled in the iOS app sets NATIVE_APP=1. */
export const IS_NATIVE_APP = process.env.NEXT_PUBLIC_NATIVE_APP === "1";

/** Public website, used for API calls and share links from inside the app. */
export const SITE_URL = "https://chordsofguitar.com";

/** Custom URL scheme registered in ios/App/App/Info.plist for OAuth callbacks. */
export const APP_URL_SCHEME = "com.chordsofguitar.app";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * Capacitor's iOS file server answers bundled audio (mp3, wav, …) with a bare URLResponse, so
 * fetch() sees status 0 and `ok === false` even though the bytes arrive. Tone.js and the jam
 * sample loader both check `ok`, so relabel those local responses as 200.
 */
export function patchBundledFetch(): void {
  if (!IS_NATIVE_APP || typeof window === "undefined") return;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await original(input, init);
    if (res.status !== 0 || !res.body) return res;
    return new Response(res.body, { status: 200, statusText: "OK", headers: res.headers });
  };
}

/** API routes live on the website; the app has no server of its own. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

let liveMicTracks = 0;

function setAudioSessionType(type: "playback" | "play-and-record"): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  try {
    if (session) session.type = type;
  } catch {
    /* not supported */
  }
}

/**
 * Plays Web Audio through the silent switch like a music app (iOS 16.4+). Left alone while a
 * microphone is live, because the "playback" session rejects audio capture.
 */
export function preferPlaybackAudioSession(): void {
  if (liveMicTracks === 0) setAudioSessionType("playback");
}

/**
 * In the app, switches the audio session to play-and-record while any getUserMedia microphone
 * track is live and back to playback once they all stop, so the tuner, chord detection and pitch
 * practice can listen while backing tracks keep ignoring the silent switch.
 */
export function patchMicAudioSession(): void {
  if (!IS_NATIVE_APP || typeof window === "undefined" || !window.MediaDevices?.prototype.getUserMedia) return;
  // WebKit ignores an own property on navigator.mediaDevices, so wrap the prototype method.
  const proto = window.MediaDevices.prototype;
  const getUserMedia = proto.getUserMedia;
  proto.getUserMedia = async function (this: MediaDevices, constraints?: MediaStreamConstraints) {
    if (constraints?.audio) setAudioSessionType("play-and-record");
    let stream: MediaStream;
    try {
      stream = await getUserMedia.call(this, constraints);
    } catch (e) {
      preferPlaybackAudioSession();
      throw e;
    }
    stream.getAudioTracks().forEach((track) => {
      liveMicTracks++;
      let ended = false;
      const release = () => {
        if (ended) return;
        ended = true;
        liveMicTracks--;
        preferPlaybackAudioSession();
      };
      const stop = track.stop.bind(track);
      track.stop = () => {
        stop();
        release();
      };
      track.addEventListener("ended", release);
    });
    return stream;
  };
}

/** Absolute link to a page on the website, for sharing. */
export function publicUrl(path: string): string {
  if (IS_NATIVE_APP || typeof window === "undefined") return `${SITE_URL}${path}`;
  return `${window.location.origin}${path}`;
}

interface NativeShellPlugin {
  startWebAuth(opts: { url: string; callbackScheme: string; ephemeral?: boolean }): Promise<{ url: string | null; canceled: boolean }>;
  setKeepAwake(opts: { enabled: boolean }): Promise<void>;
  /** iCloud key-value storage (NSUbiquitousKeyValueStore). */
  cloudGet(opts: { key: string }): Promise<{ value: string | null }>;
  cloudSet(opts: { key: string; value: string | null }): Promise<void>;
  addListener(event: "cloudChanged", fn: (data: { keys: string[] }) => void): Promise<PluginListenerHandle>;
  /** Apple Intelligence (on-device Foundation Models), iOS 26+. */
  aiStatus(): Promise<AppleIntelligenceStatus>;
  generateJamIdea(opts: JamIdeaRequest): Promise<JamIdeaResult>;
  analyzeChannelStyle(opts: {
    channel: string;
    titles: string[];
    focus?: string;
    styles: { id: string; description: string }[];
  }): Promise<{
    styles: string[];
    mode: "major" | "minor" | "both";
    tempoMin: number;
    tempoMax: number;
    mood: string;
    harmony: string;
    summary: string;
  }>;
}

export interface AppleIntelligenceStatus {
  available: boolean;
  reason?: "osTooOld" | "deviceNotEligible" | "appleIntelligenceNotEnabled" | "modelNotReady" | "unknown";
}

export interface JamIdeaRequest {
  style: string;
  styleDescription: string;
  key: string;
  mode: string;
  meter: string;
  tonic: string;
  bpmMin: number;
  bpmMax: number;
  palette: string[];
  avoid: string[];
  inspiration?: string;
}

export interface JamIdeaResult {
  title: string;
  chords: string[];
  bpm: number;
  soloTip: string;
}

export async function getAppleIntelligenceStatus(): Promise<AppleIntelligenceStatus> {
  if (!IS_NATIVE_APP) return { available: false };
  try {
    return await NativeShell.aiStatus();
  } catch {
    return { available: false, reason: "unknown" };
  }
}

export const NativeShell = registerPlugin<NativeShellPlugin>("NativeShell");

export async function setKeepAwake(enabled: boolean): Promise<void> {
  if (!IS_NATIVE_APP) return;
  try {
    await NativeShell.setKeepAwake({ enabled });
  } catch {
    /* older builds without the plugin */
  }
}

export async function hapticTap(): Promise<void> {
  if (!IS_NATIVE_APP) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics unavailable */
  }
}

/**
 * Shares a link with the system share sheet in the app (and on phones that support it),
 * otherwise copies it. Resolves "shared", "copied" or "failed".
 */
export async function shareLink(url: string, title: string): Promise<"shared" | "copied" | "failed"> {
  if (IS_NATIVE_APP) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, url, dialogTitle: title });
      return "shared";
    } catch {
      return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    window.prompt("Copy this link:", url);
    return "copied";
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves a generated file. Browsers download it; the app writes it to the cache and opens the
 * share sheet so the user can save it to Files, AirDrop it or open it in another app.
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (!IS_NATIVE_APP) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const written = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });
  try {
    await Share.share({ title: filename, files: [written.uri] });
  } catch {
    /* user closed the share sheet */
  }
}

/** Opens a URL outside the app (Safari / Mail). */
export function openExternal(url: string): void {
  if (IS_NATIVE_APP) {
    import("@capacitor/browser").then(({ Browser }) => Browser.open({ url })).catch(() => window.open(url, "_blank"));
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
