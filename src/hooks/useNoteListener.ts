import { useCallback, useEffect, useRef, useState } from "react";
import { detectPitchYin } from "@/utils/pitch";

// Listens to the mic and reports the note being played (same audio path as the tuner):
// browser voice processing off, both channels of 2-in interfaces (Scarlett Solo guitar on
// input 2), a silence gate, and the note clears shortly after the string stops ringing.

const DETECT_EVERY_MS = 50;
const MIN_RMS = 0.0015;
const CLEAR_AFTER_MS = 600;

export type ListenError = "denied" | "notfound" | "unsupported" | "other";

export function useNoteListener() {
  const [listening, setListening] = useState(false);
  const [midi, setMidi] = useState<number | null>(null);
  const [error, setError] = useState<ListenError | null>(null);

  const audio = useRef<{
    ctx: AudioContext;
    stream: MediaStream;
    analysers: AnalyserNode[];
    buf: Float32Array;
    scratch: Float32Array;
    timer: ReturnType<typeof setInterval>;
  } | null>(null);
  const history = useRef<number[]>([]);
  const lastHeard = useRef(0);

  const tick = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    let best = 0;
    for (const an of a.analysers) {
      an.getFloatTimeDomainData(a.scratch);
      let sum = 0;
      for (let i = 0; i < a.scratch.length; i++) sum += a.scratch[i] * a.scratch[i];
      const rms = Math.sqrt(sum / a.scratch.length);
      if (rms > best) {
        best = rms;
        a.buf.set(a.scratch);
      }
    }
    const now = performance.now();
    const freq = best > MIN_RMS ? detectPitchYin(a.buf, a.ctx.sampleRate) : null;
    if (!freq || freq < 60 || freq > 1400) {
      if (now - lastHeard.current > CLEAR_AFTER_MS) {
        history.current = [];
        setMidi((m) => (m === null ? m : null));
      }
      return;
    }
    lastHeard.current = now;
    const note = Math.round(69 + 12 * Math.log2(freq / 440));
    // require the same note on two consecutive reads before showing it (kills one-frame glitches)
    history.current = [...history.current.slice(-1), note];
    if (history.current.length === 2 && history.current[0] === history.current[1]) {
      setMidi((m) => (m === note ? m : note));
    }
  }, []);

  const stop = useCallback(() => {
    const a = audio.current;
    if (a) {
      clearInterval(a.timer);
      a.stream.getTracks().forEach((t) => t.stop());
      a.ctx.close().catch(() => {});
    }
    audio.current = null;
    history.current = [];
    setListening(false);
    setMidi(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } },
      });
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const splitter = ctx.createChannelSplitter(2);
      source.connect(splitter);
      const analysers = [0, 1].map((ch) => {
        const an = ctx.createAnalyser();
        an.fftSize = 4096;
        splitter.connect(an, ch);
        return an;
      });
      audio.current = {
        ctx,
        stream,
        analysers,
        buf: new Float32Array(4096),
        scratch: new Float32Array(4096),
        timer: setInterval(tick, DETECT_EVERY_MS),
      };
      setListening(true);
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError" || e?.name === "SecurityError"
          ? "denied"
          : e?.name === "NotFoundError" || e?.name === "OverconstrainedError"
          ? "notfound"
          : "other"
      );
    }
  }, [tick]);

  useEffect(() => stop, [stop]);

  return { listening, midi, error, start, stop };
}

export const LISTEN_ERROR_TEXT: Record<ListenError, string> = {
  denied: "Microphone access is blocked. Allow it in your browser’s site settings, then try again.",
  notfound: "No microphone found. Plug in your interface or use a device with a mic.",
  unsupported: "This browser can’t use the microphone here. Try Chrome, Safari or Firefox over https.",
  other: "Couldn’t start the microphone. Check no other app is using it and try again.",
};
