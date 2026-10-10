import { playNote } from "./audioUtils";

// Plays notes low → high with a small gap so a chord sounds strummed, not struck.
// Returns a cancel function.
export function strum(midiNotes: number[], gapMs = 35, onNote?: (index: number) => void): () => void {
  const timers = midiNotes.map((midi, i) =>
    setTimeout(() => {
      playNote(midi);
      onNote?.(i);
    }, i * gapMs)
  );
  return () => timers.forEach(clearTimeout);
}

// Strums a list of chords one after another.
export function playProgression(chords: number[][], chordMs = 700, onChord?: (index: number) => void): () => void {
  const cancels: (() => void)[] = [];
  const timers = chords.map((notes, i) =>
    setTimeout(() => {
      onChord?.(i);
      cancels.push(strum(notes));
    }, i * chordMs)
  );
  const end = setTimeout(() => onChord?.(-1), chords.length * chordMs);
  return () => {
    timers.forEach(clearTimeout);
    clearTimeout(end);
    cancels.forEach((c) => c());
  };
}
