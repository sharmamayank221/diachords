// How hard the band is playing, and how that changes the parts.
//
// Each pass of the loop is a song section with an energy from 0 (barely there) to 1 (full
// out). "Evolving" walks through verse → build → chorus → breakdown; the other modes hold
// one energy. Energy then reshapes the style's grids: quarter-note hats and sidesticks when
// it's quiet, ride cymbal, extra kicks, octave pops and pushed chords when it's loud, and
// fills that know where the phrase ends. All choices go through the position-addressed RNG,
// so a given seed and pass always sounds the same (live and in export).

import type { BassSlot, DrumPiece, StyleDef } from "./styles";
import { stepsPerBar } from "./styles";

export type EnergyMode = "auto" | "chill" | "groove" | "drive";
export interface Section {
  name: string;
  energy: number;
}

export const ENERGY_MODES: { id: EnergyMode; label: string; hint: string }[] = [
  { id: "auto", label: "Evolving", hint: "Verse, build, chorus and breakdown, like a song" },
  { id: "chill", label: "Chill", hint: "Laid back and sparse" },
  { id: "groove", label: "Groove", hint: "The style's normal pocket" },
  { id: "drive", label: "Drive", hint: "Full band, pushing hard" },
];

const PLAN: Section[] = [
  { name: "Verse", energy: 0.45 },
  { name: "Verse", energy: 0.5 },
  { name: "Build", energy: 0.64 },
  { name: "Chorus", energy: 0.85 },
  { name: "Chorus", energy: 0.9 },
  { name: "Breakdown", energy: 0.3 },
  { name: "Build", energy: 0.62 },
  { name: "Chorus", energy: 0.95 },
];
const FIXED: Record<Exclude<EnergyMode, "auto">, Section> = {
  chill: { name: "Chill", energy: 0.3 },
  groove: { name: "Groove", energy: 0.55 },
  drive: { name: "Drive", energy: 0.88 },
};

export function sectionFor(mode: EnergyMode | undefined, cycle: number): Section {
  if (mode && mode !== "auto") return FIXED[mode];
  return PLAN[((cycle % PLAN.length) + PLAN.length) % PLAN.length];
}

/** Velocity multiplier for a section's energy. */
export const energyGain = (e: number) => 0.6 + 0.45 * e;

type Grid = Partial<Record<DrumPiece, string>>;
type Rand = (salt: string) => number;

const mapSteps = (s: string, fn: (c: string, i: number) => string) => s.split("").map(fn).join("");
const hasHits = (s: string | undefined) => !!s && /[^.]/.test(s);
function setPiece(g: Grid, piece: DrumPiece, pattern: string | undefined) {
  if (hasHits(pattern)) g[piece] = pattern;
  else delete g[piece];
}
function mergeSteps(a: string | undefined, b: string, n: number) {
  const base = a ?? ".".repeat(n);
  return mapSteps(base, (c, i) => (c !== "." ? c : b[i] ?? "."));
}

// styles whose hats move to the ride for a chorus
const RIDE_IN_CHORUS = new Set(["rock", "pop", "country", "soul", "blues", "slowblues", "lofi", "ballad68", "waltz"]);

/** Reshape one bar of the style's drum grid for the section's energy. */
export function varyDrums(style: StyleDef, base: Grid, section: Section, r: Rand): Grid {
  const n = stepsPerBar(style);
  const spb = style.meter.stepsPerBeat;
  const e = section.energy;
  const g: Grid = { ...base };

  if (e < 0.4) {
    // quiet: quarter-note time, kick on the strong beats, snare becomes a sidestick
    for (const p of ["hihat", "ride", "openhat"] as DrumPiece[]) if (g[p]) setPiece(g, p, mapSteps(g[p]!, (c, i) => (c !== "." && i % spb === 0 ? "o" : ".")));
    if (g.kick) setPiece(g, "kick", mapSteps(g.kick, (c, i) => (c !== "." && (i === 0 || (section.name !== "Breakdown" && i % (spb * 2) === 0)) ? c : ".")));
    if (g.snare && style.id !== "metal") {
      const backbeat = mapSteps(g.snare, (c) => (c === "X" || c === "x" ? "x" : "."));
      delete g.snare;
      setPiece(g, "sidestick", mergeSteps(g.sidestick, backbeat, n));
    }
    return g;
  }

  if (e < 0.55) {
    // verse: lighter hats between the beats
    for (const p of ["hihat", "ride"] as DrumPiece[]) if (g[p]) setPiece(g, p, mapSteps(g[p]!, (c, i) => (c === "x" && i % spb !== 0 ? "o" : c)));
  }

  addPercussion(style, g, section, n, spb, r);

  if (e >= 0.75) {
    if (g.hihat && !g.ride && RIDE_IN_CHORUS.has(style.id)) {
      setPiece(g, "ride", mapSteps(g.hihat, (c) => (c === "." ? "." : "x")));
      delete g.hihat;
    } else {
      for (const p of ["hihat", "ride"] as DrumPiece[]) if (g[p]) setPiece(g, p, mapSteps(g[p]!, (c) => (c === "o" ? "x" : c)));
    }
    // an extra kick on an empty eighth, away from the backbeat
    if (g.kick && spb === 4 && r("xkick") < (e - 0.65) * 1.6) {
      const snare = g.snare ?? "";
      const spots = Array.from({ length: n }, (_, i) => i).filter((i) => i > 0 && i % 2 === 0 && g.kick![i] === "." && (snare[i] ?? ".") === ".");
      if (spots.length) {
        const at = spots[Math.floor(r("xkickpos") * spots.length)];
        g.kick = mapSteps(g.kick, (c, i) => (i === at ? "x" : c));
      }
    }
    // open hat lift on the "and" of the last beat
    if ((style.id === "funk" || style.id === "disco") && g.hihat && r("openlift") < 0.5) {
      const at = n - 2;
      g.hihat = mapSteps(g.hihat, (c, i) => (i === at ? "." : c));
      setPiece(g, "openhat", mapSteps(g.openhat ?? ".".repeat(n), (c, i) => (i === at ? "x" : c)));
    }
    // jazz: busier snare comping
    if (style.id === "jazz") {
      const comp = mapSteps(".".repeat(n), (_, i) => (i % 3 === 2 && r(`comp${i}`) < 0.3 ? (r(`compv${i}`) < 0.5 ? "g" : "o") : "."));
      setPiece(g, "snare", mergeSteps(g.snare, comp, n));
    }
  }
  return g;
}

