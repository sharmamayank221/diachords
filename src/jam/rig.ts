// The guitar rig: pedals → amp (built-in or a Neural Amp Modeler .nam model, A1 or A2) →
// tone stack → speaker cabinet (built-in simulation or an impulse response) → chorus → delay.
// Every stage is built once per AudioContext and switched with crossfaded bypass gains, so
// changing settings while the band plays never clicks or rebuilds the graph.

import { getUserTone } from "./userTones";

export type AmpModel = "none" | "clean" | "nam:a2-crunch" | "nam:obsidian" | `user:${string}`;
export type CabType = "off" | "1x12" | "2x12" | "4x12" | `user:${string}`;
export type DelayTime = "1/4" | "1/8." | "1/8";

export interface RigSettings {
  guitar: "acoustic" | "electric";
  compressor: { on: boolean; amount: number };
  drive: { on: boolean; drive: number; tone: number; level: number };
  amp: { model: AmpModel; gain: number; bass: number; mid: number; treble: number; master: number };
  cab: CabType;
  chorus: { on: boolean; depth: number; rate: number };
  delay: { on: boolean; time: DelayTime; mix: number; feedback: number };
  reverb: number; // 0..1 send to the band's room
}

export const BUILTIN_NAM: Record<string, { url: string; label: string; credit: string }> = {
  "nam:a2-crunch": { url: "/nam/models/a2-crunch.nam", label: "Crunch · NAM A2", credit: "NAM A2 example model (MIT, Steven Atkinson / NeuralAmpModelerCore)" },
  "nam:obsidian": { url: "/nam/models/obsidian-high-gain.nam", label: "Obsidian high-gain · NAM", credit: "Omega Ampworks Obsidian, modelled by Steven Atkinson (MIT, NeuralAmpModelerPlugin)" },
};

const base: RigSettings = {
  guitar: "electric",
  compressor: { on: false, amount: 0.4 },
  drive: { on: false, drive: 0.4, tone: 0.5, level: 0.6 },
  amp: { model: "clean", gain: 0.4, bass: 0, mid: 0, treble: 0, master: 0.7 },
  cab: "2x12",
  chorus: { on: false, depth: 0.4, rate: 0.35 },
  delay: { on: false, time: "1/8.", mix: 0.22, feedback: 0.3 },
  reverb: 0.18,
};

export const RIG_PRESETS: Record<string, { label: string; settings: RigSettings }> = {
  acoustic: { label: "Acoustic", settings: { ...base, guitar: "acoustic", amp: { ...base.amp, model: "none" }, cab: "off", reverb: 0.2 } },
  clean: { label: "Clean", settings: { ...base, compressor: { on: true, amount: 0.3 }, chorus: { on: true, depth: 0.25, rate: 0.3 }, reverb: 0.22 } },
  funk: { label: "Funk", settings: { ...base, compressor: { on: true, amount: 0.7 }, amp: { ...base.amp, treble: 0.35, mid: -0.15 }, cab: "1x12", reverb: 0.1 } },
  jazz: { label: "Jazz", settings: { ...base, amp: { ...base.amp, gain: 0.25, treble: -0.55, bass: 0.2 }, cab: "1x12", reverb: 0.24 } },
  crunch: { label: "Crunch · NAM A2", settings: { ...base, amp: { ...base.amp, model: "nam:a2-crunch", gain: 0.45, master: 0.65 }, cab: "2x12", reverb: 0.14 } },
  lead: {
    label: "Lead · NAM A2 + delay",
    settings: { ...base, drive: { on: true, drive: 0.3, tone: 0.6, level: 0.7 }, amp: { ...base.amp, model: "nam:a2-crunch", gain: 0.6, master: 0.6 }, cab: "2x12", delay: { ...base.delay, on: true }, reverb: 0.2 },
  },
  highgain: {
    label: "High gain · NAM",
    settings: { ...base, drive: { on: true, drive: 0.15, tone: 0.65, level: 0.8 }, amp: { ...base.amp, model: "nam:obsidian", gain: 0.5, master: 0.6, mid: 0.1 }, cab: "4x12", reverb: 0.1 },
  },
};

export const STYLE_RIG: Record<string, string> = {
  rock: "crunch", metal: "highgain", blues: "crunch", slowblues: "lead", jazz: "jazz", funk: "funk", soul: "clean",
  disco: "funk", reggae: "clean", lofi: "jazz", pop: "acoustic", country: "clean", bossa: "acoustic", ballad68: "acoustic", waltz: "acoustic",
};

