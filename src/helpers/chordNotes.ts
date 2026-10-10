// Turns a chord position (relative frets + baseFret) into real notes per string.

const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4 (string 6 → 1)
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const KEY_PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, Csharp: 1, "F#": 6, D: 2, Eb: 3, E: 4, F: 5, Fsharp: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11,
};

export interface ChordStringNote {
  stringNumber: number; // 6 = low E … 1 = high E
  fret: number; // absolute fret on the neck, -1 = muted
  midi: number | null;
  name: string | null; // e.g. "A"
  octave: number | null;
  isRoot: boolean;
}

export function toAbsoluteFret(relativeFret: number, baseFret = 1): number {
  return relativeFret <= 0 ? relativeFret : relativeFret + baseFret - 1;
}

export function getChordStringNotes(
  frets: number[] | undefined,
  baseFret = 1,
  chordKey?: string
): ChordStringNote[] {
  if (!frets || frets.length !== 6) return [];
  const rootPc = chordKey ? KEY_PITCH_CLASS[chordKey] : undefined;
  const names = chordKey && /b$/.test(chordKey) ? FLAT_NAMES : SHARP_NAMES;

  return frets.map((rel, idx) => {
    const stringNumber = 6 - idx;
    if (rel < 0) {
      return { stringNumber, fret: -1, midi: null, name: null, octave: null, isRoot: false };
    }
    const fret = toAbsoluteFret(rel, baseFret);
    const midi = OPEN_STRING_MIDI[idx] + fret;
    return {
      stringNumber,
      fret,
      midi,
      name: names[midi % 12],
      octave: Math.floor(midi / 12) - 1,
      isRoot: rootPc !== undefined && midi % 12 === rootPc,
    };
  });
}

export function formatChordName(chordKey?: string, suffix?: string): string {
  if (!chordKey) return "";
  const key = chordKey.replace("sharp", "#");
  if (!suffix || suffix === "major") return `${key} major`;
  if (suffix === "minor") return `${key} minor`;
  return `${key}${suffix}`;
}

export interface ChordShapeInfo {
  label: string; // "Open", "Fret 5"
  barres: BarreInfo[];
}

export interface BarreInfo {
  relativeFret: number; // column index on the fretboard
  fret: number; // absolute fret on the neck
  fromString: number; // highest-pitched string covered (smaller number)
  toString: number; // lowest-pitched string covered
  finger: number | undefined;
}

export function getChordShapeInfo(position?: {
  frets: number[];
  fingers?: number[];
  baseFret?: number;
  barres?: number[];
}): ChordShapeInfo {
  if (!position?.frets) return { label: "", barres: [] };
  const baseFret = position.baseFret ?? 1;
  const fretted = position.frets.filter((f) => f > 0).map((f) => toAbsoluteFret(f, baseFret));
  const lowest = fretted.length ? Math.min(...fretted) : 0;
  const label = baseFret === 1 && position.frets.includes(0) ? "Open" : `Fret ${lowest}`;

  const barres = (position.barres ?? [])
    .map((rel): BarreInfo | null => {
      const idxs = position.frets.map((f, i) => (f === rel ? i : -1)).filter((i) => i >= 0);
      if (idxs.length < 2) return null;
      const lowIdx = Math.min(...idxs);
      const highIdx = Math.max(...idxs);
      return {
        relativeFret: rel,
        fret: toAbsoluteFret(rel, baseFret),
        fromString: 6 - highIdx,
        toString: 6 - lowIdx,
        finger: position.fingers?.[lowIdx],
      };
    })
    .filter((b): b is BarreInfo => b !== null);

  return { label, barres };
}
