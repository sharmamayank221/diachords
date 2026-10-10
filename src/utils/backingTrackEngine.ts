import * as Tone from "tone";
import { findChord } from "@/helpers/chordSearch";
import { getChordStringNotes } from "@/helpers/chordNotes";

// Backing Track Engine - Generates drums, bass, and rhythm patterns

// ============ TYPES ============
export type Genre = "rock" | "blues" | "jazz" | "pop" | "funk" | "reggae" | "country";

export interface TrackSettings {
  key: string;
  bpm: number;
  genre: Genre;
  chordProgression: string[]; // one chord per bar, e.g. ["C", "Am", "F", "G"]
  countIn?: boolean; // one bar of clicks before the band comes in
  onChordChange?: (chordIndex: number) => void;
  onBeat?: (beat: number, countIn: boolean) => void; // 0–3, in time with the audio
}

export interface BackingTrack {
  isPlaying: boolean;
  start: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setVolume: (instrument: "drums" | "bass" | "rhythm", volume: number) => void;
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
// Chord tones, not fixed semitones, so the bass follows each chord's quality (Am gets C, not C#).
// [tone, beat within the bar]
type BassTone = "R" | "3" | "5" | "6" | "b7" | "8" | "approach";
const BASS_PATTERNS: Record<Genre, [BassTone, number][]> = {
  rock: [["R", 0], ["R", 0.5], ["5", 1], ["R", 1.5], ["R", 2], ["R", 2.5], ["5", 3], ["8", 3.5]], // driving eighths
  blues: [["R", 0], ["3", 0.5], ["5", 1], ["6", 1.5], ["b7", 2], ["6", 2.5], ["5", 3], ["3", 3.5]], // boogie walk
  jazz: [["R", 0], ["3", 1], ["5", 2], ["approach", 3]], // walking quarters into the next chord
  pop: [["R", 0], ["R", 1], ["R", 2], ["R", 3]],
  funk: [["R", 0], ["R", 0.75], ["8", 1], ["R", 1.5], ["5", 2.25], ["R", 2.5], ["b7", 3], ["8", 3.5]],
  reggae: [["R", 0], ["5", 1.5], ["R", 2], ["R", 3.5]], // one-drop feel
  country: [["R", 0], ["5", 1], ["R", 2], ["5", 3]], // root-fifth alternating
};

// ============ NOTE MAPPING ============
const NOTE_TO_MIDI: Record<string, number> = {
  "C": 36, "C#": 37, "Db": 37, "D": 38, "D#": 39, "Eb": 39,
  "E": 40, "F": 41, "F#": 42, "Gb": 42, "G": 43, "G#": 44,
  "Ab": 44, "A": 45, "A#": 46, "Bb": 46, "B": 47,
};

function getChordRoot(chord: string): string {
  const match = chord.match(/^([A-G][#b]?)/);
  return match ? match[1] : "C";
}

// semitone offsets of the chord's 3rd, 5th and 7th from its name
function chordTones(chord: string) {
  const q = chord.replace(/^[A-G][#b]?/, "").split("/")[0];
  const minor = /^m(?!aj)/.test(q) || /^min/.test(q);
  const dim = /dim|°|m7b5|ø/.test(q);
  const aug = /aug|\+/.test(q);
  return {
    third: minor || dim ? 3 : 4,
    fifth: dim ? 6 : aug ? 8 : 7,
    sixth: dim ? 8 : 9,
    seventh: /maj7|M7|Δ/.test(q) ? 11 : dim && /dim7|°7/.test(q) ? 9 : 10,
  };
}

function bassOffset(tone: BassTone, chord: string, nextChord: string): number {
  const t = chordTones(chord);
  switch (tone) {
    case "R": return 0;
    case "3": return t.third;
    case "5": return t.fifth;
    case "6": return t.sixth;
    case "b7": return t.seventh;
    case "8": return 12;
    case "approach": {
      // a semitone below the next chord's root, leading into it
      const here = NOTE_TO_MIDI[getChordRoot(chord)] ?? 36;
      const next = NOTE_TO_MIDI[getChordRoot(nextChord)] ?? here;
      let off = next - 1 - here;
      while (off < -5) off += 12;
      while (off > 6) off -= 12;
      return off;
    }
  }
}

// beats from the start of the loop → Tone's "bars:quarters:sixteenths"
function beatsToTime(beats: number): string {
  const bars = Math.floor(beats / 4);
  const quarters = Math.floor(beats % 4);
  const sixteenths = Math.round((beats % 1) * 4);
  return `${bars}:${quarters}:${sixteenths}`;
}

// Guitar voicing for a chord name: the chord library's first shape, else a plain triad
function chordVoicing(chord: string): number[] {
  const item = findChord(chord);
  const pos = item?.positions[0];
  if (pos) {
    const midi = getChordStringNotes(pos.frets, pos.baseFret, item?.key)
      .map((n) => n.midi)
      .filter((m): m is number => m !== null);
    if (midi.length) return midi;
  }
  const root = (NOTE_TO_MIDI[getChordRoot(chord)] ?? 36) + 12;
  const t = chordTones(chord);
  return [root, root + t.third, root + t.fifth];
}

export function isKnownChord(chord: string): boolean {
  return /^[A-G][#b]?/.test(chord) && !!findChord(chord);
}

// ============ SYNTH SETUP ============
// Kick drum components
let kickSynth: Tone.MembraneSynth | null = null;
let kickClick: Tone.Synth | null = null;
// Snare drum components  
let snareBody: Tone.MembraneSynth | null = null;
let snareNoise: Tone.NoiseSynth | null = null;
// Hi-hat
let hihatSynth: Tone.MetalSynth | null = null;
// Bass and rhythm
let bassSynth: Tone.MonoSynth | null = null;
let guitarSampler: Tone.Sampler | null = null;

let drumVolume: Tone.Volume | null = null;
let bassVolume: Tone.Volume | null = null;
let rhythmVolume: Tone.Volume | null = null;

let drumSequence: Tone.Sequence | null = null;
let bassSequence: Tone.Sequence | null = null;
let rhythmSequence: Tone.Sequence | null = null;
let chordTrackingPart: Tone.Part | null = null;

async function initSynths() {
  if (kickSynth) return; // Already initialized
  
  // Volume nodes
  drumVolume = new Tone.Volume(-3).toDestination();
  bassVolume = new Tone.Volume(-8).toDestination();
  rhythmVolume = new Tone.Volume(-10).toDestination();
  
  // ========== ACOUSTIC KICK DRUM ==========
  // Main kick body - deep, punchy
  kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 4,
    oscillator: { type: "sine" },
    envelope: { 
      attack: 0.001, 
      decay: 0.25, 
      sustain: 0, 
      release: 0.4 
    },
  }).connect(drumVolume);
  kickSynth.volume.value = -4;
  
  // Kick attack click - adds definition
  kickClick = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.001,
      decay: 0.02,
      sustain: 0,
      release: 0.02,
    },
  }).connect(drumVolume);
  kickClick.volume.value = -15;
  
  // ========== ACOUSTIC SNARE DRUM ==========
  // Snare body - tonal component
  snareBody = new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 2,
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.001,
      decay: 0.15,
      sustain: 0,
      release: 0.1,
    },
  }).connect(drumVolume);
  snareBody.volume.value = -12;
  
  // Snare noise - snare wires/rattle
  snareNoise = new Tone.NoiseSynth({
    noise: { type: "pink" }, // Pink noise sounds more natural than white
    envelope: { 
      attack: 0.001, 
      decay: 0.15, 
      sustain: 0, 
      release: 0.12 
    },
  }).connect(drumVolume);
  snareNoise.volume.value = -8;
  
  // ========== ACOUSTIC HI-HAT ==========
  hihatSynth = new Tone.MetalSynth({
    envelope: { 
      attack: 0.001, 
      decay: 0.06, 
      release: 0.02 
    },
    harmonicity: 3.5,
    modulationIndex: 20,
    resonance: 5000,
    octaves: 1,
  }).connect(drumVolume);
  hihatSynth.volume.value = -16;
  
  // Bass synth
  bassSynth = new Tone.MonoSynth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 2.5 },
  }).connect(bassVolume);
  
  // Guitar sampler for rhythm - using actual guitar samples
  guitarSampler = new Tone.Sampler({
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
        // Acoustic kick - body + click layer
        if (drum === "kick") {
          if (kickSynth) {
            kickSynth.triggerAttackRelease("C1", "8n", time);
          }
          if (kickClick) {
            kickClick.triggerAttackRelease("G4", "32n", time);
          }
        }
        // Acoustic snare - body + snare wires layer
        if (drum === "snare") {
          if (snareBody) {
            snareBody.triggerAttackRelease("G3", "16n", time);
          }
          if (snareNoise) {
            snareNoise.triggerAttackRelease("16n", time);
          }
        }
        // Hi-hat
        if (drum === "hihat" && hihatSynth) {
          hihatSynth.triggerAttackRelease("C6", "32n", time);
        }
      });
    },
    events,
    "16n"
  );
}

