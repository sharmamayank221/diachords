// Position-addressed randomness: every value is a hash of where it sits in the track
// (seed, loop pass, beat, part, salt) instead of the next draw from a stream. Replaying,
// seeking, live playback and offline export therefore produce identical "human" variation,
// while each new loop pass still varies.

function splitmix32(a: number): number {
  a |= 0;
  a = (a + 0x9e3779b9) | 0;
  let t = a ^ (a >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t ^= t >>> 15;
  t = Math.imul(t, 0x735a2d97);
  t ^= t >>> 15;
  return (t >>> 0) / 4294967296;
}

const SALTS: Record<string, number> = {};
function saltOf(name: string): number {
  if (SALTS[name] !== undefined) return SALTS[name];
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return (SALTS[name] = h >>> 0);
}

/** Uniform [0, 1) for a position in the track. */
export function rand(seed: number, cycle: number, beat: number, salt: string, voice = 0): number {
  let h = splitmix32(seed ^ saltOf(salt));
  h = splitmix32(Math.floor(h * 4294967296) ^ cycle);
  h = splitmix32(Math.floor(h * 4294967296) ^ Math.round(beat * 960));
  return splitmix32(Math.floor(h * 4294967296) ^ voice);
}

/** Symmetric [-1, 1). */
export const jitter = (seed: number, cycle: number, beat: number, salt: string, voice = 0) =>
  rand(seed, cycle, beat, salt, voice) * 2 - 1;

/** FNV-1a hash of a string, for deriving a seed from content. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
