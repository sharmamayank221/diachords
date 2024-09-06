import * as Tone from "tone";

let sampler: Tone.Sampler | null = null;

export const initAudio = async () => {
  if (!sampler) {
    console.log("Initializing sampler...");
    sampler = new Tone.Sampler({
      urls: {
        A2: "A2.mp3",
        A3: "A3.mp3",
        A4: "A4.mp3",
       
        C3: "C3.mp3",
        C4: "C4.mp3",
        C5: "C5.mp3",
        D3: "D3.mp3",
        D4: "D4.mp3",
        D5: "D5.mp3",
        E2: "E2.mp3",
        E3: "E3.mp3",
        E4: "E4.mp3",
        G2: "G2.mp3",
        G3: "G3.mp3",
        G4: "G4.mp3",
      },
      baseUrl: "/guitar-acoustic/",
      onload: () => {
        console.log("Sampler loaded successfully");
      },
    }).toDestination();
    
    await Tone.loaded();
  }
};

export const playChord = async (midiNotes: number[]) => {
  if (!sampler) {
    await initAudio();
  }

  if (!sampler) return;

  console.log(`Playing chord: ${midiNotes}`);
  midiNotes.forEach(playNoteSingle);
};

function playNoteSingle(midiNote: number): void {
  const now = Tone.now();
  const duration = 2; // Play for 2 seconds
  const freq = Tone.Frequency(midiNote, "midi").toFrequency();
  console.log(`Playing note: ${midiNote} (${freq} Hz)`);
  sampler!.triggerAttackRelease(freq, duration, now);
};

export function playNote(midiNote: number): void {
  if (!sampler) {
    initAudio().then(() => {
      playNoteSingle(midiNote);
    });
  } else {
    playNoteSingle(midiNote);
  }
}
