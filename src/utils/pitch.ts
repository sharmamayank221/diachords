// YIN pitch detection limited to a frequency range, with parabolic interpolation
// for sub-sample accuracy (a tuner needs ~1 cent). Returns Hz or null.
// de Cheveigné & Kawahara, "YIN, a fundamental frequency estimator for speech and music" (2002).
export function detectPitchYin(
  buf: Float32Array,
  sampleRate: number,
  { minFreq = 60, maxFreq = 1000, threshold = 0.12 } = {}
): number | null {
  const W = Math.floor(buf.length / 2);
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(W - 1, Math.ceil(sampleRate / minFreq));
  if (tauMax <= tauMin) return null;

  // cumulative mean normalised difference
  const d = new Float32Array(tauMax + 2);
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const delta = buf[i] - buf[i + tau];
      sum += delta * delta;
    }
    running += sum;
    d[tau] = running > 0 ? (sum * tau) / running : 1;
  }

  // first dip under the threshold (then walk to its bottom); else the deepest dip if it's convincing
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) {
    let best = tauMin;
    for (let t = tauMin + 1; t <= tauMax; t++) if (d[t] < d[best]) best = t;
    if (d[best] > 0.3) return null;
    tau = best;
  }

  // Real low strings often have a louder 2nd harmonic than fundamental, which gives a
  // shallow dip at half the true period. If the dip one octave down is far deeper, use it.
  if (d[tau] > 0.001 && tau * 2 + 2 <= tauMax) {
    let low = tau * 2 - 2;
    for (let t = tau * 2 - 1; t <= tau * 2 + 2; t++) if (d[t] < d[low]) low = t;
    if (d[low] < d[tau] * 0.35) tau = low;
  }

  const a = d[tau - 1];
  const b = d[tau];
  const c = d[tau + 1];
  const denom = a + c - 2 * b;
  const shift = denom !== 0 ? (a - c) / (2 * denom) : 0;
  return sampleRate / (tau + shift);
}