const TAMBOURINE = new Set(["rock", "pop", "soul", "country", "blues", "slowblues", "ballad68"]);
const CLAP = new Set(["disco", "pop", "funk"]);
const SHAKER = new Set(["bossa", "reggae", "lofi", "pop"]);

/** Hand percussion that comes and goes with the energy (added before the fill is cut in). */
function addPercussion(style: StyleDef, g: Grid, section: Section, n: number, spb: number, r: Rand) {
  const e = section.energy;
  const backbeat = mapSteps(g.snare ?? g.sidestick ?? ".".repeat(n), (c) => (c === "X" || c === "x" ? "x" : "."));
  if (e >= 0.75 && TAMBOURINE.has(style.id)) {
    // backbeats, plus eighths for pop
    const eighths = style.id === "pop" && spb === 4 ? mapSteps(".".repeat(n), (_, i) => (i % 2 === 0 ? "g" : ".")) : ".".repeat(n);
    setPiece(g, "tambourine", mergeSteps(backbeat, eighths, n));
  }
  if (e >= 0.75 && CLAP.has(style.id)) setPiece(g, "clap", backbeat);
  if (e >= 0.4 && SHAKER.has(style.id) && !(style.id === "pop" && e >= 0.75)) {
    setPiece(g, "shaker", mapSteps(".".repeat(n), (_, i) => (i % spb === 0 ? "o" : "g")));
  }
  if (style.id === "disco" && e >= 0.85 && r("cowbell") < 0.6) setPiece(g, "cowbell", mapSteps(".".repeat(n), (_, i) => (i % spb === 0 ? "o" : ".")));
}

export type FillKind = "none" | "small" | "big" | "build";

/** Where fills go: end of 4-bar phrases (small), end of the pass (big), into a louder section (build). */
export function fillKind(bars: number, bar: number, cycle: number, mode: EnergyMode | undefined, rr: (salt: string, bar: number) => number): FillKind {
  const sec = sectionFor(mode, cycle);
  const next = sectionFor(mode, cycle + 1);
  if (bar === bars - 1) {
    if (next.energy - sec.energy > 0.12) return "build";
    if (bars >= 8 || cycle % 2 === 1 || next.name !== sec.name) return "big";
    return sec.energy >= 0.4 && rr("endfill", bar) < 0.5 ? "small" : "none";
  }
  if ((bar + 1) % 4 === 0 && sec.energy >= 0.35 && rr("phrasefill", bar) < 0.2 + sec.energy * 0.4) return "small";
  return "none";
}

