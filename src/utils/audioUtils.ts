import * as Tone from "tone";

let synth: Tone.PolySynth | null = null;

export const initAudio = () => {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
  }
};

export const playChord = (midiNotes: number[]) => {
  if (!synth) {
    initAudio();
  }

  const now = Tone.now();
  const duration = 2; // Play for 2 seconds

  midiNotes.forEach((note) => {
    synth?.triggerAttackRelease(Tone.Frequency(note, "midi").toFrequency(), duration, now);
  });
};

export function playNote(midiNote: number): void {
  // Implementation of playNote function
}