// ── shared NAM runtime per context ──────────────────────────────────────────

let wasmBytes: Promise<ArrayBuffer> | null = null;
const workletReady = new WeakMap<BaseAudioContext, Promise<void>>();
const modelJson = new Map<string, Promise<string>>();

function namWorklet(ctx: BaseAudioContext): Promise<void> {
  if (!workletReady.has(ctx)) workletReady.set(ctx, ctx.audioWorklet.addModule("/nam/nam-processor.js"));
  return workletReady.get(ctx)!;
}
function namWasm(): Promise<ArrayBuffer> {
  if (!wasmBytes) wasmBytes = fetch("/nam/nam.wasm").then((r) => r.arrayBuffer());
  return wasmBytes;
}
async function loadModelJson(model: AmpModel): Promise<string | null> {
  if (model.startsWith("user:")) {
    const tone = await getUserTone(model.slice(5));
    return tone && tone.kind === "nam" ? (tone.data as string) : null;
  }
  const builtin = BUILTIN_NAM[model];
  if (!builtin) return null;
  if (!modelJson.has(model)) modelJson.set(model, fetch(builtin.url).then((r) => r.text()));
  return modelJson.get(model)!;
}

// ── helpers ────────────────────────────────────────────────────────────────

const db2gain = (db: number) => Math.pow(10, db / 20);

function shaperCurve(kind: "drive" | "clean", amount: number): Float32Array {
  const n = 4097;
  const curve = new Float32Array(n);
  const k = kind === "drive" ? 1 + amount * 40 : 1 + amount * 4;
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    // slight asymmetry adds even harmonics, like a tube stage
    const y = Math.tanh(k * (x + (kind === "clean" ? 0.04 : 0.08) * x * x));
    curve[i] = y / norm;
  }
  return curve;
}

/** A section that can be switched in or out with a short crossfade. */
class Switchable {
  input: GainNode;
  output: GainNode;
  private wet: GainNode;
  private dry: GainNode;
  constructor(private ctx: BaseAudioContext, buildWet: (input: AudioNode) => AudioNode) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.wet = ctx.createGain();
    this.dry = ctx.createGain();
    this.input.connect(this.dry).connect(this.output);
    buildWet(this.input).connect(this.wet).connect(this.output);
    this.set(false);
  }
  set(on: boolean) {
    const t = this.ctx.currentTime;
    this.wet.gain.setTargetAtTime(on ? 1 : 0, t, 0.01);
    this.dry.gain.setTargetAtTime(on ? 0 : 1, t, 0.01);
  }
}

// cabinet simulations as filter curves (our own design, no third-party impulse responses)
const CABS: Record<"1x12" | "2x12" | "4x12", { hpf: number; low: [number, number]; dip: [number, number]; presence: [number, number]; lpf: number }> = {
  "1x12": { hpf: 90, low: [120, 3], dip: [600, -1.5], presence: [2200, 3], lpf: 5600 },
  "2x12": { hpf: 80, low: [110, 4], dip: [500, -2], presence: [2800, 3.5], lpf: 5000 },
  "4x12": { hpf: 70, low: [100, 5], dip: [400, -3], presence: [3200, 4], lpf: 4500 },
};

// ── the rig ────────────────────────────────────────────────────────────────

export class GuitarRig {
  input: GainNode;
  output: GainNode;
  /** resolves when the NAM runtime and current model are loaded (or failed) */
  ready: Promise<void> = Promise.resolve();
  modelError: string | null = null;
  /** set when the NAM engine can't run here; amp models then fall back to the built-in amp */
  private namBroken = false;

  private comp: DynamicsCompressorNode;
  private compMakeup: GainNode;
  private compSw: Switchable;
  private driveShaper: WaveShaperNode;
  private driveTone: BiquadFilterNode;
  private driveLevel: GainNode;
  private driveSw: Switchable;
  private ampIn: GainNode;
  private cleanPre: GainNode;
  private cleanShaper: WaveShaperNode;
  private ampSelect: { none: GainNode; clean: GainNode; nam: GainNode };
  private nam: AudioWorkletNode | null = null;
  private namInput: GainNode;
  private namOut: GainNode;
  private namLoudness: number | null = null;
  private loadedModel: string | null = null;
  private bass: BiquadFilterNode;
  private mid: BiquadFilterNode;
  private treble: BiquadFilterNode;
  private master: GainNode;
  private cabFilters: BiquadFilterNode[];
  private cabSimOut: GainNode;
  private cabConv: ConvolverNode;
  private cabSelect: { off: GainNode; sim: GainNode; ir: GainNode };
  private chorusSw: Switchable;
  private chorusLfo: OscillatorNode;
  private chorusDepth: GainNode;
  private delayNode: DelayNode;
  private delayFb: GainNode;
  private delayWet: GainNode;
  private settings: RigSettings | null = null;
  private secPerBeat = 0.5;
  private loadedIr: string | null = null;

