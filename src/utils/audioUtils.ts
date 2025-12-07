import * as Tone from "tone";

let sampler: Tone.Sampler | null = null;
let kickSynth: Tone.MembraneSynth | null = null;
let snareSynth: Tone.NoiseSynth | null = null;
let hihatSynth: Tone.MetalSynth | null = null;

export const initAudio = async () => {
  if (!sampler) {
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
      },
    }).toDestination();
    
    await Tone.loaded();
  }
  
  // Initialize drum synths
  if (!kickSynth) {
    kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
      },
    }).toDestination();
    kickSynth.volume.value = -6;
  }
  
  if (!snareSynth) {
    snareSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.2,
      },
    }).toDestination();
    snareSynth.volume.value = -10;
  }
  
  if (!hihatSynth) {
    hihatSynth = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.1,
        release: 0.01,
      },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    hihatSynth.volume.value = -18;
  }
};

export const playChord = async (midiNotes: number[]) => {
  if (!sampler) {
    await initAudio();
  }

  if (!sampler) return;

  midiNotes.forEach(playNoteSingle);
};

// Play chord with specific duration
export const playChordWithDuration = async (midiNotes: number[], duration: number) => {
  if (!sampler) {
    await initAudio();
  }

  if (!sampler) return;

  const now = Tone.now();
  midiNotes.forEach((midiNote) => {
    const freq = Tone.Frequency(midiNote, "midi").toFrequency();
    sampler!.triggerAttackRelease(freq, duration, now);
  });
};

function playNoteSingle(midiNote: number): void {
  const now = Tone.now();
  const duration = 2; // Play for 2 seconds
  const freq = Tone.Frequency(midiNote, "midi").toFrequency();
  sampler!.triggerAttackRelease(freq, duration, now);
}

export function playNote(midiNote: number): void {
  if (!sampler) {
    initAudio().then(() => {
      playNoteSingle(midiNote);
    });
  } else {
    playNoteSingle(midiNote);
  }
}

// Drum functions
export function playKick(): void {
  if (kickSynth) {
    kickSynth.triggerAttackRelease("C1", "8n");
  }
}

export function playSnare(): void {
  if (snareSynth) {
    snareSynth.triggerAttackRelease("8n");
  }
}

export function playHihat(): void {
  if (hihatSynth) {
    hihatSynth.triggerAttackRelease("C6", "32n");
  }
}

// Chord progression player with drums in 4/4 time
export interface ProgressionChord {
  midiNotes: number[];
  name: string;
}

export async function playProgressionWithDrums(
  chords: ProgressionChord[],
  bpm: number = 90,
  onBeatCallback?: (chordIndex: number, beat: number) => void,
  onComplete?: () => void
): Promise<() => void> {
  await initAudio();
  await Tone.start();
  
  Tone.Transport.bpm.value = bpm;
  
  const beatsPerChord = 4; // 4/4 time - each chord gets 4 beats (1 measure)
  let currentChordIndex = 0;
  let currentBeat = 0;
  let isPlaying = true;
  
  // Schedule the drum pattern and chords
  const loopId = Tone.Transport.scheduleRepeat((time) => {
    if (!isPlaying) return;
    
    const beatInMeasure = currentBeat % beatsPerChord;
    const chordIndex = Math.floor(currentBeat / beatsPerChord) % chords.length;
    
    // Update chord index when changing chords
    if (beatInMeasure === 0 && chordIndex !== currentChordIndex) {
      currentChordIndex = chordIndex;
    }
    
    // Callback for UI updates
    if (onBeatCallback) {
      onBeatCallback(currentChordIndex, beatInMeasure);
    }
    
    // Play chord on beat 1 of each measure
    if (beatInMeasure === 0) {
      const chord = chords[currentChordIndex];
      if (chord && chord.midiNotes && sampler) {
        chord.midiNotes.forEach((midiNote) => {
          const freq = Tone.Frequency(midiNote, "midi").toFrequency();
          sampler!.triggerAttackRelease(freq, "2n", time);
        });
      }
    }
    
    // Drum pattern: Kick on 1 and 3, Snare on 2 and 4, Hi-hat on all beats
    // Beat 1: Kick + Hi-hat
    // Beat 2: Snare + Hi-hat
    // Beat 3: Kick + Hi-hat
    // Beat 4: Snare + Hi-hat
    
    if (hihatSynth) {
      hihatSynth.triggerAttackRelease("C6", "32n", time);
    }
    
    if (beatInMeasure === 0 || beatInMeasure === 2) {
      // Kick on beats 1 and 3
      if (kickSynth) {
        kickSynth.triggerAttackRelease("C1", "8n", time);
      }
    }
    
    if (beatInMeasure === 1 || beatInMeasure === 3) {
      // Snare on beats 2 and 4
      if (snareSynth) {
        snareSynth.triggerAttackRelease("8n", time);
      }
    }
    
    currentBeat++;
    
    // Check if we've completed all chords
    if (currentBeat >= chords.length * beatsPerChord) {
      // Stop after one full progression
      Tone.Transport.stop();
      isPlaying = false;
      if (onComplete) {
        onComplete();
      }
    }
  }, "4n"); // Quarter note interval for 4/4 time
  
  Tone.Transport.start();
  
  // Return stop function
  return () => {
    isPlaying = false;
    Tone.Transport.stop();
    Tone.Transport.clear(loopId);
    Tone.Transport.position = 0;
  };
}
