export const JAM_KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const CHROMATIC = JAM_KEYS;

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const PENTATONIC_INTERVALS = [0, 2, 4, 7, 9];

export function scaleNotesForKey(key: string, intervals: number[]): string[] {
  const root = CHROMATIC.indexOf(key);
  if (root === -1) return [];
  return intervals.map(i => CHROMATIC[(root + i) % 12]);
}

export function majorScaleNotes(key: string): string[] {
  return scaleNotesForKey(key, MAJOR_INTERVALS);
}

export function pentatonicScaleNotes(key: string): string[] {
  return scaleNotesForKey(key, PENTATONIC_INTERVALS);
}

export interface JamSessionSnapshot {
  key: string;
  genre: string;
  bpm: number;
  preset: number;
  playbackSpeed: number;
  loopLimit: number;
  countIn: boolean;
  customChords?: string;
  /** Scale id from @/data/scales — shared with Scale Explorer tab */
  scale?: string;
  lastTab?: "jam" | "scales";
}

export const JAM_SESSION_STORAGE_KEY = "diachords-jam-session-v1";

export function saveJamSession(snapshot: JamSessionSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(JAM_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
}

export function loadJamSession(): JamSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(JAM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JamSessionSnapshot;
  } catch {
    return null;
  }
}

export function buildJamShareUrl(basePath: string, snapshot: Partial<JamSessionSnapshot>): string {
  if (typeof window === "undefined") return basePath;
  const params = new URLSearchParams();
  if (snapshot.key) params.set("key", snapshot.key);
  if (snapshot.genre) params.set("genre", snapshot.genre);
  if (snapshot.bpm) params.set("bpm", String(snapshot.bpm));
  if (snapshot.preset !== undefined) params.set("preset", String(snapshot.preset));
  if (snapshot.playbackSpeed && snapshot.playbackSpeed !== 1) {
    params.set("speed", String(snapshot.playbackSpeed));
  }
  if (snapshot.loopLimit) params.set("loops", String(snapshot.loopLimit));
  if (snapshot.countIn !== undefined) params.set("countin", snapshot.countIn ? "1" : "0");
  if (snapshot.customChords) params.set("chords", snapshot.customChords);
  if (snapshot.scale) params.set("scale", snapshot.scale);
  if (snapshot.lastTab === "scales") params.set("tab", "scales");
  const q = params.toString();
  return q ? `${window.location.origin}${basePath}?${q}` : `${window.location.origin}${basePath}`;
}

/** Four quarter-note clicks before the band enters (Jamzone / Moises-style count-in). */
export async function playCountIn(bpm: number): Promise<void> {
  const Tone = await import("tone");
  await Tone.start();
  const click = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();
  const beatSec = 60 / bpm;
  const start = Tone.now() + 0.05;
  for (let i = 0; i < 4; i++) {
    const freq = i === 0 ? "G4" : "C4";
    click.triggerAttackRelease(freq, "32n", start + i * beatSec);
  }
  await new Promise(r => setTimeout(r, beatSec * 4 * 1000 + 120));
  click.dispose();
}
