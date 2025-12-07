import * as Tone from "tone";

// Backing Track Engine - Generates drums, bass, and rhythm patterns

// ============ TYPES ============
export type Genre = "rock" | "blues" | "jazz" | "pop" | "funk" | "reggae" | "country";

export interface TrackSettings {
  key: string;
  bpm: number;
  genre: Genre;
  chordProgression: string[]; // e.g., ["C", "Am", "F", "G"]
  measures: number;
}

export interface BackingTrack {
  isPlaying: boolean;
  start: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setVolume: (instrument: "drums" | "bass" | "rhythm", volume: number) => void;
  toggleMute: (instrument: "drums" | "bass" | "rhythm") => void;
}

// ============ DRUM PATTERNS BY GENRE ============
const DRUM_PATTERNS: Record<Genre, { kick: string; snare: string; hihat: string; }> = {
  rock: {
    kick:  "x...x...x...x...",
    snare: "....x.......x...",
    hihat: "x.x.x.x.x.x.x.x.",
  },
  blues: {
    kick:  "x.....x...x.....",
    snare: "....x.......x...",
    hihat: "..x...x...x...x.",
  },
  jazz: {
    kick:  "x.........x.....",
    snare: "....x.......x...",
    hihat: "x..x..x..x..x..x",
  },
  pop: {
    kick:  "x...x...x...x...",
    snare: "....x.......x...",
    hihat: "xxxxxxxxxxxxxxxx",
  },
  funk: {
    kick:  "x..x..x...x..x..",
    snare: "....x..x....x...",
    hihat: "x.xxx.xxx.xxx.xx",
  },
  reggae: {
    kick:  "..x...x...x...x.",
    snare: "....x.......x...",
    hihat: "..x...x...x...x.",
  },
  country: {
    kick:  "x...x...x...x...",
    snare: "....x.......x...",
    hihat: "x.x.x.x.x.x.x.x.",
  },
};

// ============ BASS PATTERNS BY GENRE ============
const BASS_PATTERNS: Record<Genre, number[][]> = {
  rock: [[0, 0], [4, 0.5], [0, 1], [4, 1.5], [0, 2], [4, 2.5], [0, 3], [4, 3.5]], // Root-fifth pattern
  blues: [[0, 0], [0, 0.5], [4, 1], [5, 1.5], [4, 2], [0, 2.5], [0, 3], [-2, 3.5]], // Walking bass
  jazz: [[0, 0], [2, 1], [4, 2], [5, 3]], // Walking quarters
  pop: [[0, 0], [0, 1], [0, 2], [0, 3]], // Simple root
  funk: [[0, 0], [0, 0.25], [-12, 0.5], [0, 0.75], [0, 1], [3, 1.5], [0, 2], [0, 2.5], [5, 3], [3, 3.5]],
  reggae: [[0, 0.5], [0, 1.5], [0, 2.5], [0, 3.5]], // Off-beat
  country: [[0, 0], [7, 1], [0, 2], [7, 3]], // Root-fifth alternating
};

// ============ NOTE MAPPING ============
const NOTE_TO_MIDI: Record<string, number> = {
  "C": 36, "C#": 37, "Db": 37, "D": 38, "D#": 39, "Eb": 39,
  "E": 40, "F": 41, "F#": 42, "Gb": 42, "G": 43, "G#": 44,
  "Ab": 44, "A": 45, "A#": 46, "Bb": 46, "B": 47,
};

// Parse chord to get root note
function getChordRoot(chord: string): string {
  // Handle chords like "Cm", "C#m7", "Dmaj7", etc.
  const match = chord.match(/^([A-G][#b]?)/);
  return match ? match[1] : "C";
}

// ============ SYNTH SETUP ============
let kickSynth: Tone.MembraneSynth | null = null;
let snareSynth: Tone.NoiseSynth | null = null;
let hihatSynth: Tone.MetalSynth | null = null;
let bassSynth: Tone.MonoSynth | null = null;
let rhythmSynth: Tone.PolySynth | null = null;

let drumVolume: Tone.Volume | null = null;
let bassVolume: Tone.Volume | null = null;
let rhythmVolume: Tone.Volume | null = null;

let drumSequence: Tone.Sequence | null = null;
let bassSequence: Tone.Sequence | null = null;
let rhythmSequence: Tone.Sequence | null = null;

async function initSynths() {
  if (kickSynth) return; // Already initialized
  
  // Volume nodes
  drumVolume = new Tone.Volume(-6).toDestination();
  bassVolume = new Tone.Volume(-8).toDestination();
  rhythmVolume = new Tone.Volume(-12).toDestination();
  
  // Kick drum
  kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
  }).connect(drumVolume);
  
  // Snare
  snareSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
  }).connect(drumVolume);
  
  // Hi-hat
  hihatSynth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(drumVolume);
  hihatSynth.volume.value = -10;
  
  // Bass synth
  bassSynth = new Tone.MonoSynth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 2.5 },
  }).connect(bassVolume);
  
  // Rhythm/pad synth
  rhythmSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 },
  }).connect(rhythmVolume);
  
  await Tone.loaded();
}