  constructor(private ctx: BaseAudioContext) {
    const c = ctx;
    this.input = c.createGain();
    this.output = c.createGain();

    // compressor pedal
    this.comp = c.createDynamicsCompressor();
    this.compMakeup = c.createGain();
    this.compSw = new Switchable(c, (inp) => inp.connect(this.comp).connect(this.compMakeup));

    // overdrive pedal: mid-hump into a soft clipper, then tone and level
    this.driveShaper = c.createWaveShaper();
    this.driveShaper.oversample = "4x";
    this.driveTone = c.createBiquadFilter();
    this.driveTone.type = "lowpass";
    this.driveLevel = c.createGain();
    this.driveSw = new Switchable(c, (inp) => {
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 160;
      const hump = c.createBiquadFilter();
      hump.type = "peaking";
      hump.frequency.value = 720;
      hump.Q.value = 0.8;
      hump.gain.value = 6;
      return inp.connect(hp).connect(hump).connect(this.driveShaper).connect(this.driveTone).connect(this.driveLevel);
    });

    // amp: three parallel paths, one audible at a time
    this.ampIn = c.createGain();
    this.ampSelect = { none: c.createGain(), clean: c.createGain(), nam: c.createGain() };
    const ampSum = c.createGain();
    this.ampIn.connect(this.ampSelect.none).connect(ampSum);
    this.cleanPre = c.createGain();
    this.cleanShaper = c.createWaveShaper();
    this.cleanShaper.oversample = "4x";
    this.ampIn.connect(this.cleanPre).connect(this.cleanShaper).connect(this.ampSelect.clean).connect(ampSum);
    this.namInput = c.createGain();
    this.namOut = c.createGain();
    this.ampIn.connect(this.namInput);
    this.namOut.connect(this.ampSelect.nam).connect(ampSum);

    // tone stack + master
    this.bass = c.createBiquadFilter();
    this.bass.type = "lowshelf";
    this.bass.frequency.value = 110;
    this.mid = c.createBiquadFilter();
    this.mid.type = "peaking";
    this.mid.frequency.value = 650;
    this.mid.Q.value = 0.7;
    this.treble = c.createBiquadFilter();
    this.treble.type = "highshelf";
    this.treble.frequency.value = 3200;
    this.master = c.createGain();
    ampSum.connect(this.bass).connect(this.mid).connect(this.treble).connect(this.master);

    // cabinet: off / built-in simulation / impulse response
    this.cabSelect = { off: c.createGain(), sim: c.createGain(), ir: c.createGain() };
    const cabSum = c.createGain();
    this.master.connect(this.cabSelect.off).connect(cabSum);
    const types: BiquadFilterType[] = ["highpass", "peaking", "peaking", "peaking", "lowpass", "lowpass"];
    this.cabFilters = types.map((t) => {
      const f = c.createBiquadFilter();
      f.type = t;
      return f;
    });
    this.cabSimOut = c.createGain();
    this.cabFilters.reduce<AudioNode>((prev, f) => prev.connect(f), this.master).connect(this.cabSimOut).connect(this.cabSelect.sim).connect(cabSum);
    this.cabConv = c.createConvolver();
    this.master.connect(this.cabConv).connect(this.cabSelect.ir).connect(cabSum);

    // chorus: two slowly modulated short delays
    this.chorusLfo = c.createOscillator();
    this.chorusDepth = c.createGain();
    this.chorusSw = new Switchable(c, (inp) => {
      const mix = c.createGain();
      inp.connect(mix);
      [0.012, 0.019].forEach((t, i) => {
        const d = c.createDelay(0.05);
        d.delayTime.value = t;
        const lfoGain = c.createGain();
        lfoGain.gain.value = i === 0 ? 1 : -1;
        this.chorusDepth.connect(lfoGain).connect(d.delayTime);
        const g = c.createGain();
        g.gain.value = 0.5;
        inp.connect(d).connect(g).connect(mix);
      });
      return mix;
    });
    this.chorusLfo.connect(this.chorusDepth);
    this.chorusLfo.start();

    // delay (tempo-synced) as a parallel send with filtered feedback
    this.delayNode = c.createDelay(2);
    this.delayFb = c.createGain();
    this.delayWet = c.createGain();
    const fbFilter = c.createBiquadFilter();
    fbFilter.type = "lowpass";
    fbFilter.frequency.value = 3500;

    cabSum.connect(this.chorusSw.input);
    this.chorusSw.output.connect(this.output);
    this.chorusSw.output.connect(this.delayNode);
    this.delayNode.connect(fbFilter).connect(this.delayFb).connect(this.delayNode);
    this.delayNode.connect(this.delayWet).connect(this.output);

    this.input.connect(this.compSw.input);
    this.compSw.output.connect(this.driveSw.input);
    this.driveSw.output.connect(this.ampIn);
  }