function createBassPart(genre: Genre, chordProgression: string[]) {
  const pattern = BASS_PATTERNS[genre];
  const events: { time: string; note: string }[] = [];
  chordProgression.forEach((chord, bar) => {
    const next = chordProgression[(bar + 1) % chordProgression.length];
    const rootMidi = NOTE_TO_MIDI[getChordRoot(chord)] ?? 36;
    pattern.forEach(([tone, beat]) => {
      events.push({
        time: beatsToTime(bar * 4 + beat),
        note: Tone.Frequency(rootMidi + bassOffset(tone, chord, next), "midi").toNote(),
      });
    });
  });
  const part = new Tone.Part<{ time: string; note: string }>((time, event) => {
    bassSynth?.triggerAttackRelease(event.note, "8n", time);
  }, events);
  part.loop = true;
  part.loopEnd = `${chordProgression.length}:0:0`;
  return part;
}

function createRhythmPart(genre: Genre, chordProgression: string[]) {
  // where the guitar strums within each bar
  const strums: Record<Genre, number[]> = {
    rock: [0, 2],
    blues: [0, 1, 2, 3],
    jazz: [0.5, 1.5, 2.5, 3.5],
    pop: [0, 1, 2, 3],
    funk: [0.5, 1, 2.5, 3],
    reggae: [1, 3],
    country: [1, 3],
  };
  const voicings = chordProgression.map(chordVoicing);
  const events: { time: string; bar: number }[] = [];
  chordProgression.forEach((_, bar) => {
    strums[genre].forEach((beat) => events.push({ time: beatsToTime(bar * 4 + beat), bar }));
  });
  const part = new Tone.Part<{ time: string; bar: number }>((time, event) => {
    if (!guitarSampler) return;
    voicings[event.bar].forEach((midi, i) => {
      // low → high, a few ms apart, like a down-strum
      guitarSampler!.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), "4n", time + i * 0.012);
    });
  }, events);
  part.loop = true;
  part.loopEnd = `${chordProgression.length}:0:0`;
  return part;
}

