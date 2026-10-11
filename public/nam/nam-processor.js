// AudioWorklet that runs a Neural Amp Modeler (.nam, A1 or A2) model on the guitar signal.
// The WASM bytes arrive through processorOptions (worklets can't fetch), the model JSON
// through the port. Until a model is loaded, audio passes through untouched.
import createNamModule from "./nam.js";
import { NamWasmModule } from "./NamWasmModule.js";

class NamProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.nam = null;
    this.id = -1;
    this.pendingModel = null;
    this.bypass = true;
    this.inputGain = 1;
    this.outputGain = 1;
    this.scratch = new Float32Array(128);

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "load") {
        if (this.nam) this.load(msg.json);
        else this.pendingModel = msg.json;
      } else if (msg.type === "unload") {
        this.pendingModel = null;
        this.bypass = true;
        if (this.nam) this.nam.unloadModel(this.id);
      } else if (msg.type === "gain") {
        this.inputGain = msg.input;
        this.outputGain = msg.output;
      } else if (msg.type === "reset") {
        if (this.nam && !this.bypass) this.nam.reset(this.id);
      }
    };

    const wasm = options.processorOptions && options.processorOptions.wasm;
    // locateFile stops the Emscripten wrapper calling `new URL()`, which worklets don't have
    let made;
    try {
      made = createNamModule({ wasmBinary: wasm, locateFile: (f) => f });
    } catch (err) {
      this.port.postMessage({ type: "error", message: String(err) });
      return;
    }
    made
      .then((mod) => {
        this.nam = NamWasmModule.fromModule(mod, 128);
        this.nam.setSampleRate(sampleRate);
        this.id = this.nam.createInstance();
        this.port.postMessage({ type: "ready" });
        if (this.pendingModel) {
          this.load(this.pendingModel);
          this.pendingModel = null;
        }
      })
      .catch((err) => this.port.postMessage({ type: "error", message: String(err) }));
  }

  load(json) {
    let ok = false;
    try {
      ok = this.nam.loadModel(this.id, json);
    } catch (err) {
      ok = false;
    }
    this.bypass = !ok;
    const loudness = ok && this.nam.hasModelLoudness(this.id) ? this.nam.getModelLoudness(this.id) : null;
    this.port.postMessage({ type: "loaded", ok, loudness });
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const out = output[0];
    const inp = inputs[0] && inputs[0][0];
    if (!inp) {
      out.fill(0);
    } else if (this.bypass || !this.nam) {
      out.set(inp);
    } else {
      const n = inp.length;
      const buf = n === this.scratch.length ? this.scratch : new Float32Array(n);
      for (let i = 0; i < n; i++) buf[i] = inp[i] * this.inputGain;
      this.nam.process(this.id, buf, out);
      if (this.outputGain !== 1) for (let i = 0; i < n; i++) out[i] *= this.outputGain;
    }
    for (let c = 1; c < output.length; c++) output[c].set(out);
    return true;
  }
}

registerProcessor("nam-processor", NamProcessor);
