// The jam engine: plays a compiled arrangement through recorded samples with plain Web Audio.
//
// Timing: a Web Worker ticks every 25 ms (it keeps running with the screen off) and schedules
// every event that falls within the next 120 ms on the audio clock. Beat positions are turned
// into seconds with an anchor (time, beat, tempo), so tempo changes take effect within a tick.
// The same scheduling code renders into an OfflineAudioContext for export, so a download
// sounds exactly like playback.

import { Arrangement, PartId } from "./arrangement";
import { compilePass, CompiledPass, JamEvent } from "./compile";
import { STYLE_BY_ID, DrumPiece } from "./styles";
import { drumBuffer, pitchedBuffer, preloadDrums, preloadPitched, resolveManifests } from "./samples";
import { GuitarRig, RigSettings, RIG_PRESETS } from "./rig";

const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;
const PARTS: PartId[] = ["drums", "bass", "guitar", "keys"];
const PART_GAIN: Record<PartId, number> = { drums: 0.95, bass: 1.1, guitar: 0.8, keys: 0.62 };
const PART_PAN: Record<PartId, number> = { drums: 0, bass: 0, guitar: 0.22, keys: -0.18 };
const PART_HPF: Record<PartId, number> = { drums: 30, bass: 35, guitar: 90, keys: 120 };
const REVERB_SEND: Record<PartId, number> = { drums: 0.07, bass: 0, guitar: 0.16, keys: 0.2 };
const RELEASE_S: Record<PartId, number> = { drums: 0.05, bass: 0.06, guitar: 0.12, keys: 0.25 };

export interface BeatInfo {
  bar: number; // bar within the pass (0-based); −1 during the count-in
  beat: number; // beat within the bar
  countIn: boolean;
  pass: number;
}

interface Graph {
  ctx: BaseAudioContext;
  parts: Record<PartId, GainNode>;
  click: GainNode;
  /** guitar notes enter here, then pass through the (persistent) rig */
  guitarIn: GainNode;
  guitarInstrument: "guitar" | "guitarElectric";
  /** the rig's "Room reverb" knob */
  guitarReverb: GainNode;
}

// ── audio graph (shared by live and offline) ─────────────────────────────────

function makeReverb(ctx: BaseAudioContext, seconds = 1.4): ConvolverNode {
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = rnd() * Math.pow(1 - i / len, 3.2);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  return conv;
}

function buildGraph(ctx: BaseAudioContext, rig: GuitarRig, rigSettings: RigSettings): Graph {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  comp.attack.value = 0.006;
  comp.release.value = 0.18;
  // a fast, high-ratio stage as a safety limiter before the speakers
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp).connect(limiter).connect(ctx.destination);

  const reverb = makeReverb(ctx);
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.9;
  reverb.connect(reverbReturn).connect(master);

  const parts = {} as Record<PartId, GainNode>;
  let guitarReverb: GainNode | null = null;
  for (const p of PARTS) {
    const fader = ctx.createGain();
    fader.gain.value = PART_GAIN[p] * 0.8 * 0.8;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = PART_HPF[p];
    const pan = ctx.createStereoPanner();
    pan.pan.value = PART_PAN[p];
    fader.connect(hpf).connect(pan).connect(master);
    if (REVERB_SEND[p] > 0) {
      const send = ctx.createGain();
      send.gain.value = REVERB_SEND[p];
      pan.connect(send).connect(reverb);
      if (p === "guitar") guitarReverb = send;
    }
    parts[p] = fader;
  }
  const click = ctx.createGain();
  click.gain.value = 0.5;
  click.connect(master);
  const guitarIn = ctx.createGain();
  guitarIn.connect(rig.input);
  rig.output.disconnect();
  rig.output.connect(parts.guitar);
  guitarReverb!.gain.value = rigSettings.reverb;
  return { ctx, parts, click, guitarIn, guitarReverb: guitarReverb!, guitarInstrument: rigSettings.guitar === "electric" ? "guitarElectric" : "guitar" };
}

