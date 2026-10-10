import data from "@/chrods.json";

// Search index over chrods.json: understands how guitarists actually type chords
// (Am, Amin, A-, CM7, CΔ7, C+, Db ↔ C#, Bbm7, C/E …).

export interface ChordSearchItem {
  key: string; // as in data, e.g. "C#"
  suffix: string; // as in data, e.g. "m7"
  display: string; // e.g. "C#m7"
  fullName: string; // e.g. "C# minor 7"
  href: string;
  category: ChordCategory;
  order: number; // position in the data's suffix list (common chords first)
  positions: ChordPosition[];
}

export interface ChordPosition {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  midi?: number[];
}

export type ChordCategory = "Basic" | "Sus & add" | "Extended" | "Dim, aug & altered" | "Slash";
export const CATEGORY_ORDER: ChordCategory[] = ["Basic", "Sus & add", "Extended", "Dim, aug & altered", "Slash"];

const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11, "B#": 0,
};

const BASIC = ["major", "minor", "5", "6", "7", "maj7", "m7", "m6", "69", "m69"];
const SUS_ADD = ["sus2", "sus4", "sus2sus4", "7sus4", "add9", "madd9"];
const EXTENDED = ["9", "11", "13", "maj9", "maj11", "maj13", "m9", "m11", "mmaj7", "mmaj9", "mmaj11", "9#11"];

function categorize(suffix: string): ChordCategory {
  if (suffix.includes("/")) return "Slash";
  if (BASIC.includes(suffix)) return "Basic";
  if (SUS_ADD.includes(suffix)) return "Sus & add";
  if (EXTENDED.includes(suffix)) return "Extended";
  return "Dim, aug & altered";
}

function displaySuffix(suffix: string): string {
  if (suffix === "major") return "";
  if (suffix === "minor") return "m";
  return suffix;
}

function fullSuffixName(suffix: string): string {
  if (suffix === "major" || suffix === "minor") return suffix;
  if (suffix.startsWith("/")) return `over ${suffix.slice(1)}`;
  if (suffix.startsWith("m/")) return `minor over ${suffix.slice(2)}`;
  return suffix
    .replace(/^mmaj/, "minor-major ")
    .replace(/^maj/, "major ")
    .replace(/^m(?!aj)/, "minor ")
    .trim();
}

// Same id scheme as getChords(): lower-case, first "/" removed, "#" spelled "sharp"
export function chordHref(key: string, suffix: string): string {
  const id = (key + suffix).toLowerCase().replace("/", "").replace(/#/g, "sharp");
  return `/chords/${id}`;
}

const suffixOrder: string[] = (data as any).suffixes;

export const CHORD_INDEX: ChordSearchItem[] = Object.values((data as any).chords as Record<string, any[]>)
  .flat()
  .map((c: any) => ({
    key: c.key,
    suffix: c.suffix,
    display: c.key + displaySuffix(c.suffix),
    fullName: `${c.key} ${fullSuffixName(c.suffix)}`,
    href: chordHref(c.key, c.suffix),
    category: categorize(c.suffix),
    order: suffixOrder.indexOf(c.suffix),
    positions: c.positions,
  }));

// Canonical, lower-case form of a chord quality so aliases compare equal
function normalizeQuality(raw: string): string {
  let q = raw.trim().replace(/\s+/g, "");
  q = q.replace(/♯/g, "#").replace(/♭/g, "b");
  q = q.replace(/^(Δ|M)(?=\d|$)/, "maj"); // CM7, CΔ7, CM → maj
  q = q.toLowerCase();
  q = q.replace(/^major/, "maj").replace(/^minor/, "m").replace(/^min/, "m").replace(/^-/, "m");
  q = q.replace(/^\+/, "aug").replace(/^°/, "dim").replace(/^ø7?/, "m7b5");
  return q;
}

function canonicalSuffix(suffix: string): string {
  if (suffix === "major") return "";
  if (suffix === "minor") return "m";
  return suffix.toLowerCase();
}

export interface ParsedQuery {
  rootPc: number | null;
  rootLabel: string;
  quality: string;
}

export function parseQuery(input: string): ParsedQuery {
  const m = input.trim().match(/^([a-gA-G])(#|♯|b(?!5|9|13)|♭|\s?sharp|\s?flat)?(.*)$/);
  if (!m) return { rootPc: null, rootLabel: "", quality: "" };
  const letter = m[1].toUpperCase();
  const acc = (m[2] || "").trim().toLowerCase();
  const accidental = acc === "#" || acc === "♯" || acc === "sharp" ? "#" : acc === "b" || acc === "♭" || acc === "flat" ? "b" : "";
  const rootLabel = letter + accidental;
  const rootPc = PITCH_CLASS[rootLabel] ?? null;
  return { rootPc, rootLabel, quality: normalizeQuality(m[3] || "") };
}

export interface SearchResult {
  mode: "browse" | "match" | "none";
  rootLabel: string;
  items: ChordSearchItem[];
}

export function searchChords(input: string, limit = 30): SearchResult {
  const { rootPc, rootLabel, quality } = parseQuery(input);
  if (rootPc === null) return { mode: "none", rootLabel: "", items: [] };

  const sameRoot = CHORD_INDEX.filter((c) => PITCH_CLASS[c.key] === rootPc);

  if (!quality) {
    return { mode: "browse", rootLabel, items: [...sameRoot].sort((a, b) => a.order - b.order) };
  }

  const scored = sameRoot
    .map((c) => {
      const s = canonicalSuffix(c.suffix);
      let score = -1;
      if (s === quality || (quality === "maj" && c.suffix === "major")) score = 0;
      // "m" means minor, so "Am" shouldn't drift into Amaj7
      else if (s.startsWith(quality) && !(quality === "m" && s.startsWith("maj"))) score = 1;
      return { c, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.c.order - b.c.order)
    .slice(0, limit)
    .map((x) => x.c);

  return { mode: scored.length ? "match" : "none", rootLabel, items: scored };
}

// Best single chord for a name like "Am", "G7", "Cmaj7"
export function findChord(name: string): ChordSearchItem | undefined {
  return searchChords(name, 1).items[0];
}

// Non-chord pages people look for from the search box ("tuner", "bpm", "backing track"…)
export interface ToolSearchItem {
  href: string;
  display: string;
  description: string;
  keywords: string[];
}

export const TOOL_INDEX: ToolSearchItem[] = [
  { href: "/tuner", display: "Guitar tuner", description: "Tune with your microphone", keywords: ["tuner", "tune", "tuning", "guitar tuner", "pitch", "standard tuning"] },
  { href: "/metronome", display: "Metronome", description: "Subdivisions, tap tempo, speed trainer", keywords: ["metronome", "tempo", "bpm", "tap tempo", "click", "beat", "timing"] },
  { href: "/scales", display: "Scale explorer", description: "Scale patterns on the fretboard", keywords: ["scales", "scale", "modes", "pentatonic", "blues scale", "fretboard"] },
  { href: "/practice", display: "Backing tracks", description: "Jam with drums and bass", keywords: ["backing track", "backing", "jam", "practice", "drums", "bass", "play along"] },
  { href: "/chords", display: "Chord library", description: "Every chord in every key", keywords: ["chords", "chord library", "library", "all chords"] },
];

export function searchTools(input: string): ToolSearchItem[] {
  const q = input.trim().toLowerCase();
  // two letters minimum so single-note chord searches ("a", "b") stay chord-only
  if (q.length < 2) return [];
  return TOOL_INDEX.filter((t) => t.keywords.some((k) => k.startsWith(q) || (q.length >= 4 && k.includes(q))));
}