// ============ PATTERN GENERATORS ============

function createDrumSequence(genre: Genre) {
  const pattern = DRUM_PATTERNS[genre];
  const steps = 16;
  
  const events: (string | null)[] = [];
  for (let i = 0; i < steps; i++) {
    const drums: string[] = [];
    if (pattern.kick[i] === "x") drums.push("kick");
    if (pattern.snare[i] === "x") drums.push("snare");
    if (pattern.hihat[i] === "x") drums.push("hihat");
    events.push(drums.length > 0 ? drums.join(",") : null);
  }
  
  return new Tone.Sequence(
    (time, drums) => {
      if (!drums) return;
      const parts = drums.split(",");
      parts.forEach((drum) => {
        if (drum === "kick" && kickSynth) {
          kickSynth.triggerAttackRelease("C1", "8n", time);
        }
        if (drum === "snare" && snareSynth) {
          snareSynth.triggerAttackRelease("8n", time);
        }
        if (drum === "hihat" && hihatSynth) {
          hihatSynth.triggerAttackRelease("C6", "32n", time);
        }
      });
    },
    events,
    "16n"
  );
}

function createBassSequence(genre: Genre, chordProgression: string[], measures: number) {
  const pattern = BASS_PATTERNS[genre];
  const events: { note: string; time: number }[] = [];
  
  // For each measure (each chord)
  for (let measure = 0; measure < chordProgression.length; measure++) {
    const chord = chordProgression[measure % chordProgression.length];
    const rootNote = getChordRoot(chord);
    const rootMidi = NOTE_TO_MIDI[rootNote] || 36;
    
    // Apply bass pattern
    pattern.forEach(([semitoneOffset, beatOffset]) => {
      const midiNote = rootMidi + semitoneOffset;
      const note = Tone.Frequency(midiNote, "midi").toNote();
      const time = measure * 4 + beatOffset; // 4 beats per measure
      events.push({ note, time });
    });
  }
  
  // Convert to Tone.Part with typed events
  const partEvents = events.map(e => ({
    time: e.time + ":0:0",
    note: e.note
  }));
  
  const part = new Tone.Part<{ time: string; note: string }>((time, event) => {
    if (bassSynth && event.note) {
      bassSynth.triggerAttackRelease(event.note, "8n", time);
    }
  }, partEvents);
  
  part.loop = true;
  part.loopEnd = `${chordProgression.length}:0:0`;
  
  return part;
}

function createRhythmSequence(genre: Genre, chordProgression: string[]) {
  // Simple rhythm guitar/keys - plays chord on beats based on genre
  const rhythmPatterns: Record<Genre, number[]> = {
    rock: [0, 2],        // Beats 1 and 3
    blues: [0, 1, 2, 3], // All beats
    jazz: [0.5, 1.5, 2.5, 3.5], // Off-beats (comping)
    pop: [0, 1, 2, 3],   // All beats
    funk: [0.5, 1, 2.5, 3], // Syncopated
    reggae: [0.5, 2.5],  // Off-beat skank
    country: [1, 3],     // Beats 2 and 4
  };
  
  const beats = rhythmPatterns[genre];
  const events: { chord: string; time: number }[] = [];
  
  chordProgression.forEach((chord, measure) => {
    beats.forEach((beat) => {
      events.push({ chord, time: measure * 4 + beat });
    });
  });
  
  const chordNotes: Record<string, string[]> = {
    // Major chords
    "C": ["C4", "E4", "G4"], "D": ["D4", "F#4", "A4"], "E": ["E4", "G#4", "B4"],
    "F": ["F4", "A4", "C5"], "G": ["G4", "B4", "D5"], "A": ["A4", "C#5", "E5"],
    "B": ["B4", "D#5", "F#5"],
    // Minor chords
    "Cm": ["C4", "Eb4", "G4"], "Dm": ["D4", "F4", "A4"], "Em": ["E4", "G4", "B4"],
    "Fm": ["F4", "Ab4", "C5"], "Gm": ["G4", "Bb4", "D5"], "Am": ["A4", "C5", "E5"],
    "Bm": ["B4", "D5", "F#5"],
    // Sharps/flats major
    "C#": ["C#4", "F4", "G#4"], "Db": ["Db4", "F4", "Ab4"],
    "D#": ["D#4", "G4", "A#4"], "Eb": ["Eb4", "G4", "Bb4"],
    "F#": ["F#4", "A#4", "C#5"], "Gb": ["Gb4", "Bb4", "Db5"],
    "G#": ["G#4", "C5", "D#5"], "Ab": ["Ab4", "C5", "Eb5"],
    "A#": ["A#4", "D5", "F5"], "Bb": ["Bb4", "D5", "F5"],
    // Sharps/flats minor
    "C#m": ["C#4", "E4", "G#4"], "Dbm": ["Db4", "E4", "Ab4"],
    "D#m": ["D#4", "F#4", "A#4"], "Ebm": ["Eb4", "Gb4", "Bb4"],
    "F#m": ["F#4", "A4", "C#5"], "Gbm": ["Gb4", "A4", "Db5"],
    "G#m": ["G#4", "B4", "D#5"], "Abm": ["Ab4", "B4", "Eb5"],
    "A#m": ["A#4", "C#5", "F5"], "Bbm": ["Bb4", "Db5", "F5"],
  };
  
  // Convert to Tone.Part with typed events
  const partEvents = events.map(e => ({
    time: `${Math.floor(e.time / 4)}:${e.time % 4}:0`,
    chord: e.chord
  }));
  
  const part = new Tone.Part<{ time: string; chord: string }>((time, event) => {
    if (rhythmSynth && event.chord) {
      const notes = chordNotes[event.chord] || chordNotes["C"];
      rhythmSynth.triggerAttackRelease(notes, "8n", time);
    }
  }, partEvents);
  
  part.loop = true;
  part.loopEnd = `${chordProgression.length}:0:0`;
  
  return part;
}

