// Scale definitions with intervals from root
export interface ChordProgression {
  name: string;
  numerals: string[];  // Roman numerals like ["I", "IV", "V", "I"]
  degrees: number[];   // Scale degrees (0-indexed): [0, 3, 4, 0]
  qualities: string[]; // Chord qualities: ["major", "major", "major", "major"]
}

export interface Scale {
  name: string;
  intervals: number[]; // Semitones from root
  description: string;
  progressions: ChordProgression[];
}

export const SCALES: Record<string, Scale> = {
  major: {
    name: "Major",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: "The most common scale, bright and happy sounding",
    progressions: [
      { name: "Pop/Rock", numerals: ["I", "V", "vi", "IV"], degrees: [0, 4, 5, 3], qualities: ["major", "major", "minor", "major"] },
      { name: "Classic", numerals: ["I", "IV", "V", "I"], degrees: [0, 3, 4, 0], qualities: ["major", "major", "major", "major"] },
      { name: "50s", numerals: ["I", "vi", "IV", "V"], degrees: [0, 5, 3, 4], qualities: ["major", "minor", "major", "major"] },
    ],
  },
  natural_minor: {
    name: "Natural Minor",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: "Sad and melancholic, also called Aeolian mode",
    progressions: [
      { name: "Sad", numerals: ["i", "VI", "III", "VII"], degrees: [0, 5, 2, 6], qualities: ["minor", "major", "major", "major"] },
      { name: "Dark", numerals: ["i", "iv", "v", "i"], degrees: [0, 3, 4, 0], qualities: ["minor", "minor", "minor", "minor"] },
      { name: "Epic", numerals: ["i", "VII", "VI", "VII"], degrees: [0, 6, 5, 6], qualities: ["minor", "major", "major", "major"] },
    ],
  },
  harmonic_minor: {
    name: "Harmonic Minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: "Minor scale with raised 7th, exotic sound",
    progressions: [
      { name: "Classical", numerals: ["i", "iv", "V", "i"], degrees: [0, 3, 4, 0], qualities: ["minor", "minor", "major", "minor"] },
      { name: "Exotic", numerals: ["i", "V", "VI", "V"], degrees: [0, 4, 5, 4], qualities: ["minor", "major", "major", "major"] },
    ],
  },
  melodic_minor: {
    name: "Melodic Minor",
    intervals: [0, 2, 3, 5, 7, 9, 11],
    description: "Minor scale with raised 6th and 7th",
    progressions: [
      { name: "Jazz", numerals: ["i", "ii", "V", "i"], degrees: [0, 1, 4, 0], qualities: ["minor", "minor", "major", "minor"] },
      { name: "Smooth", numerals: ["i", "IV", "V", "i"], degrees: [0, 3, 4, 0], qualities: ["minor", "major", "major", "minor"] },
    ],
  },
  pentatonic_major: {
    name: "Major Pentatonic",
    intervals: [0, 2, 4, 7, 9],
    description: "5-note scale, great for improvisation",
    progressions: [
      { name: "Country", numerals: ["I", "IV", "V", "I"], degrees: [0, 3, 4, 0], qualities: ["major", "major", "major", "major"] },
      { name: "Folk", numerals: ["I", "V", "IV", "I"], degrees: [0, 4, 3, 0], qualities: ["major", "major", "major", "major"] },
    ],
  },
  pentatonic_minor: {
    name: "Minor Pentatonic",
    intervals: [0, 3, 5, 7, 10],
    description: "The most popular scale for rock and blues",
    progressions: [
      { name: "Rock", numerals: ["i", "VII", "IV", "i"], degrees: [0, 4, 3, 0], qualities: ["minor", "major", "major", "minor"] },
      { name: "Blues", numerals: ["I7", "IV7", "I7", "V7"], degrees: [0, 1, 0, 2], qualities: ["7", "7", "7", "7"] },
    ],
  },
  blues: {
    name: "Blues",
    intervals: [0, 3, 5, 6, 7, 10],
    description: "Minor pentatonic with added blue note",
    progressions: [
      { name: "12-Bar Blues", numerals: ["I7", "IV7", "I7", "V7"], degrees: [0, 1, 0, 2], qualities: ["7", "7", "7", "7"] },
      { name: "Quick Change", numerals: ["I7", "IV7", "I7", "I7"], degrees: [0, 1, 0, 0], qualities: ["7", "7", "7", "7"] },
    ],
  },
  dorian: {
    name: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: "Minor scale with raised 6th, jazzy sound",
    progressions: [
      { name: "Funk", numerals: ["i7", "IV7", "i7", "IV7"], degrees: [0, 3, 0, 3], qualities: ["m7", "7", "m7", "7"] },
      { name: "Jazz", numerals: ["i", "IV", "i", "VII"], degrees: [0, 3, 0, 6], qualities: ["minor", "major", "minor", "major"] },
    ],
  },
  phrygian: {
    name: "Phrygian",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: "Spanish/Flamenco sound",
    progressions: [
      { name: "Flamenco", numerals: ["i", "II", "III", "II"], degrees: [0, 1, 2, 1], qualities: ["minor", "major", "major", "major"] },
      { name: "Metal", numerals: ["i", "II", "i", "VII"], degrees: [0, 1, 0, 6], qualities: ["minor", "major", "minor", "major"] },
    ],
  },
  lydian: {
    name: "Lydian",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    description: "Major scale with raised 4th, dreamy sound",
    progressions: [
      { name: "Dreamy", numerals: ["I", "II", "I", "II"], degrees: [0, 1, 0, 1], qualities: ["major", "major", "major", "major"] },
      { name: "Floating", numerals: ["I", "II", "vii", "I"], degrees: [0, 1, 6, 0], qualities: ["major", "major", "dim", "major"] },
    ],
  },
  mixolydian: {
    name: "Mixolydian",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    description: "Major scale with flat 7th, rock and blues",
    progressions: [
      { name: "Rock", numerals: ["I", "VII", "IV", "I"], degrees: [0, 6, 3, 0], qualities: ["major", "major", "major", "major"] },
      { name: "Funk", numerals: ["I7", "IV", "I7", "IV"], degrees: [0, 3, 0, 3], qualities: ["7", "major", "7", "major"] },
    ],
  },
  locrian: {
    name: "Locrian",
    intervals: [0, 1, 3, 5, 6, 8, 10],
    description: "Dark and unstable, rarely used",
    progressions: [
      { name: "Dark", numerals: ["i°", "II", "i°", "II"], degrees: [0, 1, 0, 1], qualities: ["dim", "major", "dim", "major"] },
    ],
  },
};

