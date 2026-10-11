// Music theory for the jam engine: parse chord symbols, spell chords in a key, turn
// Roman numerals into chords. Pure functions, no audio.

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
const FLAT_MAJOR_KEYS = new Set([5, 10, 3, 8, 1, 6]); // F Bb Eb Ab Db Gb

export type Mode = "major" | "minor";

export function noteToPc(name: string): number | null {
  const m = name.match(/^([A-G])(#|b)?/);
  if (!m) return null;
  return (LETTER_PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
}

export interface ParsedChord {
  symbol: string;
  rootPc: number;
  bassPc: number; // = rootPc unless a slash chord
  quality: "maj" | "min" | "dim" | "aug" | "sus" | "power";
  intervals: number[]; // semitones above the root, sorted, includes 0
  third: number | null;
  fifth: number;
  seventh: number | null;
}

// Interval sets for chord suffixes. Order matters: longer/more specific first.
const SUFFIXES: [RegExp, number[], ParsedChord["quality"]][] = [
  [/^(m7b5|ø7?|min7b5)$/, [0, 3, 6, 10], "dim"],
  [/^(dim7|°7|o7)$/, [0, 3, 6, 9], "dim"],
  [/^(dim|°|o)$/, [0, 3, 6], "dim"],
  [/^(mmaj7|mMaj7|minmaj7|m\(maj7\))$/, [0, 3, 7, 11], "min"],
  [/^(m13|min13)$/, [0, 3, 7, 10, 14, 21], "min"],
  [/^(m11|min11)$/, [0, 3, 7, 10, 14, 17], "min"],
  [/^(m9|min9)$/, [0, 3, 7, 10, 14], "min"],
  [/^(m7|min7|-7)$/, [0, 3, 7, 10], "min"],
  [/^(m6|min6)$/, [0, 3, 7, 9], "min"],
  [/^(madd9)$/, [0, 3, 7, 14], "min"],
  [/^(m|min|-)$/, [0, 3, 7], "min"],
  [/^(maj13|M13)$/, [0, 4, 7, 11, 14, 21], "maj"],
  [/^(maj9|M9|Δ9)$/, [0, 4, 7, 11, 14], "maj"],
  [/^(maj7|M7|Δ7?|ma7)$/, [0, 4, 7, 11], "maj"],
  [/^(69|6\/9)$/, [0, 4, 7, 9, 14], "maj"],
  [/^6$/, [0, 4, 7, 9], "maj"],
  [/^(add9|add2)$/, [0, 4, 7, 14], "maj"],
  [/^13$/, [0, 4, 7, 10, 14, 21], "maj"],
  [/^11$/, [0, 7, 10, 14, 17], "sus"],
  [/^9$/, [0, 4, 7, 10, 14], "maj"],
  [/^7b9$/, [0, 4, 7, 10, 13], "maj"],
  [/^7#9$/, [0, 4, 7, 10, 15], "maj"],
  [/^7(#5|\+5|aug)$/, [0, 4, 8, 10], "aug"],
  [/^7b5$/, [0, 4, 6, 10], "maj"],
  [/^7sus4?$/, [0, 5, 7, 10], "sus"],
  [/^7$/, [0, 4, 7, 10], "maj"],
  [/^(aug|\+)$/, [0, 4, 8], "aug"],
  [/^sus2$/, [0, 2, 7], "sus"],
  [/^sus4?$/, [0, 5, 7], "sus"],
  [/^5$/, [0, 7], "power"],
  [/^(maj|M)?$/, [0, 4, 7], "maj"],
];

export function parseChord(symbol: string): ParsedChord | null {
  const s = symbol.trim();
  const m = s.match(/^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/);
  if (!m) return null;
  const rootPc = noteToPc(m[1])!;
  const suffix = m[2];
  const bassPc = m[3] ? noteToPc(m[3])! : rootPc;
  const entry = SUFFIXES.find(([re]) => re.test(suffix));
  // unknown extensions keep the family (an unknown "m…" stays minor) rather than becoming major
  const [, intervals, quality] = entry ?? (/^m(?!aj)/.test(suffix) ? [null, [0, 3, 7, 10], "min" as const] : [null, [0, 4, 7], "maj" as const]);
  const pcs = intervals.map((i) => i % 12);
  const third = pcs.includes(3) ? 3 : pcs.includes(4) ? 4 : null;
  const fifth = pcs.includes(6) && !pcs.includes(7) ? 6 : pcs.includes(8) && !pcs.includes(7) ? 8 : 7;
  const seventh = pcs.includes(10) ? 10 : pcs.includes(11) ? 11 : pcs.includes(9) && quality === "dim" && intervals.length === 4 ? 9 : null;
  return { symbol: s, rootPc, bassPc, quality, intervals: [...intervals].sort((a, b) => a - b), third, fifth, seventh };
}

// Spell a pitch class the way `keyPc` is written; `prefer` breaks ties for notes outside the key
export function spellPc(pc: number, keyPc: number, mode: Mode, prefer?: "flat" | "sharp"): string {
  const scale = mode === "major" ? MAJOR : NATURAL_MINOR;
  // spell from the relative major so minor keys share its signature
  const majorTonic = mode === "major" ? keyPc : (keyPc + 3) % 12;
  const flatKey = FLAT_MAJOR_KEYS.has(majorTonic);
  const inKey = scale.some((iv) => (keyPc + iv) % 12 === pc);
  if (inKey) return (flatKey ? FLATS : SHARPS)[pc];
  if (prefer === "flat") return FLATS[pc];
  if (prefer === "sharp") return SHARPS[pc];
  return (flatKey ? FLATS : SHARPS)[pc];
}

const ROMAN: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };

// "ii7", "V7", "bVII", "Imaj7", "iv", "#iv°7", "V/V" is not supported (use explicit chords)
export function romanToChord(roman: string, keyPc: number, mode: Mode): string {
  const m = roman.match(/^(b|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/);
  if (!m) return roman; // already a chord symbol
  const acc = m[1];
  const numeral = m[2];
  let suffix = m[3];
  const degree = ROMAN[numeral.toUpperCase()];
  const scale = mode === "major" ? MAJOR : NATURAL_MINOR;
  // accidentals are relative to the major scale so "bVII" means the same thing in any mode
  let semis = acc ? MAJOR[degree] + (acc === "b" ? -1 : 1) : scale[degree];
  semis = (semis + 12) % 12;
  const pc = (keyPc + semis) % 12;
  const lower = numeral === numeral.toLowerCase();
  // power chords ("i5") have no third, so they stay "5" whatever the case
  if (lower && !/^(m|°|o|ø|dim|5)/.test(suffix)) {
    // lowercase numerals are minor: "ii7" → m7, "vi" → m
    suffix = suffix === "" ? "m" : suffix.startsWith("maj") ? `m${suffix}` : `m${suffix}`;
  }
  suffix = suffix.replace(/^m°/, "°").replace(/^mø/, "ø");
  return spellPc(pc, keyPc, mode, acc === "b" ? "flat" : acc === "#" ? "sharp" : undefined) + suffix;
}

export const KEY_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
