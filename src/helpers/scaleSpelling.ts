// Correct note spelling for scales: F major has Bb (not A#), Lydian has ♯4 (not ♭5).
// Seven-note scales use one of each letter; the root spelling (C# vs Db) is whichever needs
// fewer accidentals. Pentatonic/blues borrow the spelling of their parent scale.

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];

const ROOT_SPELLINGS: Record<number, string[]> = {
  0: ["C"], 1: ["C#", "Db"], 2: ["D"], 3: ["Eb", "D#"], 4: ["E"], 5: ["F"],
  6: ["F#", "Gb"], 7: ["G"], 8: ["Ab", "G#"], 9: ["A"], 10: ["Bb", "A#"], 11: ["B"],
};

const accidental = (n: number) => (n > 0 ? "#".repeat(n) : "b".repeat(-n));
const degreeAccidental = (n: number) => (n > 0 ? "♯".repeat(n) : "♭".repeat(-n));

function spellSeven(rootName: string, intervals: number[]): string[] {
  const rootLetter = LETTERS.indexOf(rootName[0]);
  const rootPc = (LETTER_PC[rootLetter] + (rootName.includes("#") ? 1 : rootName.includes("b") ? -1 : 0) + 12) % 12;
  return intervals.map((iv, i) => {
    const li = (rootLetter + i) % 7;
    const target = (rootPc + iv) % 12;
    const diff = ((target - LETTER_PC[li] + 18) % 12) - 6;
    return LETTERS[li] + accidental(diff);
  });
}

// double accidentals are a last resort
const spellingCost = (names: string[]) =>
  names.reduce((sum, n) => sum + (n.length - 1) + (n.length > 2 ? 10 : 0), 0);

function bestSeven(rootPc: number, intervals: number[]): string[] {
  return ROOT_SPELLINGS[rootPc]
    .map((r) => spellSeven(r, intervals))
    .sort((a, b) => spellingCost(a) - spellingCost(b))[0];
}

const flatten = (name: string) => (name.endsWith("#") ? name.slice(0, -1) : `${name}b`);

const PENTATONIC_DEGREES: Record<number, string> = {
  0: "1", 1: "♭2", 2: "2", 3: "♭3", 4: "3", 5: "4", 6: "♭5", 7: "5", 8: "♭6", 9: "6", 10: "♭7", 11: "7",
};

export interface SpelledScale {
  rootName: string;
  names: string[]; // one per interval, e.g. ["F","G","A","Bb","C","D","E"]
  degrees: string[]; // ["1","2","3","4","5","6","7"] / ["1","2","♭3",…] / ["1","2","3","♯4",…]
  nameForPc: (pc: number) => string | undefined;
}

export function spellScale(rootPc: number, intervals: number[], scaleId?: string): SpelledScale {
  let names: string[];
  let degrees: string[];

  if (intervals.length === 7) {
    names = bestSeven(rootPc, intervals);
    degrees = intervals.map((iv, i) => degreeAccidental(iv - MAJOR[i]) + String(i + 1));
  } else {
    const parentIntervals = scaleId === "pentatonic_major" ? MAJOR : NATURAL_MINOR;
    const parent = bestSeven(rootPc, parentIntervals);
    names = intervals.map((iv) => {
      const idx = parentIntervals.indexOf(iv);
      if (idx !== -1) return parent[idx];
      // the blues ♭5: flatten the parent's 5th (A blues → Eb, not D#)
      if (iv === 6) return flatten(parent[parentIntervals.indexOf(7)]);
      return parent[0];
    });
    degrees = intervals.map((iv) => PENTATONIC_DEGREES[iv]);
  }

  const byPc = new Map<number, string>();
  intervals.forEach((iv, i) => byPc.set((rootPc + iv) % 12, names[i]));
  return { rootName: names[0], names, degrees, nameForPc: (pc) => byPc.get(((pc % 12) + 12) % 12) };
}