// voice tracking so strings/bass/hats cut cleanly instead of piling up
interface Voice {
  src: AudioBufferSourceNode;
  gain: GainNode;
}
class Voices {
  private map = new Map<string, Voice>();
  cut(key: string, at: number) {
    const v = this.map.get(key);
    if (!v) return;
    try {
      v.gain.gain.cancelScheduledValues(at);
      v.gain.gain.setTargetAtTime(0, at, 0.012);
      v.src.stop(at + 0.08);
    } catch {
      /* already stopped */
    }
    this.map.delete(key);
  }
  set(key: string, v: Voice) {
    this.map.set(key, v);
  }
  clear() {
    this.map.clear();
  }
}

// hand percussion sits behind the kit
const PIECE_GAIN: Partial<Record<DrumPiece, number>> = { tambourine: 0.4, shaker: 0.3, clap: 0.55, cowbell: 0.35 };

function playEvent(g: Graph, voices: Voices, ev: JamEvent, when: number, secPerBeat: number) {
  const ctx = g.ctx;
  let buffer: AudioBuffer | null = null;
  let rate = 1;
  if (ev.part === "drums") {
    buffer = drumBuffer(ev.piece as DrumPiece, ev.vel, ev.kit);
  } else {
    const found = pitchedBuffer(ev.part === "guitar" ? g.guitarInstrument : ev.part, ev.midi ?? 60);
    if (found) {
      buffer = found.buffer;
      rate = found.rate;
    }
  }
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  // velocity layers carry most of the loudness for drums; pitched samples need the full curve
  const level = ev.part === "drums" ? (0.55 + 0.45 * ev.vel) * (PIECE_GAIN[ev.piece as DrumPiece] ?? 1) : Math.pow(ev.vel, 1.4);
  gain.gain.setValueAtTime(level, when);
  src.connect(gain).connect(ev.part === "guitar" ? g.guitarIn : g.parts[ev.part]);

  // choke groups: a new note on the same string/voice stops the previous one
  if (ev.part === "bass") {
    voices.cut("bass", when);
    voices.set("bass", { src, gain });
  } else if (ev.part === "guitar" && ev.string !== undefined) {
    voices.cut(`g${ev.string}`, when);
    voices.set(`g${ev.string}`, { src, gain });
  } else if (ev.piece === "hihat" || ev.piece === "pedalhat" || ev.piece === "openhat") {
    voices.cut("hat", when);
    if (ev.piece === "openhat") voices.set("hat", { src, gain });
  }

  src.start(when);
  if (ev.part !== "drums") {
    const end = when + ev.dur * secPerBeat;
    const release = RELEASE_S[ev.part];
    gain.gain.setValueAtTime(level, end);
    gain.gain.setTargetAtTime(0, end, release / 3);
    src.stop(end + release * 2);
  }
}

function playClick(g: Graph, when: number, accent: boolean) {
  const ctx = g.ctx;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(accent ? 2000 : 1400, when);
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.6, when + 0.001);
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  osc.connect(env).connect(g.click);
  osc.start(when);
  osc.stop(when + 0.06);
}

/** Every drum piece and pitch the arrangement can reach across a full song cycle of sections. */
export async function preloadArrangement(ctx: BaseAudioContext, arr: Arrangement, guitar: "acoustic" | "electric" = "acoustic"): Promise<void> {
  await resolveManifests();
  const pieces = new Set<DrumPiece>(["crash"]);
  let kit: "modern" | "vintage" = "modern";
  const notes: Record<"bass" | "guitar" | "keys", Set<number>> = { bass: new Set(), guitar: new Set(), keys: new Set() };
  for (let cycle = 0; cycle < 8; cycle++) {
    for (const ev of compilePass({ ...arr, parts: { drums: true, bass: true, guitar: true, keys: true } }, cycle).events) {
      if (ev.part === "drums" && ev.piece) {
        pieces.add(ev.piece);
        if (ev.kit) kit = ev.kit;
      }
      else if (ev.midi !== undefined && ev.part !== "drums") notes[ev.part].add(ev.midi);
    }
  }
  await Promise.all([
    preloadDrums(ctx, pieces, kit),
    preloadPitched(ctx, "bass", notes.bass),
    preloadPitched(ctx, guitar === "electric" ? "guitarElectric" : "guitar", notes.guitar),
    preloadPitched(ctx, "keys", notes.keys),
  ]);
}

// ── live engine ───────────────────────────────────────────────────────────────

export interface EngineCallbacks {
  onBeat?: (info: BeatInfo) => void;
  onChord?: (index: number, pass: number) => void;
  onPass?: (pass: number) => void;
}

