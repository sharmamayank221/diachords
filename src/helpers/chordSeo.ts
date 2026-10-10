import { CHORD_INDEX, chordHref, type ChordSearchItem } from "@/helpers/chordSearch";
import { getChordStringNotes, getChordShapeInfo } from "@/helpers/chordNotes";
import type { A } from "@/types/chord.types";

// Human names for chord suffixes, as people search for them ("A minor 7th", "C suspended 4th")
const SUFFIX_NAMES: Record<string, string> = {
  major: "major",
  minor: "minor",
  dim: "diminished",
  dim7: "diminished 7th",
  sus2: "suspended 2nd",
  sus4: "suspended 4th",
  sus2sus4: "sus2 sus4",
  "7sus4": "7th suspended 4th",
  alt: "altered",
  aug: "augmented",
  "5": "power chord",
  "6": "6th",
  "69": "6/9",
  "7": "7th",
  "7b5": "7th flat 5",
  aug7: "augmented 7th",
  "9": "9th",
  "9b5": "9th flat 5",
  aug9: "augmented 9th",
  "7b9": "7th flat 9",
  "7#9": "7th sharp 9",
  "11": "11th",
  "9#11": "9th sharp 11",
  "13": "13th",
  maj7: "major 7th",
  maj7b5: "major 7th flat 5",
  "maj7#5": "major 7th sharp 5",
  maj9: "major 9th",
  maj11: "major 11th",
  maj13: "major 13th",
  m6: "minor 6th",
  m69: "minor 6/9",
  m7: "minor 7th",
  m7b5: "minor 7th flat 5 (half-diminished)",
  m9: "minor 9th",
  m11: "minor 11th",
  mmaj7: "minor major 7th",
  mmaj7b5: "minor major 7th flat 5",
  mmaj9: "minor major 9th",
  mmaj11: "minor major 11th",
  add9: "add 9",
  madd9: "minor add 9",
};

export interface ChordSeo {
  display: string; // "Am"
  fullName: string; // "A minor"
  notes: string[]; // ["A", "C", "E"]
  title: string;
  description: string;
  shapes: { label: string; frets: string; position: A["positions"][number] }[];
  sameRoot: ChordSearchItem[];
  sameTypeOtherKeys: ChordSearchItem[];
}

// Same pitch, other spelling — people search "Db guitar chord" as often as "C#"
const ENHARMONIC: Record<string, string> = { "C#": "Db", Eb: "D#", "F#": "Gb", Ab: "G#", Bb: "A#" };

function readableName(key: string, suffix: string): string {
  if (suffix.startsWith("/")) return `${key} over ${suffix.slice(1)}`;
  if (suffix.startsWith("m/")) return `${key} minor over ${suffix.slice(2)}`;
  if (suffix === "7/G") return `${key}7 over G`;
  return `${key} ${SUFFIX_NAMES[suffix] ?? suffix}`;
}

export function getChordSeo(chord: A): ChordSeo {
  const key: string = chord.key;
  const suffix: string = chord.suffix;
  const self = CHORD_INDEX.find((c) => c.key === key && c.suffix === suffix);
  const display = self?.display ?? `${key}${suffix}`;
  const fullName = readableName(key, suffix);

  // distinct notes across all shapes, in chord order: root, then by distance above it (A, C, E)
  const byName = new Map<string, number>();
  let rootPc: number | null = null;
  chord.positions.forEach((p: any) =>
    getChordStringNotes(p.frets, p.baseFret, key).forEach((n) => {
      if (n.name && n.midi !== null) {
        byName.set(n.name, n.midi % 12);
        if (n.isRoot) rootPc = n.midi % 12;
      }
    })
  );
  const root = rootPc ?? 0;
  const notes = Array.from(byName.entries())
    .sort(([, a], [, b]) => ((a - root + 12) % 12) - ((b - root + 12) % 12))
    .map(([name]) => name);

  const shapes = chord.positions.map((p: any) => ({
    label: getChordShapeInfo(p).label,
    frets: p.frets.map((f: number) => (f < 0 ? "x" : f === 0 ? "0" : String(f + (p.baseFret ?? 1) - 1))).join(" "),
    position: p,
  }));

  const n = shapes.length;
  const alt = ENHARMONIC[key];
  const altDisplay = alt ? alt + display.slice(key.length) : null;
  const nameInTitle = `${display}${altDisplay ? ` / ${altDisplay}` : ""}${display === fullName ? "" : ` (${fullName})`}`;
  const title = `${nameInTitle} Guitar Chord – ${n} Shape${n === 1 ? "" : "s"}, Diagrams & Sound | ChordsofGuitar`;
  const description =
    `How to play ${fullName} (${display}) on guitar` +
    (notes.length ? `: notes ${notes.join(", ")}.` : ".") +
    (altDisplay ? ` Also written ${altDisplay}.` : "") +
    ` See ${n} chord shape${n === 1 ? "" : "s"} with finger positions, hear each one, and jam along with a backing track.`;

  const others = CHORD_INDEX.filter((c) => !(c.key === key && c.suffix === suffix));
  const sameRoot = others
    .filter((c) => c.key === key && c.category === "Basic")
    .sort((a, b) => a.order - b.order)
    .slice(0, 10);
  const sameTypeOtherKeys = others.filter((c) => c.suffix === suffix && c.key !== key);

  return { display, fullName, notes, title, description, shapes, sameRoot, sameTypeOtherKeys };
}

export { chordHref };
