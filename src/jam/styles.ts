// Style library: everything that makes "blues" sound like blues, as data.
//
// Grids are strings with one character per step. A bar has `beats * stepsPerBeat` steps:
// 4/4 straight = 4×4 (16ths), 12/8 and jazz swing = 4×3 (triplets), 6/8 = 2×3, 3/4 = 3×4.
// Drum velocity: X=1.0  x=0.8  o=0.5  g=0.28 (ghost)  .=rest
// Guitar:  D/d = down-strum (loud/soft), U/u = up-strum, x = muted scratch, P = palm-muted chug,
//          b = single bass note (boom-chick), 0-5 = arpeggio string (0 = lowest), . = rest
// Keys:    X/x = chord hit (loud/soft), - = keep holding, . = rest

export type DrumPiece =
  | "kick" | "snare" | "sidestick" | "hihat" | "pedalhat" | "openhat"
  | "ride" | "ridebell" | "crash" | "tom1" | "tom2" | "tom3"
  | "tambourine" | "clap" | "shaker" | "cowbell" | "sweep";

export type BassRole = "R" | "3" | "5" | "6" | "b7" | "8" | "approach" | "chord";
export interface BassSlot {
  step: number;
  role: BassRole;
  len: number; // steps
  vel: number; // 0..1
}

export interface StyleDef {
  id: string;
  name: string;
  description: string;
  meter: { beats: number; stepsPerBeat: 3 | 4; label: string };
  tempo: { min: number; max: number; default: number };
  /** 0.5 = straight, 0.67 = triplet swing. Only applies to 4-step (16th) grids. */
  swing: number;
  swingUnit: "8th" | "16th";
  /** Milliseconds behind (+) or ahead (−) of the grid, and random spread. */
  feel: { kick: number; snare: number; hats: number; bass: number; guitar: number; keys: number; spread: number };
  drums: { bars: Partial<Record<DrumPiece, string>>[]; fill: Partial<Record<DrumPiece, string>>; crashOnLoop: boolean };
  /** which drum kit suits the style: modern (Pearl), vintage (Ludwig 26", Porkpie snare) or brushes */
  kit: "modern" | "vintage" | "brushes";
  bass: BassSlot[] | "walking";
  guitar: { pattern: string; short?: boolean };
  keys: { pattern: string; voicing: "triad" | "seventh" | "shell"; short?: boolean };
  parts: { drums: boolean; bass: boolean; guitar: boolean; keys: boolean };
  mode: "major" | "minor";
  /** Roman numerals, one token per bar; "ii7|V7" splits a bar in half. */
  progressions: { major: string[]; minor: string[] };
}

const s = (step: number, role: BassRole, len: number, vel = 0.85): BassSlot => ({ step, role, len, vel });

