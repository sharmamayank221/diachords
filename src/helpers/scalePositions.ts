// Fretboard position systems for a scale.
//
// "positions": one window per scale note on the low E string, starting at the root. Each window runs
//   from one fret below that note to three above (frets f-1 … f+3), clamped at the nut. For pentatonic
//   scales these are exactly the five standard boxes.
// "caged": the five CAGED shapes, E-D-C-A-G up the neck from the root. Each shape spans the fret
//   range of the matching pentatonic box (major pentatonic for major-3rd scales, minor otherwise)
//   and shows every note of the scale inside it — the usual "pentatonic + the other notes" approach.

export type PositionSystem = "positions" | "caged";

export interface ScalePosition {
  label: string; // "1".."7" or "E","D","C","A","G"
  from: number; // first fret (inclusive)
  to: number; // last fret (inclusive)
}

const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // strings 1 (high e) → 6 (low E)
const LOW_E = 40;
const MAX_FRET = 24;
const CAGED_ORDER = ["E", "D", "C", "A", "G"];
const MAJOR_PENT = [0, 2, 4, 7, 9];
const MINOR_PENT = [0, 3, 5, 7, 10];

function lowEStarts(rootPc: number, intervals: number[]): number[] {
  const rootFret = (rootPc - (LOW_E % 12) + 12) % 12;
  const starts: number[] = [];
  for (let f = rootFret; f < rootFret + 12; f++) {
    if (intervals.includes((LOW_E + f - rootPc + 120) % 12)) starts.push(f);
  }
  return starts;
}

// A window starting at the open strings would need notes at "fret −1" when the scale has a note one
// semitone below an open string; that box can't be played at the nut, so use it an octave up.
// (E minor pentatonic's open box needs nothing below the nut and stays there.)
function windowFor(f: number, rootPc: number, intervals: number[]) {
  const needsBelowNut = f === 0 && OPEN_MIDI.some((open) => intervals.includes((open - 1 - rootPc + 120) % 12));
  const start = needsBelowNut ? 12 : f;
  return { from: Math.max(0, start - 1), to: start + 3 };
}

export function getScalePositions(rootPc: number, intervals: number[], system: PositionSystem): ScalePosition[] {
  if (system === "positions") {
    return lowEStarts(rootPc, intervals).map((f, i) => ({ label: String(i + 1), ...windowFor(f, rootPc, intervals) }))
    .sort((a, b) => a.from - b.from)
    .map((p, i) => ({ ...p, label: String(i + 1) }));
  }

  const pent = intervals.includes(4) ? MAJOR_PENT : MINOR_PENT;
  return lowEStarts(rootPc, pent).map((f, i) => {
    const { from, to } = windowFor(f, rootPc, pent);
    // tighten to the frets the pentatonic box actually uses on any string
    let lo = Infinity;
    let hi = -Infinity;
    OPEN_MIDI.forEach((open) => {
      for (let fret = from; fret <= Math.min(to, MAX_FRET); fret++) {
        if (pent.includes((open + fret - rootPc + 120) % 12)) {
          lo = Math.min(lo, fret);
          hi = Math.max(hi, fret);
        }
      }
    });
    return { label: CAGED_ORDER[i], from: lo, to: hi };
  }).sort((a, b) => a.from - b.from);
}

// Frets on one string that fall inside a position (used by tests and the fretboard)
export function notesInPosition(rootPc: number, intervals: number[], pos: ScalePosition, stringIdx: number): number[] {
  const out: number[] = [];
  for (let f = pos.from; f <= Math.min(pos.to, MAX_FRET); f++) {
    if (intervals.includes((OPEN_MIDI[stringIdx] + f - rootPc + 120) % 12)) out.push(f);
  }
  return out;
}