// ============ MAIN API ============

let beatPart: Tone.Part | null = null;
let countInPart: Tone.Part | null = null;
let countClick: Tone.MembraneSynth | null = null;

function disposeParts() {
  for (const p of [drumSequence, bassSequence, rhythmSequence, chordTrackingPart, beatPart, countInPart]) {
    try {
      p?.stop(0);
      p?.dispose();
    } catch {
      /* already disposed */
    }
  }
  drumSequence = null;
  bassSequence = null;
  rhythmSequence = null;
  chordTrackingPart = null;
  beatPart = null;
  countInPart = null;
}

export async function createBackingTrack(settings: TrackSettings): Promise<BackingTrack> {
  // load every sample first, so a count-in is never followed by a silent gap
  await initSynths();
  await Tone.start();

  try {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = "0:0:0";
  } catch {
    /* ignore */
  }
  disposeParts();
  Tone.Transport.bpm.value = settings.bpm;

  const bars = settings.chordProgression.length;
  drumSequence = createDrumSequence(settings.genre);
  bassSequence = createBassPart(settings.genre, settings.chordProgression) as unknown as Tone.Sequence;
  rhythmSequence = createRhythmPart(settings.genre, settings.chordProgression) as unknown as Tone.Sequence;

  // one event per beat drives the chord display and beat lights from the audio clock
  const beatEvents: { time: string; bar: number; beat: number }[] = [];
  for (let bar = 0; bar < bars; bar++) for (let beat = 0; beat < 4; beat++) beatEvents.push({ time: `${bar}:${beat}:0`, bar, beat });
  beatPart = new Tone.Part<{ time: string; bar: number; beat: number }>((time, e) => {
    Tone.Draw.schedule(() => {
      if (e.beat === 0) settings.onChordChange?.(e.bar);
      settings.onBeat?.(e.beat, false);
    }, time);
  }, beatEvents);
  beatPart.loop = true;
  beatPart.loopEnd = `${bars}:0:0`;

  if (settings.countIn) {
    if (!countClick) {
      countClick = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination();
    }
    countInPart = new Tone.Part<{ time: string; beat: number }>(
      (time, e) => {
        countClick?.triggerAttackRelease(e.beat === 0 ? "G4" : "C4", "32n", time);
        Tone.Draw.schedule(() => settings.onBeat?.(e.beat, true), time);
      },
      [0, 1, 2, 3].map((beat) => ({ time: `0:${beat}:0`, beat }))
    );
  }

  let isPlaying = false;
  return {
    isPlaying,
    start: () => {
      if (isPlaying) return;
      isPlaying = true;
      const offset = settings.countIn ? "1m" : 0; // the band enters after the count-in bar
      countInPart?.start(0);
      for (const p of [drumSequence, bassSequence, rhythmSequence, beatPart]) p?.start(offset);
      Tone.Transport.start("+0.05");
    },
    stop: () => {
      isPlaying = false;
      try {
        Tone.Transport.stop();
        Tone.Transport.cancel();
      } catch {
        /* ignore */
      }
      disposeParts();
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
  };
}

// Cleanup function
export function disposeBackingTrack() {
  try {
    Tone.Transport.stop();
    Tone.Transport.cancel();
  } catch {
    /* ignore */
  }
  disposeParts();
}
