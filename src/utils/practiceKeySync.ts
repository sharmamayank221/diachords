import { SCALES } from "@/data/scales";

/** Keys used in jam UI (enharmonic spellings). */
export const PRACTICE_KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;
export type PracticeKey = (typeof PRACTICE_KEYS)[number];

const SEMITONE_TO_JAM_KEY: PracticeKey[] = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
];

const KEY_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

export type PracticeTab = "jam" | "scales";

export function normalizePracticeKey(key: string): PracticeKey {
  const semi = KEY_TO_SEMITONE[key];
  if (semi === undefined) return "C";
  return SEMITONE_TO_JAM_KEY[semi];
}

export function jamKeyToRootIndex(key: string): number {
  const semi = KEY_TO_SEMITONE[key];
  return semi ?? 0;
}

export function rootIndexToJamKey(index: number): PracticeKey {
  const i = ((index % 12) + 12) % 12;
  return SEMITONE_TO_JAM_KEY[i];
}

/** Pick a scale that suits a jam style and mode for soloing over it. */
export function suggestedScaleForJam(style: string, key: string, mode: "major" | "minor" = "major"): string {
  void key;
  if (style === "blues" || style === "slowblues") return "blues";
  if (style === "jazz" || style === "bossa" || style === "lofi") return mode === "minor" ? "dorian" : "major";
  if (style === "funk" || style === "disco" || style === "soul") return mode === "minor" ? "dorian" : "mixolydian";
  if (style === "metal") return mode === "minor" ? "phrygian" : "pentatonic_major";
  return mode === "minor" ? "pentatonic_minor" : "pentatonic_major";
}

export function isValidScaleId(id: string): boolean {
  return id in SCALES;
}