// All root notes
export const ROOT_NOTES = [
  { name: "C", semitone: 0 },
  { name: "C#/Db", semitone: 1 },
  { name: "D", semitone: 2 },
  { name: "D#/Eb", semitone: 3 },
  { name: "E", semitone: 4 },
  { name: "F", semitone: 5 },
  { name: "F#/Gb", semitone: 6 },
  { name: "G", semitone: 7 },
  { name: "G#/Ab", semitone: 8 },
  { name: "A", semitone: 9 },
  { name: "A#/Bb", semitone: 10 },
  { name: "B", semitone: 11 },
];

// Note names for display
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Guitar string tuning (standard) - MIDI note numbers for open strings
export const GUITAR_STRINGS = [
  { string: 1, openNote: 64, name: "E4", color: "#9c70e7" },  // High E
  { string: 2, openNote: 59, name: "B3", color: "#EA9E2D" },
  { string: 3, openNote: 55, name: "G3", color: "#F642EF" },
  { string: 4, openNote: 50, name: "D3", color: "#C2D934" },
  { string: 5, openNote: 45, name: "A2", color: "#C65151" },
  { string: 6, openNote: 40, name: "E2", color: "#38DBE5" },  // Low E
];

// Generate scale notes for fretboard (frets 0-12)
export function getScaleNotesOnFretboard(
  rootSemitone: number,
  scale: Scale,
  maxFret: number = 15
): Array<{
  string: number;
  fret: number;
  note: string;
  midiNote: number;
  isRoot: boolean;
  interval: number;
  color: string;
}> {
  const notes: Array<{
    string: number;
    fret: number;
    note: string;
    midiNote: number;
    isRoot: boolean;
    interval: number;
    color: string;
  }> = [];

  // Get all notes in the scale
  const scaleNotes = scale.intervals.map((interval) => (rootSemitone + interval) % 12);

  // For each string
  for (const guitarString of GUITAR_STRINGS) {
    // For each fret
    for (let fret = 0; fret <= maxFret; fret++) {
      const midiNote = guitarString.openNote + fret;
      const noteSemitone = midiNote % 12;

      // Check if this note is in the scale
      const scaleIndex = scaleNotes.indexOf(noteSemitone);
      if (scaleIndex !== -1) {
        notes.push({
          string: guitarString.string,
          fret,
          note: NOTE_NAMES[noteSemitone],
          midiNote,
          isRoot: noteSemitone === rootSemitone,
          interval: scale.intervals[scaleIndex],
          color: guitarString.color,
        });
      }
    }
  }

  return notes;
}

// Get interval name
export function getIntervalName(interval: number): string {
  const names: Record<number, string> = {
    0: "R",
    1: "♭2",
    2: "2",
    3: "♭3",
    4: "3",
    5: "4",
    6: "♭5",
    7: "5",
    8: "♭6",
    9: "6",
    10: "♭7",
    11: "7",
  };
  return names[interval] || String(interval);
}

// Major scale intervals for comparison (in semitones)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE_DEGREES = ["1", "2", "3", "4", "5", "6", "7"];

// Get scale formula compared to major scale
export function getScaleFormula(scale: Scale): string[] {
  const formula: string[] = [];
  
  // Map semitone intervals to scale degrees
  for (const interval of scale.intervals) {
    // Find which major scale degree this is closest to
    let degree = "";
    
    if (interval === 0) degree = "1";
    else if (interval === 1) degree = "♭2";
    else if (interval === 2) degree = "2";
    else if (interval === 3) degree = "♭3";
    else if (interval === 4) degree = "3";
    else if (interval === 5) degree = "4";
    else if (interval === 6) degree = "♯4/♭5";
    else if (interval === 7) degree = "5";
    else if (interval === 8) degree = "♭6";
    else if (interval === 9) degree = "6";
    else if (interval === 10) degree = "♭7";
    else if (interval === 11) degree = "7";
    
    formula.push(degree);
  }
  
  return formula;
}

