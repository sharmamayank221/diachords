// Compile an arrangement into concrete note events for one pass of the loop.
// Positions are in beats from the start of the pass (already swung); `offsetMs` carries the
// style's micro-timing and humanisation so tempo changes never disturb the feel.

import { Arrangement, PartId, totalBeats } from "./arrangement";
import { DrumPiece, STYLE_BY_ID, StyleDef, stepsPerBar } from "./styles";
import { ParsedChord, parseChord } from "./theory";
import { jitter, rand } from "./rng";
import { findChord } from "@/helpers/chordSearch";
import { getChordStringNotes } from "@/helpers/chordNotes";

export interface JamEvent {
  part: PartId;
  beat: number;
  offsetMs: number;
  dur: number; // beats
  vel: number; // 0..1
  midi?: number;
  piece?: DrumPiece;
  string?: number; // guitar string 0 (low E) … 5 (high e), for cutting ringing strings
}

export interface CompiledPass {
  events: JamEvent[];
  lengthBeats: number;
  beatsPerBar: number;
  /** first beat of each chord, for the UI */
  chordStarts: { beat: number; index: number }[];
}

const DRUM_VEL: Record<string, number> = { X: 1, x: 0.8, o: 0.5, g: 0.28 };
const DRUM_GROUP: Record<DrumPiece, "kick" | "snare" | "hats"> = {
  kick: "kick", snare: "snare", sidestick: "snare", tom1: "snare", tom2: "snare", tom3: "snare",
  hihat: "hats", pedalhat: "hats", openhat: "hats", ride: "hats", ridebell: "hats", crash: "hats",
};

// Piecewise-linear swing: the off-beat (8th or 16th) moves from 50% toward `ratio`
export function swingBeat(beat: number, style: StyleDef): number {
  if (style.meter.stepsPerBeat !== 4 || style.swing <= 0.5) return beat;
  const unit = style.swingUnit === "8th" ? 1 : 0.5;
  const whole = Math.floor(beat / unit) * unit;
  const local = (beat - whole) / unit;
  const r = style.swing;
  const mapped = local < 0.5 ? local * (r / 0.5) : r + (local - 0.5) * ((1 - r) / 0.5);
  return whole + mapped * unit;
}

// ── Voicings ──────────────────────────────────────────────────────────────────

const guitarCache = new Map<string, (number | null)[]>();
function guitarStrings(chord: string, parsed: ParsedChord): (number | null)[] {
  const cached = guitarCache.get(chord);
  if (cached) return cached;
  const item = findChord(chord);
  const pos = item?.positions[0];
  let strings: (number | null)[];
  if (pos) {
    strings = getChordStringNotes(pos.frets, pos.baseFret, item?.key).map((n) => n.midi);
  } else {
    // no library shape: a simple root-position voicing from the 5th string
    const root = 45 + ((parsed.rootPc - 9 + 12) % 12);
    strings = [null, root, ...parsed.intervals.slice(1, 4).map((i) => root + i), root + 12].slice(0, 6);
    while (strings.length < 6) strings.push(null);
  }
  guitarCache.set(chord, strings);
  return strings;
}

function keysVoicing(parsed: ParsedChord, kind: "triad" | "seventh" | "shell", prev: number[] | null): number[] {
  let tones: number[];
  if (kind === "shell") tones = [parsed.third ?? 5, parsed.seventh ?? 9, 14];
  else if (kind === "seventh") tones = parsed.seventh !== null ? [0, parsed.third ?? 5, parsed.fifth, parsed.seventh] : [0, parsed.third ?? 5, parsed.fifth, 12];
  else tones = [0, parsed.third ?? 5, parsed.fifth];
  const pcs = tones.map((t) => (parsed.rootPc + t) % 12);
  // try every inversion in the middle register; keep the one that moves least from the last chord
  let best: number[] = [];
  let bestCost = Infinity;
  for (let rot = 0; rot < pcs.length; rot++) {
    const order = [...pcs.slice(rot), ...pcs.slice(0, rot)];
    for (let low = 52; low <= 64; low++) {
      if (low % 12 !== order[0]) continue;
      const v = [low];
      for (const pc of order.slice(1)) {
        let n = v[v.length - 1] + 1;
        while (n % 12 !== pc) n++;
        v.push(n);
      }
      if (v[v.length - 1] > 79) continue;
      const centre = v.reduce((a, b) => a + b, 0) / v.length;
      const cost = prev ? v.reduce((sum, n, i) => sum + Math.abs(n - (prev[i] ?? prev[prev.length - 1])), 0) : Math.abs(centre - 62);
      if (cost < bestCost) {
        bestCost = cost;
        best = v;
      }
    }
  }
  return best;
}

// ── Compile ──────────────────────────────────────────────────────────────────

