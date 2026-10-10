import React from "react";
import { initAudio, playNote } from "@/utils/audioUtils";
import { detectPitchYin } from "@/utils/pitch";

// ── Tunings ──────────────────────────────────────────────────────────────────
// Notes are listed low string (6) → high string (1).

const TUNINGS = [
  { label: "Standard", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  { label: "Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "E4"] },
  { label: "Open G", notes: ["D2", "G2", "D3", "G3", "B3", "D4"] },
  { label: "Half-step down", notes: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"] },
  { label: "DADGAD", notes: ["D2", "A2", "D3", "G3", "A3", "D4"] },
];

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(note: string): number {
  const m = note.match(/^([A-G])(#|b)?(\d)$/)!;
  return (Number(m[3]) + 1) * 12 + LETTER[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
const midiToFreq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const centsBetween = (freq: number, target: number) => 1200 * Math.log2(freq / target);

// ── Detection tuning knobs ───────────────────────────────────────────────────

const IN_TUNE_CENTS = 5;
const HOLD_TO_MARK_MS = 500; // stay in tune this long to tick the string off
const SILENCE_RESET_MS = 700; // go back to "play a string" after this much quiet
const DETECT_EVERY_MS = 50;
// YIN is level-independent, so this only needs to reject silence/hiss. Without the browser's
// auto-gain, an interface or laptop mic can be quiet, so keep it low (≈ −56 dBFS).
const MIN_RMS = 0.0015;
const QUIET_HINT_MS = 2500; // show "no sound" help after this long under the gate
const CLIP_LEVEL = 0.98;
const DEVICE_KEY = "tuner-input-device";
const SWITCH_MARGIN_CENTS = 150; // auto mode: hysteresis before jumping to another string

interface Reading {
  freq: number;
  name: string; // detected note, e.g. "G#"
  octave: number;
  targetIdx: number;
  cents: number; // vs the target string, smoothed
}

type MicError = "denied" | "notfound" | "unsupported" | "other";

const MIC_ERROR_TEXT: Record<MicError, string> = {
  denied: "Microphone access is blocked. Allow it in your browser’s site settings, then try again.",
  notfound: "No microphone found. Plug one in or use a device with a built-in mic.",
  unsupported: "This browser can’t use the microphone here. Try Chrome, Safari or Firefox over https.",
  other: "Couldn’t start the microphone. Check that no other app is using it and try again.",
};

const MicIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export default function Tuner() {
  const [tuningIdx, setTuningIdx] = React.useState(0);
  const [autoDetect, setAutoDetect] = React.useState(true);
  const [lockedIdx, setLockedIdx] = React.useState(0);
  const [listening, setListening] = React.useState(false);
  const [micError, setMicError] = React.useState<MicError | null>(null);
  const [reading, setReading] = React.useState<Reading | null>(null);
  const [tuned, setTuned] = React.useState<Set<number>>(new Set());
  const [playingRef, setPlayingRef] = React.useState<number | null>(null);
  const [levelDb, setLevelDb] = React.useState(-100);
  const [inputHint, setInputHint] = React.useState<"quiet" | "clipping" | null>(null);
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = React.useState<string>("");

  const tuning = TUNINGS[tuningIdx];
  const preferFlats = tuning.notes.some((n) => n.includes("b"));
  const strings = React.useMemo(
    () =>
      tuning.notes.map((n, i) => {
        const midi = noteToMidi(n);
        return { idx: i, stringNumber: 6 - i, note: n, name: n.replace(/\d/, ""), midi, freq: midiToFreq(midi) };
      }),
    [tuning]
  );

  // Latest settings for the detection loop, which outlives renders
  const live = React.useRef({ strings, autoDetect, lockedIdx, preferFlats });
  live.current = { strings, autoDetect, lockedIdx, preferFlats };

  const audio = React.useRef<{
    ctx: AudioContext;
    stream: MediaStream;
    analysers: AnalyserNode[]; // one per input channel
    buf: Float32Array;
    scratch: Float32Array;
    timer: ReturnType<typeof setInterval>;
  } | null>(null);
  const history = React.useRef<number[]>([]);
  const smoothed = React.useRef<{ targetIdx: number; cents: number } | null>(null);
  const lastHeard = React.useRef(0);
  const inTuneSince = React.useRef<{ idx: number; at: number } | null>(null);
  const muteUntil = React.useRef(0); // ignore the mic while our own reference note rings
  const quietSince = React.useRef(0);
  const clipUntil = React.useRef(0);

  const tick = React.useCallback(() => {
    const a = audio.current;
    if (!a) return;
    const now = performance.now();
    // 2-in interfaces (e.g. Scarlett Solo: mic on input 1, guitar on input 2) put each
    // input on its own channel, so measure every channel and analyse the loudest one.
    let rms = 0;
    let peak = 0;
    for (const analyser of a.analysers) {
      analyser.getFloatTimeDomainData(a.scratch);
      let sum = 0;
      let p = 0;
      for (let i = 0; i < a.scratch.length; i++) {
        const v = a.scratch[i];
        sum += v * v;
        if (Math.abs(v) > p) p = Math.abs(v);
      }
      const chRms = Math.sqrt(sum / a.scratch.length);
      if (chRms > rms) {
        rms = chRms;
        peak = p;
        a.buf.set(a.scratch);
      }
    }

    // input meter + "is anything arriving?" diagnostics
    const db = rms > 0 ? Math.max(-100, Math.round(20 * Math.log10(rms))) : -100;
    setLevelDb((prev) => (Math.abs(prev - db) >= 1 ? db : prev));
    if (peak >= CLIP_LEVEL) clipUntil.current = now + 1500;
    if (rms >= MIN_RMS) quietSince.current = now;
    const hint = now < clipUntil.current ? "clipping" : now - quietSince.current > QUIET_HINT_MS ? "quiet" : null;
    setInputHint((prev) => (prev === hint ? prev : hint));

    const pitch = now > muteUntil.current && rms > MIN_RMS ? detectPitchYin(a.buf, a.ctx.sampleRate) : null;
    if (!pitch || pitch < 60 || pitch > 1000) {
      if (now - lastHeard.current > SILENCE_RESET_MS) {
        history.current = [];
        smoothed.current = null;
        inTuneSince.current = null;
        setReading((r) => (r ? null : r));
      }
      return;
    }
    lastHeard.current = now;

    // median of the last few readings knocks out single-frame octave glitches
    history.current = [...history.current.slice(-4), pitch];
    const freq = [...history.current].sort((x, y) => x - y)[Math.floor(history.current.length / 2)];

    const { strings: s, autoDetect: auto, lockedIdx: locked, preferFlats: flats } = live.current;
    let targetIdx = locked;
    if (auto) {
      const distances = s.map((str) => Math.abs(centsBetween(freq, str.freq)));
      const best = distances.indexOf(Math.min(...distances));
      const current = smoothed.current?.targetIdx;
      targetIdx =
        current !== undefined && current !== best && distances[current] - distances[best] < SWITCH_MARGIN_CENTS
          ? current
          : best;
    }

    const raw = centsBetween(freq, s[targetIdx].freq);
    const prev = smoothed.current;
    const cents = prev && prev.targetIdx === targetIdx ? prev.cents * 0.55 + raw * 0.45 : raw;
    smoothed.current = { targetIdx, cents };

    if (Math.abs(cents) <= IN_TUNE_CENTS) {
      if (inTuneSince.current?.idx !== targetIdx) inTuneSince.current = { idx: targetIdx, at: now };
      else if (now - inTuneSince.current.at > HOLD_TO_MARK_MS) {
        setTuned((t) => (t.has(targetIdx) ? t : new Set(t).add(targetIdx)));
      }
    } else {
      inTuneSince.current = null;
    }

    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    setReading({
      freq,
      name: (flats ? FLATS : SHARPS)[((midi % 12) + 12) % 12],
      octave: Math.floor(midi / 12) - 1,
      targetIdx,
      cents,
    });
  }, []);

  const stop = React.useCallback(() => {
    const a = audio.current;
    if (a) {
      clearInterval(a.timer);
      a.stream.getTracks().forEach((t) => t.stop());
      a.ctx.close().catch(() => {});
    }
    audio.current = null;
    history.current = [];
    smoothed.current = null;
    setListening(false);
    setReading(null);
  }, []);

  const refreshDevices = React.useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput" && d.deviceId));
    } catch {
      setDevices([]);
    }
  }, []);

  const start = async (requestedId?: string) => {
    setMicError(null);
    let preferred = requestedId;
    if (preferred === undefined) {
      try {
        preferred = localStorage.getItem(DEVICE_KEY) ?? undefined;
      } catch {
        preferred = undefined;
      }
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("unsupported");
      return;
    }
    try {
      // the browser's voice-call processing distorts pitch, so switch it all off
      // ask for both channels: Chrome otherwise may keep only input 1 of a 2-in interface
      const processingOff = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 2 },
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: preferred ? { ...processingOff, deviceId: { exact: preferred } } : processingOff,
        });
      } catch (err: any) {
        // a remembered interface that's been unplugged: fall back to the default input
        if (!preferred || (err?.name !== "OverconstrainedError" && err?.name !== "NotFoundError")) throw err;
        stream = await navigator.mediaDevices.getUserMedia({ audio: processingOff });
      }
      const activeId = stream.getAudioTracks()[0]?.getSettings().deviceId ?? "";
      setDeviceId(activeId);
      refreshDevices();
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      // always split two ways: a mono input just leaves channel 2 silent
      const channels = 2;
      const splitter = ctx.createChannelSplitter(channels);
      source.connect(splitter);
      const analysers = Array.from({ length: channels }, (_, ch) => {
        const an = ctx.createAnalyser();
        an.fftSize = 4096; // ≥2 periods of a low D (73 Hz)
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
      quietSince.current = performance.now();
      setInputHint(null);
      setListening(true);
    } catch (e: any) {
      setMicError(
        e?.name === "NotAllowedError" || e?.name === "SecurityError"
          ? "denied"
          : e?.name === "NotFoundError" || e?.name === "OverconstrainedError"
          ? "notfound"
          : "other"
      );
    }
  };

  React.useEffect(() => stop, [stop]);

  // plugging an interface in or out updates the input list
  React.useEffect(() => {
    if (!listening || !navigator.mediaDevices?.addEventListener) return;
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [listening, refreshDevices]);

  const changeDevice = async (id: string) => {
    try {
      localStorage.setItem(DEVICE_KEY, id);
    } catch {
      // storage unavailable: the choice just won't be remembered
    }
    stop();
    await start(id);
  };

  // a new tuning means new targets: progress starts over
  React.useEffect(() => {
    setTuned(new Set());
    smoothed.current = null;
    inTuneSince.current = null;
  }, [tuningIdx]);

  const selectString = (idx: number) => {
    setAutoDetect(false);
    setLockedIdx(idx);
  };

  const playReference = async (idx: number) => {
    await initAudio();
    muteUntil.current = performance.now() + 2200;
    history.current = [];
    smoothed.current = null;
    setPlayingRef(idx);
    playNote(strings[idx].midi);
    setTimeout(() => setPlayingRef((p) => (p === idx ? null : p)), 2000);
  };

  // ── Derived display ────────────────────────────────────────────────────────
  const targetIdx = reading?.targetIdx ?? (autoDetect ? null : lockedIdx);
  const target = targetIdx !== null ? strings[targetIdx] : null;
  const cents = reading?.cents ?? 0;
  const inTune = !!reading && Math.abs(cents) <= IN_TUNE_CENTS;
  const semis = Math.round(Math.abs(cents) / 100);
  const status = !listening
    ? null
    : !reading
    ? { text: target ? `Play the ${target.name} string` : "Play any string", tone: "idle" as const }
    : inTune
    ? { text: "In tune", tone: "good" as const }
    : {
        text: `${cents < 0 ? "Tighten ↑" : "Loosen ↓"}  ${
          semis >= 1 ? `${semis} semitone${semis > 1 ? "s" : ""} ${cents < 0 ? "flat" : "sharp"}` : `${Math.abs(Math.round(cents))}¢ ${cents < 0 ? "flat" : "sharp"}`
        }`,
        tone: "off" as const,
      };
  const accent = inTune ? "#1BD79E" : reading ? "#f59e0b" : "#3f3f46";

  // gauge geometry: ±50 cents maps to ±70°
  const angle = Math.max(-70, Math.min(70, (cents / 50) * 70));
  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [150 + r * Math.cos(rad), 160 + r * Math.sin(rad)];
  };
  const [gx1, gy1] = polar(-7, 130);
  const [gx2, gy2] = polar(7, 130);

  return (
    <div className="max-w-2xl mx-auto text-white">
      {/* Tuning picker */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 md:justify-center" role="radiogroup" aria-label="Tuning">
        {TUNINGS.map((t, i) => {
          const active = i === tuningIdx;
          return (
            <button
              key={t.label}
              role="radio"
              aria-checked={active}
              onClick={() => setTuningIdx(i)}
              className={`shrink-0 h-9 px-4 rounded-full font-Inter text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                active ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#161616] text-gray-300 hover:bg-[#222]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center font-Inter text-xs text-gray-500 tracking-wide">
        {tuning.notes.map((n) => n.replace(/\d/, "")).join(" · ")}
      </p>

      {/* Gauge card */}
      <div className="relative mt-5 rounded-3xl bg-[#0f0f0f] border border-white/5 px-4 md:px-8 pt-6 pb-6">
        <svg viewBox="0 0 300 175" className="w-full max-w-md mx-auto block" aria-hidden>
          {/* scale */}
          <path d={`M ${polar(-70, 130).join(" ")} A 130 130 0 0 1 ${polar(70, 130).join(" ")}`} fill="none" stroke="#262626" strokeWidth={10} strokeLinecap="round" />
          <path d={`M ${gx1} ${gy1} A 130 130 0 0 1 ${gx2} ${gy2}`} fill="none" stroke="#1BD79E" strokeOpacity={inTune ? 1 : 0.45} strokeWidth={10} />
          {Array.from({ length: 11 }, (_, i) => {
            const c = -50 + i * 10;
            const deg = (c / 50) * 70;
            const major = c % 50 === 0;
            const [x1, y1] = polar(deg, 112);
            const [x2, y2] = polar(deg, major ? 100 : 106);
            return <line key={c} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c === 0 ? "#1BD79E" : "#52525b"} strokeWidth={major ? 2 : 1} />;
          })}
          {[-50, 0, 50].map((c) => {
            const [x, y] = polar((c / 50) * 70, 88);
            return (
              <text key={c} x={x} y={y + 3} textAnchor="middle" fontSize={9} fill="#71717a" fontFamily="Inter, sans-serif">
                {c === 0 ? "0" : c > 0 ? `+${c}` : `−${-c}`}
              </text>
            );
          })}
          {/* needle */}
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "150px 160px", transition: "transform 120ms ease-out" }}>
            <line x1={150} y1={160} x2={150} y2={38} stroke={reading ? accent : "#3f3f46"} strokeWidth={3} strokeLinecap="round" />
          </g>
          <circle cx={150} cy={160} r={6} fill={reading ? accent : "#3f3f46"} />
        </svg>

        {/* Note + instruction */}
        <div className="text-center -mt-2">
          <div className="font-Lora leading-none transition-colors" style={{ fontSize: "clamp(56px, 14vw, 88px)", color: reading ? (inTune ? "#1BD79E" : "#fff") : "#3f3f46" }}>
            {reading ? reading.name : target ? target.name : "—"}
            {reading && <span className="font-Inter text-2xl align-top text-gray-500 ml-1">{reading.octave}</span>}
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 h-7 font-Inter text-lg font-semibold ${
              status?.tone === "good" ? "text-[#1BD79E]" : status?.tone === "off" ? "text-[#f59e0b]" : "text-gray-400"
            }`}
          >
            {status?.tone === "good" && "✓ "}
            {status?.text}
          </p>
          <p className="mt-1 h-5 font-Inter text-xs text-gray-500">
            {target &&
              listening &&
              `Target ${target.note} · ${target.freq.toFixed(1)} Hz${reading ? ` · hearing ${reading.freq.toFixed(1)} Hz` : ""}`}
          </p>
        </div>

        {/* Start / stop */}
        <div className="mt-5 flex flex-col items-center gap-3">
          {listening ? (
            <button
              onClick={stop}
              className="h-11 px-6 rounded-full border border-white/15 text-gray-300 font-Inter text-sm font-semibold hover:border-white/40 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            >
              Stop listening
            </button>
          ) : (
            <button
              onClick={() => start()}
              className="h-14 px-8 rounded-full bg-[#1BD79E] text-black font-Inter text-base font-semibold inline-flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1BD79E] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <MicIcon />
              Start tuning
            </button>
          )}
          {!listening && !micError && (
            <p className="font-Inter text-xs text-gray-500 text-center max-w-xs">
              Uses your microphone to hear each string. Nothing is recorded or sent anywhere.
            </p>
          )}
          {micError && (
            <p role="alert" className="font-Inter text-sm text-[#f59e0b] text-center max-w-sm">
              {MIC_ERROR_TEXT[micError]}
            </p>
          )}
        </div>

        {/* Input: which device, how loud, and help when nothing arrives */}
        {listening && (
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <label htmlFor="tuner-input" className="font-Inter text-xs uppercase tracking-wider text-gray-500 shrink-0">
                Input
              </label>
              <select
                id="tuner-input"
                value={deviceId}
                onChange={(e) => changeDevice(e.target.value)}
                className="flex-1 min-w-0 h-10 rounded-lg bg-[#161616] border border-white/10 px-3 font-Inter text-sm text-white focus-visible:ring-2 focus-visible:ring-[#1BD79E] outline-none"
              >
                {devices.length === 0 && <option value={deviceId}>Default microphone</option>}
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Input ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3" aria-label={`Input level ${levelDb} decibels`}>
              <span className="font-Inter text-xs uppercase tracking-wider text-gray-500 shrink-0 w-10">Level</span>
              <div className="relative flex-1 h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((levelDb + 60) / 60) * 100))}%`,
                    background: inputHint === "clipping" ? "#f59e0b" : levelDb > 20 * Math.log10(MIN_RMS) ? "#1BD79E" : "#52525b",
                  }}
                />
              </div>
              <span className="font-Inter text-xs tabular-nums text-gray-400 w-14 text-right">
                {levelDb <= -100 ? "—" : `${levelDb} dB`}
              </span>
            </div>

            {inputHint === "quiet" && (
              <p role="alert" className="font-Inter text-sm text-[#f59e0b] leading-relaxed">
                No sound is reaching the tuner. If your guitar is plugged into an audio interface or amp
                USB, pick it under <strong className="font-semibold">Input</strong> and turn its gain up. An
                unplugged electric is very quiet, so play close to the mic.
              </p>
            )}
            {inputHint === "clipping" && (
              <p role="alert" className="font-Inter text-sm text-[#f59e0b] leading-relaxed">
                The input is clipping. Turn the gain down on your interface (or the guitar volume a little)
                for a steadier reading. Use a clean sound, as distortion confuses pitch detection.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Strings */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={autoDetect}
              onClick={() => setAutoDetect((a) => !a)}
              className={`relative h-6 w-11 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${autoDetect ? "bg-[#1BD79E]" : "bg-[#333]"}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${autoDetect ? "left-6" : "left-1"}`} />
            </button>
            <span className="font-Inter text-sm text-gray-300">
              {autoDetect ? "Detect string automatically" : `Locked to ${strings[lockedIdx].name} (string ${strings[lockedIdx].stringNumber})`}
            </span>
          </label>
          <span className="font-Inter text-sm text-gray-400 shrink-0">
            <span className={tuned.size === 6 ? "text-[#1BD79E] font-semibold" : "text-white font-semibold"}>{tuned.size}</span> of 6 in tune
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {strings.map((s) => {
            const isTarget = targetIdx === s.idx;
            const done = tuned.has(s.idx);
            return (
              <div key={s.idx} className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => selectString(s.idx)}
                  aria-pressed={!autoDetect && lockedIdx === s.idx}
                  aria-label={`Tune string ${s.stringNumber}, ${s.name}${done ? ", in tune" : ""}`}
                  className={`relative w-full h-14 rounded-xl flex flex-col items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                    isTarget ? "bg-[#1BD79E] text-black" : done ? "bg-[#1BD79E]/10 text-[#1BD79E] border border-[#1BD79E]/40" : "bg-[#161616] text-white hover:bg-[#222]"
                  }`}
                >
                  <span className="font-Lora text-xl leading-none">{s.name}</span>
                  <span className={`font-Inter text-[10px] mt-1 ${isTarget ? "text-black/60" : "text-gray-500"}`}>
                    {done ? "✓ tuned" : `string ${s.stringNumber}`}
                  </span>
                </button>
                <button
                  onClick={() => playReference(s.idx)}
                  aria-label={`Play reference ${s.note}`}
                  title={`Hear ${s.note}`}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                    playingRef === s.idx ? "bg-[#1BD79E] text-black" : "text-gray-400 bg-[#161616] hover:text-[#1BD79E]"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center font-Inter text-xs text-gray-500">
          Tap a string to lock onto it · tap the speaker to hear its reference note
        </p>
      </div>
    </div>
  );
}