/** The last beat (small) or last two beats (big/build) become a fill; the start of the bar stays. */
export function fillGrid(style: StyleDef, base: Grid, kind: Exclude<FillKind, "none">, energy: number, r: Rand): Grid {
  const n = stepsPerBar(style);
  const spb = style.meter.stepsPerBeat;
  const beats = style.meter.beats;
  if (kind === "big" && r("stylefill") < 0.45) return style.drums.fill;
  const len = kind === "small" || beats <= 2 ? spb : spb * 2;
  const from = n - len;
  const g: Grid = {};
  for (const [p, s] of Object.entries(base) as [DrumPiece, string][]) setPiece(g, p, s.slice(0, from) + ".".repeat(len));
  if (g.kick) g.kick = mapSteps(g.kick, (c, i) => (i === from ? "x" : c));

  const dense = spb === 3 || energy >= 0.6 || kind === "build";
  const hit = (k: number) => dense || k % 2 === 0;
  const ramp = (k: number) => {
    const v = len === 1 ? 1 : k / (len - 1);
    return v < 0.34 ? "o" : v < 0.75 ? "x" : "X";
  };
  const write = (piece: DrumPiece, k: number, c: string) => {
    const cur = g[piece] ?? ".".repeat(n);
    g[piece] = mapSteps(cur, (ch, i) => (i === from + k ? c : ch));
  };

  const variant = kind === "build" ? "roll" : (["toms", "mixed", "roll"] as const)[Math.floor(r("fillvar") * 3)];
  for (let k = 0; k < len; k++) {
    if (!hit(k)) continue;
    if (variant === "roll") write("snare", k, ramp(k));
    else if (variant === "toms") write(k < len / 3 ? "tom1" : k < (2 * len) / 3 ? "tom2" : "tom3", k, k === len - 1 ? "X" : "x");
    else write(k < len / 2 ? "snare" : k < (3 * len) / 4 ? "tom1" : "tom3", k, ramp(k));
  }
  // builds drive the kick on every beat underneath the roll
  if (kind === "build") for (let k = 0; k < len; k += spb) write("kick", k, "x");
  return g;
}

/** Bass: two-feel / long notes when quiet, octave pops when loud. "two" = jazz two-feel. */
export function bassSlotsFor(style: StyleDef, energy: number, r: Rand): BassSlot[] | "walking" | "two" {
  const n = stepsPerBar(style);
  if (style.bass === "walking") return energy < 0.4 ? "two" : "walking";
  const slots = style.bass;
  if (energy < 0.4 && slots.length > 2) {
    const half = style.meter.beats % 2 === 0 ? n / 2 : n;
    const out: BassSlot[] = [{ step: 0, role: "R", len: half, vel: 0.8 }];
    if (half < n) out.push({ step: half, role: "5", len: half, vel: 0.68 });
    return out;
  }
  if (energy >= 0.75 && style.id !== "metal" && style.id !== "disco") {
    const out: BassSlot[] = [];
    for (const s of slots) {
      if (s.role === "R" && s.len >= 2 && s.len % 2 === 0 && r(`pop${s.step}`) < 0.35) {
        out.push({ ...s, len: s.len / 2 }, { step: s.step + s.len / 2, role: "8", len: s.len / 2, vel: s.vel * 0.85 });
      } else out.push(s);
    }
    return out;
  }
  return slots;
}

/** Guitar strum grid for this bar. */
export function guitarPatternFor(style: StyleDef, energy: number, section: Section, r: Rand): string {
  const base = style.guitar.pattern;
  if (!base) return base;
  const n = stepsPerBar(style);
  const spb = style.meter.stepsPerBeat;
  const strummed = /[DU]/i.test(base) && !/[bxP]/.test(base) && !style.guitar.short;
  const arpeggio = /[0-5]/.test(base);

  if (energy < 0.4) {
    if (arpeggio) return base;
    if (strummed) {
      if (section.name === "Breakdown" || energy < 0.32) {
        // gentle picked arpeggio across the chord
        const seq = spb === 4 ? [0, 2, 3, 4, 5, 4, 3, 2] : [0, 2, 3, 4, 3, 2];
        const every = spb === 4 ? 2 : 1;
        let k = 0;
        return mapSteps(".".repeat(n), (_, i) => (i % every === 0 ? String(seq[k++ % seq.length]) : "."));
      }
      // let the chord ring: one strum per half bar
      const half = style.meter.beats % 2 === 0 ? n / 2 : n;
      return mapSteps(".".repeat(n), (_, i) => (i % half === 0 ? "D" : "."));
    }
    // choppy styles keep their rhythm, softer; metal chugs on the beat only
    return mapSteps(base.replace(/D/g, "d").replace(/U/g, "u"), (c, i) => (c === "P" && i % spb !== 0 ? "." : c));
  }

  if (energy >= 0.75) {
    if (style.id === "metal" && n === 16 && r("gallop") < 0.5) return "P.PPP.PPP.PPP.PP";
    let p = base.replace(/d/g, "D").replace(/u/g, "U");
    if (strummed && spb === 4) p = mapSteps(p, (c, i) => (c === "." && i % 4 === 2 ? "u" : c));
    return p;
  }
  return base;
}

/** Keys: held pads when quiet, an extra push when loud. */
export function keysPatternFor(style: StyleDef, energy: number): string {
  const base = style.keys.pattern;
  if (!base) return base;
  const n = stepsPerBar(style);
  if (energy < 0.4) return style.keys.short ? base.replace(/X/g, "x") : "X" + "-".repeat(n - 1);
  if (energy >= 0.75 && /^X-+$/.test(base)) return mapSteps(base, (c, i) => (i === n / 2 ? "x" : c));
  return base;
}