export class JamEngine {
  private ctx: AudioContext;
  private graph: Graph;
  private rig: GuitarRig;
  private rigSettings: RigSettings = RIG_PRESETS.acoustic.settings;
  private voices = new Voices();
  private worker: Worker | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private raf: number | null = null;

  private arr: Arrangement | null = null;
  private pass: CompiledPass | null = null;
  private cycle = 0;
  private passStartBeat = 0; // global beat where the current pass began
  private eventIdx = 0;
  private tempo = 100;
  private anchorTime = 0;
  private anchorBeat = 0;
  private scheduledUntil = 0;
  private uiQueue: { time: number; fn: () => void }[] = [];
  private nextUiBeat = 0;
  private countInBeats = 0;
  private volumes: Record<PartId, number> = { drums: 0.8, bass: 0.8, guitar: 0.8, keys: 0.8 };
  private muted: Record<PartId, boolean> = { drums: false, bass: false, guitar: false, keys: false };
  playing = false;

  constructor(private callbacks: EngineCallbacks = {}) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    // 48 kHz: the rate amp models are trained at
    try {
      this.ctx = new Ctx({ latencyHint: "interactive", sampleRate: 48000 });
    } catch {
      this.ctx = new Ctx({ latencyHint: "interactive" });
    }
    // on iOS this lets the band play with the silent switch on
    try {
      (navigator as any).audioSession && ((navigator as any).audioSession.type = "playback");
    } catch {
      /* not supported */
    }
    this.rig = new GuitarRig(this.ctx);
    this.rig.apply(this.rigSettings);
    this.graph = buildGraph(this.ctx, this.rig, this.rigSettings);
  }

  get audioContext() {
    return this.ctx;
  }

  async load(arr: Arrangement): Promise<void> {
    await Promise.all([preloadArrangement(this.ctx, arr, this.rigSettings.guitar), this.rig.ready]);
  }

  /** Change pedals/amp/cab live. Resolves when any new amp model or IR has loaded. */
  async setRig(settings: RigSettings): Promise<string | null> {
    const guitarChanged = settings.guitar !== this.rigSettings.guitar;
    this.rigSettings = settings;
    this.graph.guitarInstrument = settings.guitar === "electric" ? "guitarElectric" : "guitar";
    this.graph.guitarReverb.gain.setTargetAtTime(settings.reverb, this.ctx.currentTime, 0.05);
    const ready = this.rig.apply(settings);
    if (guitarChanged && this.arr) preloadArrangement(this.ctx, this.arr, settings.guitar).catch(() => {});
    await ready;
    return this.rig.modelError;
  }

  private secPerBeat() {
    return 60 / this.tempo;
  }
  private timeAt(globalBeat: number) {
    return this.anchorTime + (globalBeat - this.anchorBeat) * this.secPerBeat();
  }
  private beatAt(time: number) {
    return this.anchorBeat + (time - this.anchorTime) / this.secPerBeat();
  }

  async start(arr: Arrangement, opts: { countIn?: boolean } = {}): Promise<void> {
    this.stop();
    await this.ctx.resume();
    await this.load(arr);
    this.arr = arr;
    this.tempo = arr.tempo;
    this.rig.setTempo(arr.tempo);
    this.cycle = 0;
    this.pass = compilePass(arr, 0);
    const beatsPerBar = this.pass.beatsPerBar;
    this.countInBeats = opts.countIn ? beatsPerBar : 0;
    this.passStartBeat = this.countInBeats;
    this.eventIdx = 0;
    this.anchorTime = this.ctx.currentTime + 0.08;
    this.anchorBeat = 0;
    this.scheduledUntil = this.anchorTime;
    this.nextUiBeat = 0;
    this.uiQueue = [];
    for (let b = 0; b < this.countInBeats; b++) playClick(this.graph, this.timeAt(b), b === 0);
    this.applyMix();
    this.playing = true;
    this.startClock();
    this.tick();
    this.raf = requestAnimationFrame(this.drainUi);
  }

  stop() {
    this.playing = false;
    this.worker?.postMessage("stop");
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    // fade the band out quickly rather than leaving notes ringing
    const now = this.ctx.currentTime;
    for (const p of PARTS) {
      const g = this.graph.parts[p].gain;
      g.cancelScheduledValues(now);
      g.setTargetAtTime(0, now, 0.03);
    }
    this.voices.clear();
    this.uiQueue = [];
    // rebuild the graph so leftover scheduled sources go to a disconnected bus
    const old = this.graph;
    old.guitarIn.disconnect();
    setTimeout(() => PARTS.forEach((p) => old.parts[p].disconnect()), 200);
    this.rig.reset();
    this.graph = buildGraph(this.ctx, this.rig, this.rigSettings);
  }

  dispose() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.ctx.close().catch(() => {});
  }

  /** Swap the arrangement while playing (chords/style edits). Applies from the next bar. */
  update(arr: Arrangement) {
    if (!this.playing || !this.pass) {
      this.arr = arr;
      return;
    }
    preloadArrangement(this.ctx, arr, this.rigSettings.guitar).catch(() => {});
    const oldPass = this.pass;
    this.arr = arr;
    this.setTempo(arr.tempo);
    const next = compilePass(arr, this.cycle);
    // keep our place: continue from the same beat inside the (possibly shorter) new pass
    const nowBeat = this.beatAt(this.scheduledUntil) - this.passStartBeat;
    if (next.lengthBeats !== oldPass.lengthBeats && nowBeat >= next.lengthBeats) {
      this.passStartBeat += oldPass.lengthBeats;
      this.cycle++;
      this.pass = compilePass(arr, this.cycle);
    } else {
      this.pass = next;
    }
    const from = this.beatAt(this.scheduledUntil) - this.passStartBeat;
    this.eventIdx = this.pass.events.findIndex((e) => e.beat >= from - 1e-6);
    if (this.eventIdx < 0) this.eventIdx = this.pass.events.length;
  }

  setTempo(bpm: number) {
    if (bpm === this.tempo) return;
    // re-anchor at the edge of what's already scheduled so nothing jumps
    const beat = this.beatAt(this.scheduledUntil);
    this.anchorTime = this.scheduledUntil;
    this.anchorBeat = beat;
    this.tempo = bpm;
    this.rig.setTempo(bpm);
  }

  setVolume(part: PartId, v: number) {
    this.volumes[part] = v;
    this.applyMix();
  }
  setMuted(part: PartId, m: boolean) {
    this.muted[part] = m;
    this.applyMix();
  }
  private applyMix() {
    const now = this.ctx.currentTime;
    for (const p of PARTS) {
      const target = this.muted[p] ? 0 : PART_GAIN[p] * this.volumes[p] * this.volumes[p];
      this.graph.parts[p].gain.setTargetAtTime(target, now, 0.01);
    }
  }

  private startClock() {
    if (!this.worker) {
      try {
        const code = `let id=null;onmessage=e=>{if(e.data==='start'){clearInterval(id);id=setInterval(()=>postMessage(0),${TICK_MS})}else{clearInterval(id);id=null}}`;
        this.worker = new Worker(URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
      } catch {
        this.worker = null;
      }
    }
    if (this.worker) {
      this.worker.onmessage = () => this.tick();
      this.worker.postMessage("start");
    } else {
      this.fallbackTimer = setInterval(() => this.tick(), TICK_MS);
    }
  }

  private tick = () => {
    if (!this.playing || !this.pass || !this.arr) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD_S;
    const spBeat = this.secPerBeat();
    let guard = 0;
    while (guard++ < 4000) {
      if (this.eventIdx >= this.pass.events.length) {
        this.passStartBeat += this.pass.lengthBeats;
        this.cycle++;
        this.pass = compilePass(this.arr, this.cycle);
        this.eventIdx = 0;
        const pass = this.cycle;
        this.queueUi(this.timeAt(this.passStartBeat), () => this.callbacks.onPass?.(pass));
        continue;
      }
      const ev = this.pass.events[this.eventIdx];
      const when = this.timeAt(this.passStartBeat + ev.beat) + ev.offsetMs / 1000;
      if (when > horizon) break;
      if (when >= this.ctx.currentTime - 0.01) playEvent(this.graph, this.voices, ev, Math.max(when, this.ctx.currentTime), spBeat);
      this.eventIdx++;
    }
    // beats and chord changes for the UI, in time with the audio
    while (this.timeAt(this.nextUiBeat) <= horizon) {
      const g = this.nextUiBeat;
      const t = this.timeAt(g);
      const bpb = this.pass.beatsPerBar;
      if (g < this.countInBeats) {
        this.queueUi(t, () => this.callbacks.onBeat?.({ bar: -1, beat: g, countIn: true, pass: 0 }));
      } else {
        const len = this.pass.lengthBeats;
        const rel = g - this.countInBeats;
        const inPass = ((rel % len) + len) % len;
        const pass = Math.floor(rel / len);
        const startIdx = this.pass.chordStarts.find((c) => Math.abs(c.beat - inPass) < 1e-6);
        this.queueUi(t, () => {
          this.callbacks.onBeat?.({ bar: Math.floor(inPass / bpb), beat: inPass % bpb, countIn: false, pass });
          if (startIdx) this.callbacks.onChord?.(startIdx.index, pass);
        });
      }
      this.nextUiBeat++;
    }
    this.scheduledUntil = horizon;
  };

  private queueUi(time: number, fn: () => void) {
    this.uiQueue.push({ time, fn });
  }

  private drainUi = () => {
    const now = this.ctx.currentTime - ((this.ctx as any).outputLatency ?? 0);
    while (this.uiQueue.length && this.uiQueue[0].time <= now) this.uiQueue.shift()!.fn();
    if (this.playing) this.raf = requestAnimationFrame(this.drainUi);
  };
}