export function compilePass(arr: Arrangement, cycle: number): CompiledPass {
  const style = STYLE_BY_ID[arr.style];
  const spb = style.meter.stepsPerBeat;
  const beatsPerBar = style.meter.beats;
  const barSteps = stepsPerBar(style);
  const length = totalBeats(arr);
  const bars = Math.ceil(length / beatsPerBar);
  const seed = arr.seed;
  const events: JamEvent[] = [];

  const parsed = arr.chords.map((c) => parseChord(c.chord) ?? parseChord("C")!);
  const starts: number[] = [];
  arr.chords.reduce((b, c) => (starts.push(b), b + c.beats), 0);
  const chordIndexAt = (beat: number) => {
    let i = 0;
    while (i + 1 < starts.length && starts[i + 1] <= beat + 1e-6) i++;
    return i;
  };
  const chordAt = (beat: number) => parsed[chordIndexAt(((beat % length) + length) % length)];
  const feel = style.feel;
  const human = (base: number, beat: number, salt: string, voice = 0) => base + jitter(seed, cycle, beat, salt, voice) * feel.spread;

  // fills: every pass for long forms, every other pass for short loops
  const fillThisPass = bars >= 8 || cycle % 2 === 1;
  const filledLastPass = cycle > 0 && (bars >= 8 || (cycle - 1) % 2 === 1);

  // ── drums ──
  if (arr.parts.drums) {
    for (let bar = 0; bar < bars; bar++) {
      const isLast = bar === bars - 1;
      const grid = isLast && fillThisPass ? style.drums.fill : style.drums.bars[bar % style.drums.bars.length];
      for (const [piece, pattern] of Object.entries(grid) as [DrumPiece, string][]) {
        for (let step = 0; step < Math.min(pattern.length, barSteps); step++) {
          const v = DRUM_VEL[pattern[step]];
          if (!v) continue;
          const beat = bar * beatsPerBar + step / spb;
          if (pattern[step] === "g" && rand(seed, cycle, beat, `ghost-${piece}`) < 0.15) continue;
          events.push({
            part: "drums",
            piece,
            beat: swingBeat(beat, style),
            offsetMs: human(feel[DRUM_GROUP[piece]], beat, piece),
            dur: 0.25,
            vel: Math.min(1, v * (1 + jitter(seed, cycle, beat, `vel-${piece}`) * 0.08)),
          });
        }
      }
    }
    if (style.drums.crashOnLoop && filledLastPass) {
      events.push({ part: "drums", piece: "crash", beat: 0, offsetMs: feel.hats, dur: 2, vel: 0.85 });
    }
  }

  // ── bass ──
  if (arr.parts.bass) {
    let prev = 40;
    const nearest = (pc: number, around: number, lo = 28, hi = 52) => {
      let best = lo + ((pc - lo + 120) % 12);
      for (let n = best; n <= hi; n += 12) if (Math.abs(n - around) < Math.abs(best - around)) best = n;
      return best;
    };
    if (style.bass === "walking") {
      for (let b = 0; b < length; b++) {
        const ch = chordAt(b);
        const next = chordAt(b + 1);
        const posInChord = b - starts[chordIndexAt(b)];
        const chordBeats = arr.chords[chordIndexAt(b)].beats;
        let midi: number;
        if (posInChord === 0) midi = nearest(ch.bassPc, prev);
        else if (posInChord === chordBeats - 1 || b === length - 1) {
          // approach the next chord's bass note by a half step, from whichever side is closer
          const target = nearest(next.bassPc, prev);
          midi = rand(seed, cycle, b, "approach") < 0.65 ? target - 1 : target + 1;
        } else {
          const tones = [0, ch.third ?? 5, ch.fifth, ch.seventh ?? 9].map((t) => (ch.rootPc + t) % 12);
          const target = nearest(next.bassPc, prev);
          const dir = target >= prev ? 1 : -1;
          let candidate = prev + dir;
          while (!tones.includes(((candidate % 12) + 12) % 12)) candidate += dir;
          midi = Math.max(28, Math.min(52, candidate));
        }
        prev = midi;
        events.push({ part: "bass", midi, beat: b, offsetMs: human(feel.bass, b, "bass"), dur: 0.95, vel: 0.78 + jitter(seed, cycle, b, "bassvel") * 0.06 });
      }
    } else {
      for (let bar = 0; bar < bars; bar++) {
        for (const slot of style.bass) {
          const beat = bar * beatsPerBar + slot.step / spb;
          if (beat >= length) continue;
          const ch = chordAt(beat);
          const root = nearest(ch.bassPc, slot.step === 0 ? 40 : prev);
          const endBeat = beat + slot.len / spb;
          let midi: number;
          switch (slot.role) {
            case "R": midi = root; break;
            case "8": midi = root + 12 <= 55 ? root + 12 : root; break;
            case "3": midi = root + (ch.third ?? 5); break;
            case "5": midi = root + ch.fifth; break;
            case "6": midi = root + (ch.quality === "dim" ? 8 : 9); break;
            case "b7": midi = root + (ch.seventh ?? 10); break;
            case "approach": midi = nearest(chordAt(endBeat).bassPc, root) - 1; break;
            default: midi = root;
          }
          prev = root;
          events.push({
            part: "bass",
            midi,
            beat: swingBeat(beat, style),
            offsetMs: human(feel.bass, beat, "bass"),
            dur: (slot.len / spb) * 0.9,
            vel: Math.min(1, slot.vel * (1 + jitter(seed, cycle, beat, "bassvel") * 0.06)),
          });
        }
      }
    }
  }

  // ── guitar ──
  if (arr.parts.guitar && style.guitar.pattern) {
    const pat = style.guitar.pattern;
    for (let bar = 0; bar < bars; bar++) {
      for (let step = 0; step < pat.length; step++) {
        const c = pat[step];
        if (c === ".") continue;
        const beat = bar * beatsPerBar + step / spb;
        if (beat >= length) continue;
        const ch = chordAt(beat);
        const strings = guitarStrings(arr.chords[chordIndexAt(beat)].chord, ch);
        let nextStep = step + 1;
        while (nextStep < pat.length && pat[nextStep] === ".") nextStep++;
        const ringBeats = (nextStep - step) / spb;
        const base = human(feel.guitar, beat, "gtr");
        const at = swingBeat(beat, style);
        const push = (string: number, midi: number, delayMs: number, vel: number, dur: number) =>
          events.push({ part: "guitar", midi, string, beat: at, offsetMs: base + delayMs, dur, vel });
        const played = strings.map((m, i) => ({ m, i })).filter((x) => x.m !== null) as { m: number; i: number }[];
        if (c === "D" || c === "d") {
          const vel = c === "D" ? 0.85 : 0.6;
          const spread = c === "D" ? 9 : 13;
          played.forEach((x, k) => push(x.i, x.m, k * spread, vel * (1 - k * 0.03), style.guitar.short ? 0.2 : ringBeats));
        } else if (c === "U" || c === "u") {
          const vel = c === "U" ? 0.62 : 0.45;
          played.filter((x) => x.i >= 2).reverse().forEach((x, k) => push(x.i, x.m, k * 10, vel, style.guitar.short ? 0.15 : ringBeats));
        } else if (c === "x") {
          played.forEach((x, k) => push(x.i, x.m, k * 4, 0.3, 0.05));
        } else if (c === "P") {
          played.slice(0, 2).forEach((x, k) => push(x.i, x.m, k * 3, 0.8, 0.14));
        } else if (c === "b") {
          const bassString = played.find((x) => x.m % 12 === ch.bassPc) ?? played[0];
          if (bassString) push(bassString.i, bassString.m, 0, 0.72, ringBeats);
        } else if (/[0-5]/.test(c)) {
          const x = played[Math.min(Number(c), played.length - 1)];
          if (x) push(x.i, x.m, 0, 0.6, ringBeats * 2);
        }
      }
    }
  }

  // ── keys ──
  if (arr.parts.keys && style.keys.pattern) {
    const pat = style.keys.pattern;
    let prevVoicing: number[] | null = null;
    let lastChord = -1;
    let voicing: number[] = [];
    for (let bar = 0; bar < bars; bar++) {
      for (let step = 0; step < pat.length; step++) {
        const c = pat[step];
        if (c !== "X" && c !== "x") continue;
        const beat = bar * beatsPerBar + step / spb;
        if (beat >= length) continue;
        const ci = chordIndexAt(beat);
        if (ci !== lastChord) {
          voicing = keysVoicing(parsed[ci], style.keys.voicing, prevVoicing);
          prevVoicing = voicing;
          lastChord = ci;
        }
        let hold = 1;
        while (step + hold < pat.length && pat[step + hold] === "-") hold++;
        // don't hold past the next chord change
        const nextChange = ci + 1 < starts.length ? starts[ci + 1] : length;
        const dur = style.keys.short ? 0.3 : Math.min(hold / spb, nextChange - beat);
        const base = human(feel.keys, beat, "keys");
        voicing.forEach((midi, k) =>
          events.push({ part: "keys", midi, beat: swingBeat(beat, style), offsetMs: base + k * 3, dur: dur * 0.95, vel: Math.min(1, (c === "X" ? 0.62 : 0.45) * (1 + jitter(seed, cycle, beat, "keysvel", k) * 0.06)) })
        );
      }
    }
  }

  events.sort((a, b) => a.beat - b.beat);
  return {
    events,
    lengthBeats: length,
    beatsPerBar,
    chordStarts: starts.map((beat, index) => ({ beat, index })),
  };
}