// Get comparison to major scale (what's different)
export function getMajorScaleComparison(scale: Scale): {
  formula: string[];
  differences: string[];
} {
  const formula = getScaleFormula(scale);
  const differences: string[] = [];
  
  // Major scale formula
  const majorFormula = ["1", "2", "3", "4", "5", "6", "7"];
  
  // Check what's different from major
  const scaleHas: Record<string, boolean> = {};
  for (const degree of formula) {
    // Normalize the degree (remove flats/sharps for comparison)
    const baseDegree = degree.replace(/[♭♯]/g, "").replace("/♭5", "");
    scaleHas[baseDegree] = true;
    scaleHas[degree] = true;
  }
  
  // Find differences
  for (let i = 0; i < majorFormula.length; i++) {
    const majorDegree = majorFormula[i];
    const scaleInterval = scale.intervals.find((int) => {
      // Check if this interval corresponds to this degree
      const majorSemitone = MAJOR_SCALE_INTERVALS[i];
      return Math.abs(int - majorSemitone) <= 1 && 
             scale.intervals.indexOf(int) !== -1;
    });
    
    if (scaleInterval !== undefined) {
      const majorSemitone = MAJOR_SCALE_INTERVALS[i];
      if (scaleInterval < majorSemitone) {
        differences.push(`♭${majorDegree}`);
      } else if (scaleInterval > majorSemitone) {
        differences.push(`♯${majorDegree}`);
      }
    }
  }
  
  return { formula, differences };
}

// Generate actual chord names from a progression based on root note
export function getProgressionChords(
  rootSemitone: number,
  scale: Scale,
  progression: ChordProgression
): { chord: string; quality: string; searchId: string; midiNotes: number[] }[] {
  const chords: { chord: string; quality: string; searchId: string; midiNotes: number[] }[] = [];
  
  for (let i = 0; i < progression.degrees.length; i++) {
    const degree = progression.degrees[i];
    const quality = progression.qualities[i];
    
    // Get the scale degree's semitone offset
    let semitoneOffset = 0;
    if (scale.intervals.length > degree) {
      semitoneOffset = scale.intervals[degree];
    } else {
      // For pentatonic/blues scales, map to closest major scale degree
      const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
      semitoneOffset = majorIntervals[degree % 7];
    }
    
    // Calculate the chord root note
    const chordRootSemitone = (rootSemitone + semitoneOffset) % 12;
    const chordRoot = NOTE_NAMES[chordRootSemitone];
    
    // Build chord name and search ID
    let suffix = "";
    let searchSuffix = "";
    
    switch (quality) {
      case "major":
        suffix = "";
        searchSuffix = "major";
        break;
      case "minor":
        suffix = "m";
        searchSuffix = "minor";
        break;
      case "dim":
        suffix = "°";
        searchSuffix = "dim";
        break;
      case "7":
        suffix = "7";
        searchSuffix = "7";
        break;
      case "m7":
        suffix = "m7";
        searchSuffix = "m7";
        break;
      case "maj7":
        suffix = "maj7";
        searchSuffix = "maj7";
        break;
      default:
        suffix = quality;
        searchSuffix = quality;
    }
    
    const chordName = `${chordRoot}${suffix}`;
    // Create search-friendly ID (lowercase, no special chars)
    const searchId = `${chordRoot.toLowerCase().replace("#", "sharp")}${searchSuffix}`;
    
    // Generate MIDI notes for the chord
    const midiNotes = getChordMidiNotes(chordRootSemitone, quality);
    
    chords.push({ chord: chordName, quality, searchId, midiNotes });
  }
  
  return chords;
}

// Get MIDI notes for a chord based on root and quality
export function getChordMidiNotes(rootSemitone: number, quality: string): number[] {
  // Base MIDI note (octave 3, around middle of guitar range)
  const baseMidi = 48 + rootSemitone; // C3 = 48
  
  // Chord intervals in semitones
  let intervals: number[] = [];
  
  switch (quality) {
    case "major":
      intervals = [0, 4, 7]; // Root, major 3rd, perfect 5th
      break;
    case "minor":
      intervals = [0, 3, 7]; // Root, minor 3rd, perfect 5th
      break;
    case "dim":
      intervals = [0, 3, 6]; // Root, minor 3rd, diminished 5th
      break;
    case "7":
      intervals = [0, 4, 7, 10]; // Dominant 7th
      break;
    case "m7":
      intervals = [0, 3, 7, 10]; // Minor 7th
      break;
    case "maj7":
      intervals = [0, 4, 7, 11]; // Major 7th
      break;
    case "aug":
      intervals = [0, 4, 8]; // Augmented
      break;
    default:
      intervals = [0, 4, 7]; // Default to major
  }
  
  return intervals.map(interval => baseMidi + interval);
}