// ── offline render (export) ──────────────────────────────────────────────────

export async function renderArrangement(
  arr: Arrangement,
  passes: number,
  mix: { volumes: Record<PartId, number>; muted: Record<PartId, boolean> },
  rigSettings: RigSettings = RIG_PRESETS.acoustic.settings,
  sampleRate = 48000
): Promise<AudioBuffer> {
  const style = STYLE_BY_ID[arr.style];
  const secPerBeat = 60 / arr.tempo;
  const firstPass = compilePass(arr, 0);
  const seconds = firstPass.lengthBeats * passes * secPerBeat + 2.5; // + ring-out
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  await preloadArrangement(ctx, arr, rigSettings.guitar);
  const rig = new GuitarRig(ctx);
  rig.setTempo(arr.tempo);
  await rig.apply(rigSettings);
  const graph = buildGraph(ctx, rig, rigSettings);
  for (const p of PARTS) graph.parts[p].gain.value = mix.muted[p] ? 0 : PART_GAIN[p] * mix.volumes[p] * mix.volumes[p];
  const voices = new Voices();
  const start = 0.05;
  for (let cycle = 0; cycle < passes; cycle++) {
    const pass = cycle === 0 ? firstPass : compilePass(arr, cycle);
    const base = cycle * pass.lengthBeats;
    for (const ev of pass.events) {
      playEvent(graph, voices, ev, Math.max(0, start + (base + ev.beat) * secPerBeat + ev.offsetMs / 1000), secPerBeat);
    }
  }
  void style;
  const rendered = await ctx.startRendering();
  // the limiter's 1 ms attack lets the odd drum transient through; keep the file under -0.5 dBFS
  let peak = 0;
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    const data = rendered.getChannelData(c);
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  }
  const ceiling = 0.944;
  if (peak > ceiling) {
    const k = ceiling / peak;
    for (let c = 0; c < rendered.numberOfChannels; c++) {
      const data = rendered.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] *= k;
    }
  }
  return rendered;
}

/** 16-bit PCM WAV from an AudioBuffer, trimmed of trailing silence. */
export function audioBufferToWav(buf: AudioBuffer): Blob {
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  let end = buf.length;
  while (end > 0 && chans.every((c) => Math.abs(c[end - 1]) < 1e-4)) end--;
  end = Math.min(buf.length, end + Math.floor(buf.sampleRate * 0.05));
  const n = chans.length;
  const data = new DataView(new ArrayBuffer(44 + end * n * 2));
  const writeStr = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) data.setUint8(o + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  data.setUint32(4, 36 + end * n * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, n, true);
  data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * n * 2, true);
  data.setUint16(32, n * 2, true);
  data.setUint16(34, 16, true);
  writeStr(36, "data");
  data.setUint32(40, end * n * 2, true);
  let o = 44;
  for (let i = 0; i < end; i++) {
    for (let c = 0; c < n; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([data], { type: "audio/wav" });
}
