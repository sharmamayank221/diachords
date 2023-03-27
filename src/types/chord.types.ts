export interface Chords {
  main: Main;
  tunings: Tunings;
  keys: KEY_SIGNATURE[];
  suffixes: string[];
  chords: ChordsClass;
}

export interface ChordsClass {
  C: A[];
  Csharp: A[];
  D: A[];
  Eb: A[];
  E: A[];
  F: A[];
  Fsharp: A[];
  G: A[];
  Ab: A[];
  A: A[];
  Bb: A[];
  B: A[];
}

export interface A {
  key: KEY_SIGNATURE;
  suffix: string;
  positions: Position[];
  params: { id: string };
}

export enum KEY_SIGNATURE {
  A = "A",
  Ab = "Ab",
  B = "B",
  Bb = "Bb",
  C = "C",
  D = "D",
  E = "E",
  Eb = "Eb",
  F = "F",
  G = "G",
  KeyC = "C#",
  KeyF = "F#",
}

export interface Position {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  midi: number[];
  capo?: boolean;
}

export interface Main {
  strings: number;
  fretsOnChord: number;
  name: string;
  numberOfChords: number;
}

export interface Tunings {
  standard: string[];
}