export const STYLES: StyleDef[] = [
  {
    id: "rock",
    name: "Rock",
    description: "Driving eighths, backbeat snare",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 80, max: 170, default: 112 },
    swing: 0.5,
    swingUnit: "8th",
    feel: { kick: 0, snare: 4, hats: 2, bass: 2, guitar: 6, keys: 5, spread: 4 },
    drums: {
      bars: [
        { kick: "X.......x.x.....", snare: "....X.......X...", hihat: "x.o.x.o.x.o.x.o." },
        { kick: "X.....x.x.x.....", snare: "....X.......X..g", hihat: "x.o.x.o.x.o.x.o." },
      ],
      fill: { kick: "X.......x.......", snare: "....X...X.......", hihat: "x.o.x.o.x.o.....", tom1: "............Xx..", tom2: "..............X.", tom3: "...............X" },
      crashOnLoop: true,
    },
    kit: "modern",
    bass: [s(0, "R", 2, 0.95), s(2, "R", 2), s(4, "R", 2), s(6, "R", 2), s(8, "R", 2, 0.9), s(10, "R", 2), s(12, "5", 2), s(14, "approach", 2, 0.75)],
    guitar: { pattern: "D...D.U...U.D.U." },
    keys: { pattern: "X---------------", voicing: "triad" },
    parts: { drums: true, bass: true, guitar: true, keys: false },
    mode: "major",
    progressions: { major: ["I IV V IV", "I bVII IV I", "I V vi IV", "I I IV IV V V IV IV"], minor: ["i bVII bVI bVII", "i iv bVII i", "i bVI bIII bVII"] },
  },
  {
    id: "pop",
    name: "Pop",
    description: "Steady and modern, light sixteenths",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 75, max: 130, default: 100 },
    swing: 0.5,
    swingUnit: "16th",
    feel: { kick: 0, snare: 2, hats: 1, bass: 2, guitar: 4, keys: 3, spread: 3 },
    drums: {
      bars: [{ kick: "X.......X.x.....", snare: "....X.......X...", hihat: "xoxoxoxoxoxoxoxo" }],
      fill: { kick: "X.......X.......", snare: "....X.......XoXo", hihat: "xoxoxoxoxoxo...." },
      crashOnLoop: true,
    },
    kit: "modern",
    bass: [s(0, "R", 3, 0.95), s(3, "R", 1, 0.6), s(6, "R", 2), s(8, "R", 3, 0.9), s(11, "R", 1, 0.6), s(14, "5", 2, 0.75)],
    guitar: { pattern: "D...D.U...U.D.U." },
    keys: { pattern: "X-------x-------", voicing: "triad" },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "major",
    progressions: { major: ["I V vi IV", "vi IV I V", "I vi IV V", "IV I V vi"], minor: ["i bVI bIII bVII", "i iv bVI bVII"] },
  },
  {
    id: "blues",
    name: "Blues shuffle",
    description: "12-bar shuffle with a boogie bass",
    meter: { beats: 4, stepsPerBeat: 3, label: "12/8 shuffle" },
    tempo: { min: 70, max: 150, default: 96 },
    swing: 0.5,
    swingUnit: "8th",
    feel: { kick: 2, snare: 12, hats: 6, bass: 7, guitar: 10, keys: 8, spread: 6 },
    drums: {
      bars: [{ kick: "X.....X.....", snare: "...X.....X..", hihat: "x.ox.ox.ox.o" }],
      fill: { kick: "X.....X.....", snare: "...X.....XoX", hihat: "x.ox.ox.o...", tom1: "..........X.", tom3: "...........X" },
      crashOnLoop: true,
    },
    kit: "vintage",
    bass: [s(0, "R", 2, 0.95), s(2, "3", 1, 0.7), s(3, "5", 2, 0.85), s(5, "6", 1, 0.7), s(6, "b7", 2, 0.85), s(8, "6", 1, 0.7), s(9, "5", 2, 0.85), s(11, "3", 1, 0.7)],
    guitar: { pattern: "D.uD.uD.uD.u", short: true },
    keys: { pattern: "...x.....x..", voicing: "seventh", short: true },
    parts: { drums: true, bass: true, guitar: true, keys: false },
    mode: "major",
    progressions: {
      major: ["I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7", "I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7"],
      minor: ["i7 i7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7"],
    },
  },
  {
    id: "slowblues",
    name: "Slow blues",
    description: "12/8 slow burner, triplet feel",
    meter: { beats: 4, stepsPerBeat: 3, label: "12/8" },
    tempo: { min: 45, max: 80, default: 60 },
    swing: 0.5,
    swingUnit: "8th",
    feel: { kick: 4, snare: 14, hats: 8, bass: 8, guitar: 12, keys: 10, spread: 7 },
    drums: {
      bars: [{ kick: "X.....X..X..", snare: "...X.....X..", hihat: "xooxooxooxoo" }],
      fill: { kick: "X.....X.....", snare: "...X.....ooo", hihat: "xooxooxoo...", tom1: "......XX....", tom3: ".........XXX" },
      crashOnLoop: true,
    },
    kit: "vintage",
    bass: [s(0, "R", 3, 0.95), s(3, "3", 3, 0.8), s(6, "5", 3, 0.85), s(9, "6", 2, 0.75), s(11, "approach", 1, 0.65)],
    guitar: { pattern: "d..d..d..d..", short: false },
    keys: { pattern: "X-----------", voicing: "seventh" },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "major",
    progressions: {
      major: ["I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7", "I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7"],
      minor: ["i7 i7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7"],
    },
  },
  {
    id: "jazz",
    name: "Jazz swing",
    description: "Ride cymbal, walking bass, comping",
    meter: { beats: 4, stepsPerBeat: 3, label: "4/4 swing" },
    tempo: { min: 90, max: 240, default: 140 },
    swing: 0.5,
    swingUnit: "8th",
    feel: { kick: 0, snare: 6, hats: -2, bass: -3, guitar: 4, keys: 8, spread: 7 },
    drums: {
      bars: [
        { ride: "x..x.xx..x.x", pedalhat: "...x.....x..", kick: "g..g..g..g.." },
        { ride: "x..x.xx..x.x", pedalhat: "...x.....x..", kick: "g..g..g..g..", snare: ".......g...." },
      ],
      fill: { ride: "x..x.xx..x..", pedalhat: "...x.....x..", snare: "......o.oo.X", kick: "g..g..g....." },
      crashOnLoop: false,
    },
    kit: "brushes",
    bass: "walking",
    guitar: { pattern: "d..d..d..d..", short: true },
    keys: { pattern: "X....x......", voicing: "shell", short: true },
    parts: { drums: true, bass: true, guitar: false, keys: true },
    mode: "major",
    progressions: {
      major: ["ii7 V7 Imaj7 Imaj7", "Imaj7 vi7 ii7 V7", "iii7 vi7 ii7 V7", "Imaj7 IV7 iii7 VI7 ii7 V7 Imaj7 Imaj7"],
      minor: ["iiø7 V7 i7 i7", "i7 iv7 bVII7 bIIImaj7 bVImaj7 iiø7 V7 i7"],
    },
  },
  {
    id: "funk",
    name: "Funk",
    description: "Syncopated kick, ghost notes, scratchy guitar",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 85, max: 125, default: 100 },
    swing: 0.54,
    swingUnit: "16th",
    feel: { kick: 0, snare: 2, hats: 0, bass: 0, guitar: 2, keys: 2, spread: 2 },
    drums: {
      bars: [
        { kick: "X..x..X...X..x..", snare: "....X..g.g..X..g", hihat: "XoxoXoxoXoxoXoxo" },
        { kick: "X..x..X...X.x...", snare: "....X..g.g..X.gg", hihat: "XoxoXoxoXoxoXo.o", openhat: "..............x." },
      ],
      fill: { kick: "X..x..X.........", snare: "....X..g.g..XgXX", hihat: "XoxoXoxoXoxo...." },
      crashOnLoop: false,
    },
    kit: "modern",
    bass: [s(0, "R", 1, 1), s(3, "8", 1, 0.8), s(6, "R", 1, 0.85), s(7, "b7", 1, 0.7), s(10, "5", 1, 0.85), s(12, "R", 1, 0.6), s(14, "8", 1, 0.8)],
    guitar: { pattern: "x.d.u.dux.d.u.du", short: true },
    keys: { pattern: "...x......x.....", voicing: "seventh", short: true },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "minor",
    progressions: { major: ["I7 I7 IV7 I7", "I9 I9 IV9 IV9"], minor: ["i7 i7 i7 i7", "i7 IV7 i7 IV7", "i7 i7 iv7 bVII7"] },
  },
  {
    id: "soul",
    name: "Soul / R&B",
    description: "Laid-back pocket, warm keys",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 60, max: 100, default: 80 },
    swing: 0.58,
    swingUnit: "16th",
    feel: { kick: 2, snare: 10, hats: 4, bass: 6, guitar: 8, keys: 8, spread: 4 },
    drums: {
      bars: [{ kick: "X......xX.......", snare: "....X.......X...", hihat: "x.x.x.x.x.x.x.x." }],
      fill: { kick: "X......xX.......", snare: "....X.......X.oo", hihat: "x.x.x.x.x.x....." },
      crashOnLoop: false,
    },
    kit: "vintage",
    bass: [s(0, "R", 3, 0.95), s(6, "R", 1, 0.6), s(7, "5", 1, 0.75), s(8, "R", 2, 0.85), s(11, "b7", 2, 0.7), s(14, "approach", 2, 0.65)],
    guitar: { pattern: "....d.......d...", short: true },
    keys: { pattern: "X-----x-------x-", voicing: "seventh" },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "major",
    progressions: { major: ["Imaj7 vi7 ii7 V7", "I vi IV V", "Imaj7 IVmaj7 iii7 vi7"], minor: ["i7 iv7 bVIImaj7 bIIImaj7", "i7 bVImaj7 iv7 V7"] },
  },
  {
    id: "reggae",
    name: "Reggae",
    description: "One-drop beat, off-beat skank",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 60, max: 95, default: 74 },
    swing: 0.55,
    swingUnit: "8th",
    feel: { kick: 4, snare: 6, hats: 4, bass: 10, guitar: 6, keys: 6, spread: 4 },
    drums: {
      bars: [{ kick: "........X.......", sidestick: "........X.......", hihat: "x.x.x.x.x.x.x.x." }],
      fill: { kick: "........X.......", sidestick: "........X.......", hihat: "x.x.x.x.x.x.x...", snare: "............X.XX" },
      crashOnLoop: false,
    },
    kit: "vintage",
    bass: [s(0, "R", 3, 0.95), s(6, "5", 2, 0.75), s(8, "R", 3, 0.9), s(14, "b7", 2, 0.7)],
    guitar: { pattern: "....d.......d...", short: true },
    keys: { pattern: "..x...x...x...x.", voicing: "triad", short: true },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "major",
    progressions: { major: ["I IV I V", "I V IV V", "I vi IV V"], minor: ["i iv i v", "i bVII i bVII"] },
  },
  {
    id: "country",
    name: "Country",
    description: "Train beat, root–fifth bass, boom-chick guitar",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 90, max: 180, default: 120 },
    swing: 0.5,
    swingUnit: "8th",
    feel: { kick: 0, snare: 2, hats: 1, bass: 1, guitar: 3, keys: 3, spread: 3 },
    drums: {
      bars: [{ kick: "X.......X.......", snare: "....X.......X...", hihat: "xoxoxoxoxoxoxoxo" }],
      fill: { kick: "X.......X.......", snare: "....X.......XoXo", hihat: "xoxoxoxoxoxo...." },
      crashOnLoop: true,
    },
    kit: "vintage",
    bass: [s(0, "R", 4, 0.95), s(8, "5", 4, 0.85)],
    guitar: { pattern: "b...d...b...d..." },
    keys: { pattern: "....x.......x...", voicing: "triad", short: true },
    parts: { drums: true, bass: true, guitar: true, keys: false },
    mode: "major",
    progressions: { major: ["I I IV IV I I V V", "I IV I V"], minor: ["i iv i V"] },
  },
  {
    id: "bossa",
    name: "Bossa nova",
    description: "Cross-stick clave, gentle and syncopated",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 100, max: 160, default: 130 },
    swing: 0.5,
    swingUnit: "16th",
    feel: { kick: 0, snare: 2, hats: 0, bass: 2, guitar: 3, keys: 4, spread: 3 },
    drums: {
      bars: [
        { kick: "X..xX..xX..xX..x", sidestick: "x..x..x...x..x..", hihat: "xoxoxoxoxoxoxoxo" },
        { kick: "X..xX..xX..xX..x", sidestick: "..x..x...x..x...", hihat: "xoxoxoxoxoxoxoxo" },
      ],
      fill: { kick: "X..xX..xX..xX..x", sidestick: "..x..x...x..x.x.", hihat: "xoxoxoxoxoxoxoxo" },
      crashOnLoop: false,
    },
    kit: "brushes",
    bass: [s(0, "R", 6, 0.9), s(6, "5", 2, 0.7), s(8, "5", 6, 0.85), s(14, "R", 2, 0.7)],
    guitar: { pattern: "d..d..d...d..d.." , short: true },
    keys: { pattern: "", voicing: "seventh" },
    parts: { drums: true, bass: true, guitar: true, keys: false },
    mode: "major",
    progressions: { major: ["Imaj7 Imaj7 ii7 V7", "Imaj7 vi7 ii7 V7", "Imaj7 IV7 iii7 VI7"], minor: ["i7 i7 iv7 iv7 iiø7 V7 i7 i7"] },
  },
  {
    id: "disco",
    name: "Disco",
    description: "Four on the floor, octave bass",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 105, max: 130, default: 118 },
    swing: 0.5,
    swingUnit: "16th",
    feel: { kick: 0, snare: 1, hats: 0, bass: 0, guitar: 1, keys: 1, spread: 2 },
    drums: {
      bars: [{ kick: "X...X...X...X...", snare: "....X.......X...", hihat: "x...x...x...x...", openhat: "..x...x...x...x." }],
      fill: { kick: "X...X...X...X...", snare: "....X.......XXXX", hihat: "x...x...x.......", openhat: "..x...x...x....." },
      crashOnLoop: true,
    },
    kit: "modern",
    bass: [s(0, "R", 2, 0.95), s(2, "8", 2, 0.8), s(4, "R", 2, 0.9), s(6, "8", 2, 0.8), s(8, "R", 2, 0.9), s(10, "8", 2, 0.8), s(12, "R", 2, 0.9), s(14, "8", 2, 0.8)],
    guitar: { pattern: "x.d.x.d.x.d.x.d.", short: true },
    keys: { pattern: "..x...x...x...x.", voicing: "seventh", short: true },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "minor",
    progressions: { major: ["I I IV IV", "vi ii V I"], minor: ["i7 iv7", "i7 i7 bVII bVII"] },
  },
  {
    id: "metal",
    name: "Metal",
    description: "Palm-muted chugs, driving double-time",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 100, max: 190, default: 150 },
    swing: 0.5,
    swingUnit: "16th",
    feel: { kick: 0, snare: 1, hats: 0, bass: 0, guitar: 0, keys: 0, spread: 2 },
    drums: {
      bars: [{ kick: "X.x.X.x.X.x.X.x.", snare: "....X.......X...", ride: "x.x.x.x.x.x.x.x." }],
      fill: { kick: "XxXxXxXxXxXx....", snare: "....X.......XXXX", ride: "x.x.x.x.x.x....." },
      crashOnLoop: true,
    },
    kit: "modern",
    bass: [s(0, "R", 2, 1), s(2, "R", 2), s(4, "R", 2), s(6, "R", 2), s(8, "R", 2), s(10, "R", 2), s(12, "R", 2), s(14, "R", 2)],
    guitar: { pattern: "P.P.P.P.P.P.P.P.", short: true },
    keys: { pattern: "", voicing: "triad" },
    parts: { drums: true, bass: true, guitar: true, keys: false },
    mode: "minor",
    progressions: { major: ["I5 bVII5 bVI5 bVII5"], minor: ["i5 i5 bVI5 bVII5", "i5 bII5 i5 bVII5", "i5 bVI5 bIII5 bVII5"] },
  },
  {
    id: "lofi",
    name: "Lo-fi",
    description: "Lazy swung hip-hop beat, jazzy chords",
    meter: { beats: 4, stepsPerBeat: 4, label: "4/4" },
    tempo: { min: 65, max: 92, default: 80 },
    swing: 0.62,
    swingUnit: "16th",
    feel: { kick: 6, snare: 16, hats: 8, bass: 10, guitar: 10, keys: 12, spread: 8 },
    drums: {
      bars: [
        { kick: "X......x..X.....", snare: "....X.......X...", hihat: "x.x.x.x.x.x.x.xo" },
        { kick: "X.........X..x..", snare: "....X.......X..g", hihat: "x.x.x.x.x.x.x.x." },
      ],
      fill: { kick: "X......x..X.....", snare: "....X.......X.g.", hihat: "x.x.x.x.x.x....." },
      crashOnLoop: false,
    },
    kit: "vintage",
    bass: [s(0, "R", 4, 0.85), s(7, "5", 2, 0.65), s(10, "R", 4, 0.75)],
    guitar: { pattern: "0.1.2.3.2.3.1.2." },
    keys: { pattern: "X-------x-------", voicing: "seventh" },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "major",
    progressions: { major: ["Imaj7 vi7 ii7 V7", "IVmaj7 iii7 ii7 Imaj7"], minor: ["i7 iv7 bVII7 bIIImaj7", "i9 iv9 i9 V7"] },
  },
  {
    id: "ballad68",
    name: "6/8 ballad",
    description: "Rolling 6/8 with fingerpicked guitar",
    meter: { beats: 2, stepsPerBeat: 3, label: "6/8" },
    tempo: { min: 40, max: 80, default: 56 },
    swing: 0.5,
    swingUnit: "8th",
    feel: { kick: 2, snare: 8, hats: 4, bass: 4, guitar: 6, keys: 6, spread: 5 },
    drums: {
      bars: [{ kick: "X.....", snare: "...X..", hihat: "xooxoo" }],
      fill: { kick: "X.....", snare: "...Xoo", hihat: "xoo...", tom1: "....X.", tom3: ".....X" },
      crashOnLoop: true,
    },
    kit: "brushes",
    bass: [s(0, "R", 3, 0.9), s(3, "5", 3, 0.75)],
    guitar: { pattern: "012321" },
    keys: { pattern: "X-----", voicing: "triad" },
    parts: { drums: true, bass: true, guitar: true, keys: true },
    mode: "major",
    progressions: { major: ["I I V V vi vi IV IV", "I IV I V"], minor: ["i i bVI bVI bIII bIII bVII bVII"] },
  },
  {
    id: "waltz",
    name: "Waltz",
    description: "3/4 oom-pah-pah",
    meter: { beats: 3, stepsPerBeat: 4, label: "3/4" },
    tempo: { min: 84, max: 180, default: 120 },
    swing: 0.5,
    swingUnit: "8th",
    feel: { kick: 0, snare: 3, hats: 1, bass: 1, guitar: 4, keys: 3, spread: 3 },
    drums: {
      bars: [{ kick: "X...........", snare: "....o...o...", hihat: "x...x...x..." }],
      fill: { kick: "X...........", snare: "....o...ooXX", hihat: "x...x......." },
      crashOnLoop: true,
    },
    kit: "brushes",
    bass: [s(0, "R", 4, 0.9), s(4, "5", 4, 0.6), s(8, "5", 4, 0.6)],
    guitar: { pattern: "b...d...d..." },
    keys: { pattern: "....x...x...", voicing: "triad", short: true },
    parts: { drums: true, bass: true, guitar: true, keys: false },
    mode: "major",
    progressions: { major: ["I I IV IV V V I I", "I vi ii V"], minor: ["i iv V i"] },
  },
];

export const STYLE_BY_ID: Record<string, StyleDef> = Object.fromEntries(STYLES.map((st) => [st.id, st]));
export const stepsPerBar = (st: StyleDef) => st.meter.beats * st.meter.stepsPerBeat;