// ============ MAIN API ============

export async function createBackingTrack(settings: TrackSettings): Promise<BackingTrack> {
  await initSynths();
  await Tone.start();
  
  // Stop any existing sequences
  if (drumSequence) { drumSequence.stop(); drumSequence.dispose(); }
  if (bassSequence) { bassSequence.stop(); bassSequence.dispose(); }
  if (rhythmSequence) { rhythmSequence.stop(); rhythmSequence.dispose(); }
  
  Tone.Transport.bpm.value = settings.bpm;
  Tone.Transport.stop();
  // Reset position safely
  try {
    Tone.Transport.position = "0:0:0";
  } catch (e) {
    // Ignore position reset errors
  }
  
  // Create sequences
  drumSequence = createDrumSequence(settings.genre);
  bassSequence = createBassSequence(settings.genre, settings.chordProgression, settings.measures) as unknown as Tone.Sequence;
  rhythmSequence = createRhythmSequence(settings.genre, settings.chordProgression) as unknown as Tone.Sequence;
  
  let isPlaying = false;
  
  return {
    isPlaying,
    
    start: () => {
      if (isPlaying) return;
      isPlaying = true;
      
      drumSequence?.start(0);
      bassSequence?.start(0);
      rhythmSequence?.start(0);
      Tone.Transport.start();
    },
    
    stop: () => {
      isPlaying = false;
      Tone.Transport.stop();
      // Reset position safely
      try {
        Tone.Transport.position = "0:0:0";
      } catch (e) {
        // Ignore position reset errors
      }
      drumSequence?.stop();
      bassSequence?.stop();
      rhythmSequence?.stop();
    },
    
    setBpm: (bpm: number) => {
      Tone.Transport.bpm.value = bpm;
    },
    
    setVolume: (instrument: "drums" | "bass" | "rhythm", volume: number) => {
      // volume: 0-100
      const db = volume === 0 ? -Infinity : (volume - 100) * 0.5;
      if (instrument === "drums" && drumVolume) drumVolume.volume.value = db;
      if (instrument === "bass" && bassVolume) bassVolume.volume.value = db;
      if (instrument === "rhythm" && rhythmVolume) rhythmVolume.volume.value = db;
    },
    
    toggleMute: (instrument: "drums" | "bass" | "rhythm") => {
      if (instrument === "drums" && drumVolume) drumVolume.mute = !drumVolume.mute;
      if (instrument === "bass" && bassVolume) bassVolume.mute = !bassVolume.mute;
      if (instrument === "rhythm" && rhythmVolume) rhythmVolume.mute = !rhythmVolume.mute;
    },
  };
}

// Cleanup function
export function disposeBackingTrack() {
  Tone.Transport.stop();
  drumSequence?.dispose();
  bassSequence?.dispose();
  rhythmSequence?.dispose();
  drumSequence = null;
  bassSequence = null;
  rhythmSequence = null;
}