  setTempo(bpm: number) {
    this.secPerBeat = 60 / bpm;
    if (this.settings) this.applyDelayTime(this.settings.delay.time);
  }

  private applyDelayTime(time: DelayTime) {
    const factor = time === "1/4" ? 1 : time === "1/8." ? 0.75 : 0.5;
    this.delayNode.delayTime.setTargetAtTime(Math.min(1.9, this.secPerBeat * factor), this.ctx.currentTime, 0.05);
  }

  private async ensureNam(): Promise<AudioWorkletNode | null> {
    if (this.nam) return this.nam;
    try {
      const [wasm] = await Promise.all([namWasm(), namWorklet(this.ctx)]);
      const node = new AudioWorkletNode(this.ctx, "nam-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: "explicit",
        processorOptions: { wasm: wasm.slice(0) },
      });
      this.namInput.connect(node).connect(this.namOut);
      this.nam = node;
      return node;
    } catch (e) {
      this.namBroken = true;
      this.modelError = "Amp models need a browser with AudioWorklet support, so the built-in amp is playing instead.";
      if (this.settings) this.apply(this.settings);
      return null;
    }
  }

  private loadNamModel(model: AmpModel): Promise<void> {
    if (this.loadedModel === model) return Promise.resolve();
    this.loadedModel = model;
    this.modelError = null;
    return (async () => {
      const [node, json] = await Promise.all([this.ensureNam(), loadModelJson(model)]);
      if (!node || !json) {
        this.modelError = this.modelError ?? "Couldn’t load that amp model.";
        return;
      }
      const ok = await new Promise<boolean>((resolve) => {
        const fail = () => {
          node.port.removeEventListener("message", onMsg);
          clearTimeout(timer);
          resolve(false);
        };
        const timer = setTimeout(fail, 15000);
        node.onprocessorerror = fail;
        const onMsg = (e: MessageEvent) => {
          if (e.data.type === "loaded") {
            node.port.removeEventListener("message", onMsg);
            this.namLoudness = e.data.ok ? e.data.loudness : null;
            clearTimeout(timer);
            if (!e.data.ok) this.modelError = "That .nam file couldn’t be loaded (unsupported or damaged).";
            resolve(true);
          } else if (e.data.type === "error") fail();
        };
        node.port.addEventListener("message", onMsg);
        node.port.start();
        node.port.postMessage({ type: "load", json });
      });
      if (!ok) {
        this.namBroken = true;
        this.modelError = "The amp-model engine couldn’t start in this browser, so the built-in amp is playing instead.";
        if (this.settings) this.apply(this.settings);
        return;
      }
      if (this.settings) this.applyAmpLevels(this.settings);
    })();
  }

  private async loadIr(cab: CabType) {
    if (this.loadedIr === cab) return;
    this.loadedIr = cab;
    const tone = await getUserTone(cab.slice(5));
    if (!tone || tone.kind !== "ir") return;
    try {
      const buf = await this.ctx.decodeAudioData((tone.data as ArrayBuffer).slice(0));
      this.cabConv.normalize = true;
      this.cabConv.buffer = buf;
    } catch {
      /* not a readable audio file */
    }
  }

  private applyAmpLevels(s: RigSettings) {
    const t = this.ctx.currentTime;
    // NAM models expect a guitar-level input; normalise their output with the model's loudness
    const inputGain = 0.25 + s.amp.gain * 2.5;
    const loud = this.namLoudness ?? -24;
    const outputGain = db2gain(-20 - loud) * (0.4 + s.amp.master);
    this.nam?.port.postMessage({ type: "gain", input: inputGain, output: outputGain });
    this.cleanPre.gain.setTargetAtTime(0.6 + s.amp.gain * 2, t, 0.02);
    this.cleanShaper.curve = shaperCurve("clean", s.amp.gain);
    this.ampSelect.clean.gain.setTargetAtTime(s.amp.model === "clean" ? (0.5 + s.amp.master) / (0.6 + s.amp.gain * 1.2) : 0, t, 0.02);
  }

  apply(s: RigSettings): Promise<void> {
    this.settings = s;
    const t = this.ctx.currentTime;
    let amp = s.guitar === "acoustic" ? ({ ...s.amp, model: "none" } as RigSettings["amp"]) : s.amp;
    const cab = s.guitar === "acoustic" ? "off" : s.cab;

    this.compSw.set(s.compressor.on);
    this.comp.threshold.setTargetAtTime(-12 - s.compressor.amount * 28, t, 0.02);
    this.comp.ratio.setTargetAtTime(3 + s.compressor.amount * 7, t, 0.02);
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.12;
    this.compMakeup.gain.setTargetAtTime(db2gain(s.compressor.amount * 12), t, 0.02);

    this.driveSw.set(s.drive.on);
    this.driveShaper.curve = shaperCurve("drive", s.drive.drive);
    this.driveTone.frequency.setTargetAtTime(1200 + s.drive.tone * 5800, t, 0.02);
    this.driveLevel.gain.setTargetAtTime(0.25 + s.drive.level * 0.9, t, 0.02);

    const wantsNam = amp.model.startsWith("nam:") || amp.model.startsWith("user:");
    if (!wantsNam) this.modelError = null;
    if (wantsNam && this.namBroken) amp = { ...amp, model: "clean" };
    const isNam = wantsNam && !this.namBroken;
    this.ampSelect.none.gain.setTargetAtTime(amp.model === "none" ? 1 : 0, t, 0.02);
    this.ampSelect.nam.gain.setTargetAtTime(isNam ? 1 : 0, t, 0.02);
    this.bass.gain.setTargetAtTime(amp.bass * 10, t, 0.02);
    this.mid.gain.setTargetAtTime(amp.mid * 10, t, 0.02);
    this.treble.gain.setTargetAtTime(amp.treble * 10, t, 0.02);
    this.master.gain.setTargetAtTime(amp.model === "none" ? 1 : 1, t, 0.02);
    this.applyAmpLevels({ ...s, amp });
    if (isNam) this.ready = this.loadNamModel(amp.model);
    else this.ready = Promise.resolve();

    const isIr = cab.startsWith("user:");
    this.cabSelect.off.gain.setTargetAtTime(cab === "off" ? 1 : 0, t, 0.02);
    this.cabSelect.sim.gain.setTargetAtTime(cab === "1x12" || cab === "2x12" || cab === "4x12" ? 1 : 0, t, 0.02);
    this.cabSelect.ir.gain.setTargetAtTime(isIr ? 1 : 0, t, 0.02);
    if (cab === "1x12" || cab === "2x12" || cab === "4x12") {
      const def = CABS[cab];
      const [hpf, low, dip, pres, lp1, lp2] = this.cabFilters;
      hpf.frequency.value = def.hpf;
      low.frequency.value = def.low[0];
      low.gain.value = def.low[1];
      dip.frequency.value = def.dip[0];
      dip.gain.value = def.dip[1];
      pres.frequency.value = def.presence[0];
      pres.gain.value = def.presence[1];
      lp1.frequency.value = def.lpf;
      lp1.Q.value = 0.9;
      lp2.frequency.value = def.lpf * 1.3;
      lp2.Q.value = 0.6;
      this.cabSimOut.gain.value = 1.4;
    }
    if (isIr) this.ready = Promise.all([this.ready, this.loadIr(cab)]).then(() => undefined);

    this.chorusSw.set(s.chorus.on);
    this.chorusLfo.frequency.setTargetAtTime(0.2 + s.chorus.rate * 2.5, t, 0.05);
    this.chorusDepth.gain.setTargetAtTime(0.0005 + s.chorus.depth * 0.004, t, 0.05);

    this.applyDelayTime(s.delay.time);
    this.delayFb.gain.setTargetAtTime(s.delay.on ? s.delay.feedback * 0.75 : 0, t, 0.03);
    this.delayWet.gain.setTargetAtTime(s.delay.on ? s.delay.mix : 0, t, 0.03);
    return this.ready;
  }

  /** Clears amp-model state between songs so old notes don't ring through. */
  reset() {
    this.nam?.port.postMessage({ type: "reset" });
  }
}
