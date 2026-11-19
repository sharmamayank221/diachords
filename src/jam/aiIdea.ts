// "New idea" with Apple Intelligence in the iOS app: the on-device model writes a progression,
// tempo and solo tip. It may only pick chords from a palette the app can voice in this key.
import { findChord } from "@/helpers/chordSearch";
import { NativeShell, type JamIdeaResult } from "@/lib/native";
import { styleProgressions } from "./arrangement";
import type { StyleDef } from "./styles";
import { Mode, noteToPc, parseChord, romanToChord } from "./theory";

const DIATONIC: Record<Mode, string[]> = {
  major: ["I", "ii", "iii", "IV", "V", "vi", "Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "I7", "IV7", "bVII", "bVI", "iv"],
  minor: ["i", "iv", "v", "bIII", "bVI", "bVII", "V", "i7", "iv7", "v7", "bIIImaj7", "bVImaj7", "bVII7", "V7", "iiø7", "IV"],
};

const playable = (chord: string) => !!parseChord(chord) && !!findChord(chord);

function chordPalette(style: StyleDef, keyPc: number, mode: Mode): string[] {
  const fromStyle = styleProgressions(style, mode).flatMap((p) => p.split(/[\s|]+/));
  const romans = Array.from(new Set([...fromStyle, ...DIATONIC[mode]]));
  return Array.from(new Set(romans.map((r) => romanToChord(r, keyPc, mode)))).filter(playable);
}

export interface JamIdea extends JamIdeaResult {
  chordsText: string;
}

/** Resolves an idea with only playable chords, or throws so the caller can fall back. */
export async function generateJamIdea(
  style: StyleDef,
  key: string,
  mode: Mode,
  recent: string[],
  inspiration?: { text: string; tempoMin: number; tempoMax: number }
): Promise<JamIdea> {
  const keyPc = noteToPc(key) ?? 0;
  // the channel's usual tempos, kept inside what the style's grooves can play
  let bpmMin = style.tempo.min;
  let bpmMax = style.tempo.max;
  if (inspiration) {
    const lo = Math.max(bpmMin, inspiration.tempoMin);
    const hi = Math.min(bpmMax, inspiration.tempoMax);
    if (lo <= hi) [bpmMin, bpmMax] = [lo, hi];
  }
  const result = await NativeShell.generateJamIdea({
    style: style.name,
    styleDescription: style.description,
    key,
    mode,
    meter: style.meter.label,
    tonic: romanToChord(mode === "major" ? "I" : "i", keyPc, mode),
    bpmMin,
    bpmMax,
    palette: chordPalette(style, keyPc, mode),
    avoid: recent,
    inspiration: inspiration?.text,
  });
  const chords = result.chords.filter(playable);
  if (chords.length < 3) throw new Error("Not enough playable chords");
  const bpm = Math.min(bpmMax, Math.max(bpmMin, Math.round(result.bpm)));
  const title = result.title.trim().replace(/^["“”']+|["“”',.;:!\s-]+$/g, "");
  return { ...result, title, chords, bpm, chordsText: chords.join(" ") };
}
