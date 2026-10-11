// Sample loading and playback. Decoded AudioBuffers are cached per URL at module level so the
// live AudioContext and an export OfflineAudioContext share them (AudioBuffers aren't tied to
// one context).

import type { DrumPiece } from "./styles";

export type Instrument = "bass" | "guitar" | "guitarElectric" | "keys";

interface DrumManifest {
  pieces: Record<string, { url: string; loVel: number; hiVel: number }[]>;
}
interface PitchedManifest {
  regions: { url: string; root: number }[];
}

const ROOTS: Record<Instrument | "drums", string> = {
  drums: "/samples/drums-avl-pearl/",
  bass: "/samples/bass-electric/",
  guitar: "/samples/guitar-acoustic/",
  guitarElectric: "/samples/guitar-electric/",
  keys: "/samples/piano-salamander/",
};

const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();
const manifests = new Map<string, Promise<any>>();

function manifest<T>(folder: string): Promise<T> {
  if (!manifests.has(folder)) {
    manifests.set(
      folder,
      fetch(`${folder}manifest.json`).then((r) => {
        if (!r.ok) throw new Error(`manifest ${folder}: ${r.status}`);
        return r.json();
      })
    );
  }
  return manifests.get(folder)!;
}

async function fetchWithRetry(url: string, tries = 3): Promise<ArrayBuffer> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.arrayBuffer();
      lastErr = new Error(`${url}: ${r.status}`);
      if (r.status < 500) break;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((res) => setTimeout(res, 300 * (i + 1)));
  }
  throw lastErr;
}

function load(ctx: BaseAudioContext, url: string): Promise<AudioBuffer | null> {
  if (buffers.has(url)) return Promise.resolve(buffers.get(url)!);
  if (!pending.has(url)) {
    pending.set(
      url,
      fetchWithRetry(url)
        .then((data) => ctx.decodeAudioData(data))
        .then((buf) => {
          buffers.set(url, buf);
          return buf;
        })
        .catch(() => null) // a missing sample just plays nothing; never break the band
    );
  }
  return pending.get(url)!;
}

// ── preload exactly what an arrangement will use ─────────────────────────────

export async function preloadDrums(ctx: BaseAudioContext, pieces: Set<DrumPiece>): Promise<void> {
  const m = await manifest<DrumManifest>(ROOTS.drums);
  const urls = Array.from(pieces).flatMap((p) => (m.pieces[p] ?? []).map((l) => ROOTS.drums + l.url));
  await Promise.all(urls.map((u) => load(ctx, u)));
}

export async function preloadPitched(ctx: BaseAudioContext, inst: Instrument, notes: Set<number>): Promise<void> {
  const m = await manifest<PitchedManifest>(ROOTS[inst]);
  const urls = new Set<string>();
  Array.from(notes).forEach((n) => urls.add(ROOTS[inst] + nearestRegion(m, n).url));
  await Promise.all(Array.from(urls).map((u) => load(ctx, u)));
}

function nearestRegion(m: PitchedManifest, midi: number) {
  let best = m.regions[0];
  for (const r of m.regions) {
    // prefer sampling from below (pitching up sounds more natural than down) on ties
    const d = Math.abs(r.root - midi) - (r.root <= midi ? 0.1 : 0);
    const bd = Math.abs(best.root - midi) - (best.root <= midi ? 0.1 : 0);
    if (d < bd) best = r;
  }
  return best;
}

// synchronous lookups for the scheduler (manifests are resolved by the time we play)
const resolved: Partial<Record<Instrument | "drums", any>> = {};
export async function resolveManifests(): Promise<void> {
  for (const k of Object.keys(ROOTS) as (Instrument | "drums")[]) {
    try {
      resolved[k] = await manifest(ROOTS[k]);
    } catch {
      /* instrument unavailable */
    }
  }
}

export function drumBuffer(piece: DrumPiece, vel: number): AudioBuffer | null {
  const m: DrumManifest | undefined = resolved.drums;
  const layers = m?.pieces[piece];
  if (!layers) return null;
  const v = Math.max(1, Math.min(127, Math.round(vel * 127)));
  const layer = layers.find((l) => v >= l.loVel && v <= l.hiVel) ?? layers[layers.length - 1];
  return buffers.get(ROOTS.drums + layer.url) ?? null;
}

export function pitchedBuffer(inst: Instrument, midi: number): { buffer: AudioBuffer; rate: number } | null {
  const m: PitchedManifest | undefined = resolved[inst];
  if (!m) return null;
  const r = nearestRegion(m, midi);
  const buffer = buffers.get(ROOTS[inst] + r.url);
  return buffer ? { buffer, rate: Math.pow(2, (midi - r.root) / 12) } : null;
}
