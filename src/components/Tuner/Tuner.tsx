import React, { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";

// ── Constants ─────────────────────────────────────────────────────────────────

const GUITAR_STRINGS = [
  { note: "E2", label: "E", frequency: 82.41,  string: 6 },
  { note: "A2", label: "A", frequency: 110.0,  string: 5 },
  { note: "D3", label: "D", frequency: 146.83, string: 4 },
  { note: "G3", label: "G", frequency: 196.0,  string: 3 },
  { note: "B3", label: "B", frequency: 246.94, string: 2 },
  { note: "E4", label: "e", frequency: 329.63, string: 1 },
];

const TUNING_MODES = [
  { label: "Standard E",  notes: ["E2","A2","D3","G3","B3","E4"] },
  { label: "Drop D",      notes: ["D2","A2","D3","G3","B3","E4"] },
  { label: "Open G",      notes: ["D2","G2","D3","G3","B3","D4"] },
  { label: "Half-step ♭", notes: ["Eb2","Ab2","Db3","Gb3","Bb3","Eb4"] },
  { label: "DADGAD",      notes: ["D2","A2","D3","G3","A3","D4"] },
];

const ALL_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// ── Pitch detection ───────────────────────────────────────────────────────────

function autoCorrelate(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1, bestCorrelation = 0, lastCorrelation = 1;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let corr = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) corr += Math.abs(buffer[i] - buffer[i + offset]);
    corr = 1 - corr / MAX_SAMPLES;
    if (corr > 0.9 && corr > lastCorrelation && corr > bestCorrelation) {
      bestCorrelation = corr;
      bestOffset = offset;
    }
    lastCorrelation = corr;
  }
  return bestCorrelation > 0.01 && bestOffset > 0 ? sampleRate / bestOffset : null;
}

function frequencyToNote(freq: number): { note: string; octave: number; cents: number } {
  const semitones = 12 * Math.log2(freq / 440);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);
  const noteIndex = ((rounded % 12) + 12 + 9) % 12;
  const octave = Math.floor((rounded + 9) / 12) + 4;
  return { note: ALL_NOTES[noteIndex], octave, cents };
}

function findClosestString(freq: number) {
  return GUITAR_STRINGS.reduce((best, s) =>
    Math.abs(freq - s.frequency) < Math.abs(freq - best.frequency) ? s : best
  , GUITAR_STRINGS[0]);
}

function getTuningStatus(cents: number): "perfect" | "flat" | "sharp" | "idle" {
  if (Math.abs(cents) <= 5) return "perfect";
  if (cents < -5) return "flat";
  return "sharp";
}

const STATUS_COLOR: Record<string, string> = {
  perfect: "#10feb0", flat: "#ef4444", sharp: "#f59e0b", idle: "#adaaaa",
};
const STATUS_LABEL: Record<string, string> = {
  perfect: "IN TUNE", flat: "TOO FLAT", sharp: "TOO SHARP", idle: "LISTENING...",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="20" viewBox="0 0 18 22" fill="none" stroke={active ? "#10feb0" : "#adaaaa"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="1" width="8" height="13" rx="4" />
      <path d="M1 10s0 8 8 8 8-8 8-8" /><line x1="9" y1="18" x2="9" y2="22" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Tuner() {
  const [isListening, setIsListening] = useState(false);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const [cents, setCents] = useState(0);
  const [closestString, setClosestString] = useState<typeof GUITAR_STRINGS[0] | null>(null);
  const [activeStringIdx, setActiveStringIdx] = useState(0);
  const [tuningMode, setTuningMode] = useState(0);
  const [autoTune, setAutoTune] = useState(true);
  const [playingRef, setPlayingRef] = useState<number | null>(null);
  const [stringTuneStatus, setStringTuneStatus] = useState<Record<number, "perfect" | "flat" | "sharp" | "idle">>({});
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0.1));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const samplerRef = useRef<Tone.Sampler | null>(null);

  useEffect(() => {
    samplerRef.current = new Tone.Sampler({
      urls: { A2:"A2.mp3", A3:"A3.mp3", A4:"A4.mp3", C3:"C3.mp3", C4:"C4.mp3", C5:"C5.mp3",
              D3:"D3.mp3", D4:"D4.mp3", E2:"E2.mp3", E3:"E3.mp3", E4:"E4.mp3",
              G2:"G2.mp3", G3:"G3.mp3", G4:"G4.mp3" },
      baseUrl: "/guitar-acoustic/",
    }).toDestination();
    return () => { samplerRef.current?.dispose(); };
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      audioCtxRef.current.createMediaStreamSource(stream).connect(analyserRef.current);
      setIsListening(true);

      const detect = () => {
        if (!analyserRef.current || !audioCtxRef.current || audioCtxRef.current.state === "closed") return;
        const buf = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buf);
        const freq = autoCorrelate(buf, audioCtxRef.current.sampleRate);
        if (freq && freq > 60 && freq < 1000) {
          const { note, octave, cents: c } = frequencyToNote(freq);
          const cs = findClosestString(freq);
          setDetectedNote(`${note}${octave}`);
          setDetectedFreq(freq);
          setCents(c);
          setClosestString(cs);
          const status = getTuningStatus(c);
          setStringTuneStatus(prev => ({ ...prev, [cs.string]: status }));
          if (autoTune) setActiveStringIdx(GUITAR_STRINGS.findIndex(s => s.string === cs.string));
        }
        // Waveform bars from frequency domain
        const fftBuf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(fftBuf);
        const step = Math.floor(fftBuf.length / 20);
        setWaveformBars(Array.from({ length: 20 }, (_, i) => fftBuf[i * step] / 255));
        rafRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  }, [autoTune]);

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsListening(false);
    setDetectedNote(null);
    setDetectedFreq(null);
    setCents(0);
    setClosestString(null);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const playRefNote = async (idx: number) => {
    await Tone.start();
    setPlayingRef(idx);
    samplerRef.current?.triggerAttackRelease(GUITAR_STRINGS[idx].note, 3);
    setTimeout(() => setPlayingRef(null), 3000);
  };

  const status = isListening && detectedNote ? getTuningStatus(cents) : "idle";
  const needleAngle = Math.max(-45, Math.min(45, (cents / 50) * 45));
  const statusColor = STATUS_COLOR[status];
  const noteName = detectedNote ? detectedNote.replace(/\d/, "") : "—";

  // ── SHARED GAUGE (used in both layouts) ──────────────────────────────────────
  const Gauge = (
    <div className="relative w-full" style={{ aspectRatio: "2/1" }}>
      {/* Arc background */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet">
        {/* Background arc */}
        <path d="M 20 200 A 180 180 0 0 1 380 200" fill="none" stroke="rgba(72,72,71,0.3)" strokeWidth="1.5" />
        {/* Colored arc based on status */}
        {isListening && detectedNote && (
          <path
            d="M 20 200 A 180 180 0 0 1 380 200"
            fill="none"
            stroke={statusColor}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
        )}
        {/* Scale tick marks */}
        {[-50, -20, 0, 20, 50].map((val) => {
          const angle = (val / 50) * 80; // ±80 degrees from top
          const rad = ((angle - 90) * Math.PI) / 180;
          const r = 175;
          const cx = 200 + r * Math.cos(rad);
          const cy = 200 + r * Math.sin(rad);
          const isCenter = val === 0;
          return (
            <line
              key={val}
              x1={cx}
              y1={cy}
              x2={200 + (r - (isCenter ? 18 : 10)) * Math.cos(rad)}
              y2={200 + (r - (isCenter ? 18 : 10)) * Math.sin(rad)}
              stroke={isCenter ? "#10feb0" : "rgba(255,255,255,0.3)"}
              strokeWidth={isCenter ? 2 : 1}
            />
          );
        })}
        {/* Needle */}
        <g transform={`rotate(${needleAngle}, 200, 200)`}>
          <line
            x1="200" y1="200"
            x2="200" y2="20"
            stroke={isListening && detectedNote ? "#aeffd4" : "rgba(255,255,255,0.15)"}
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              filter: isListening && detectedNote
                ? "drop-shadow(0 0 8px rgba(174,255,212,0.6))"
                : "none",
              transition: "transform 0.15s ease-out",
            }}
          />
          <circle cx="200" cy="200" r="5" fill={isListening && detectedNote ? "#aeffd4" : "#333"} />
        </g>
      </svg>

      {/* Center note display */}
      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
        <span
          className="font-Space-Grotesk font-bold leading-none tracking-tight transition-all duration-300"
          style={{
            fontSize: "clamp(48px, 12vw, 96px)",
            color: status === "perfect" ? "#14FFB1"
              : isListening && detectedNote ? "#00eea5"
              : "#333",
            filter: status === "perfect"
              ? "drop-shadow(0 0 40px rgba(20,255,177,0.9)) drop-shadow(0 0 15px rgba(20,255,177,1))"
              : isListening && detectedNote
              ? "drop-shadow(0 0 20px rgba(0,238,165,0.4))"
              : "none",
          }}
        >
          {noteName}
        </span>
        <span className="font-Inter font-medium text-[clamp(11px,2.5vw,14px)] mt-1"
          style={{ color: isListening && detectedNote ? "rgba(16,254,176,0.7)" : "#555" }}>
          {detectedFreq ? `${detectedFreq.toFixed(2)} Hz` : "— Hz"}
        </span>
      </div>

      {/* Scale labels */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-between px-[12%] opacity-40">
        {["-50", "-20", "", "+20", "+50"].map((l, i) => (
          <span key={i} className="font-Inter text-[10px] text-white">{l}</span>
        ))}
      </div>
      {/* Center divider */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-4 bg-[#10feb0]" />
    </div>
  );

  // ── STRING BUTTONS ────────────────────────────────────────────────────────────
  const StringButtons = ({ compact = false }: { compact?: boolean }) => (
    <div className={`grid grid-cols-6 gap-3 ${compact ? "" : ""}`}>
      {GUITAR_STRINGS.map((s, i) => {
        const isActive = i === activeStringIdx;
        const tuneStatus = stringTuneStatus[s.string];
        return (
          <div key={i} className="flex flex-col items-center gap-3">
            {/* Indicator bar */}
            <div className="w-full h-1 rounded-full overflow-hidden bg-[rgba(72,72,71,0.2)]">
              {isActive && (
                <div className="h-full bg-[#aeffd4] w-full"
                  style={{ boxShadow: "0 0 10px rgba(16,254,176,0.6)" }} />
              )}
            </div>
            {/* String button */}
            <button
              onClick={() => { setActiveStringIdx(i); playRefNote(i); }}
              className="relative flex items-center justify-center rounded-xl transition-all duration-200"
              style={{
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
                background: isActive ? "#10feb0" : "#20201f",
                boxShadow: isActive ? "0 8px 8px rgba(16,254,176,0.2)" : "none",
              }}
            >
              {playingRef === i && (
                <span className="absolute inset-0 rounded-xl animate-ping opacity-30 bg-[#10feb0]" />
              )}
              <span
                className="font-Space-Grotesk font-bold relative z-10"
                style={{
                  fontSize: compact ? 16 : 20,
                  color: isActive ? "#005c3d" : tuneStatus === "perfect" ? "#aeffd4" : tuneStatus === "flat" ? "#ef4444" : tuneStatus === "sharp" ? "#f59e0b" : "#adaaaa",
                }}
              >
                {s.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );

  // ── PRECISION CARD ───────────────────────────────────────────────────────────
  const PrecisionCard = (
    <div className="bg-[#131313] rounded-2xl flex items-center justify-between px-6 py-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[rgba(130,233,255,0.1)]">
          <MicIcon active={isListening} />
        </div>
        <div>
          <p className="font-Space-Grotesk font-bold text-white text-base">Input Sensitivity</p>
          <p className="font-Manrope text-[#adaaaa] text-[12px] mt-0.5">
            {isListening ? "High precision mic active" : "Microphone inactive"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-Space-Grotesk font-bold text-[16px]" style={{ color: statusColor }}>
          {isListening && detectedNote ? (cents >= 0 ? "+" : "") + cents : "—"}
        </p>
        <p className="font-Inter text-[10px] uppercase text-[#adaaaa]">CENTS</p>
      </div>
    </div>
  );

  // ── STATUS BADGE ─────────────────────────────────────────────────────────────
  const StatusBadge = (
    <div className="flex items-center justify-center gap-3">
      {isListening && detectedNote && (
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor }} />
      )}
      <span className="font-Inter font-medium text-sm tracking-widest uppercase" style={{ color: statusColor }}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  );

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────────
  const MobileLayout = (
    <div className="max-w-[430px] mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Mode & Toggle */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="font-Inter text-[12px] text-[#adaaaa] tracking-[2.4px] uppercase">MODE</p>
            <p className="font-Space-Grotesk font-bold text-white text-[20px]">
              {TUNING_MODES[tuningMode].label}
            </p>
          </div>
          <button
            onClick={() => setAutoTune(!autoTune)}
            className="flex items-center gap-4 bg-[#20201f] rounded-full px-4 py-2"
          >
            <span className="font-Inter font-semibold text-[12px] text-[#adaaaa]">AUTO-TUNE</span>
            <div className={`relative w-12 h-6 rounded-full transition-colors ${autoTune ? "bg-[#10feb0]" : "bg-[#333]"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${autoTune ? "right-1 bg-[#005c3d]" : "left-1 bg-[#777]"}`} />
            </div>
          </button>
        </div>

        {/* Gauge */}
        {Gauge}

        {/* Status badge */}
        {StatusBadge}

        {/* Start/Stop */}
        <button
          onClick={isListening ? stopListening : startListening}
          className="w-full py-4 rounded-full font-Space-Grotesk font-bold text-[16px] transition-all"
          style={{
            background: isListening
              ? "rgba(239,68,68,0.15)"
              : "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)",
            color: isListening ? "#ef4444" : "#005c3d",
            border: isListening ? "1px solid rgba(239,68,68,0.3)" : "none",
          }}
        >
          {isListening ? "Stop Tuning" : "Start Tuning"}
        </button>

        {/* String Selectors */}
        <StringButtons />

        {/* Precision Card */}
        {PrecisionCard}
    </div>
  );

  // ── DESKTOP LAYOUT (Stitch: Web Tuning Studio) ───────────────────────────────
  const DesktopLayout = (
    <div className="flex flex-col min-h-full">

      {/* ── Tuner header tabs ── */}
      <div className="flex items-center gap-8 px-12 pt-6 pb-0">
        {TUNING_MODES.map((m, i) => (
          <button key={i} onClick={() => setTuningMode(i)}
            className="font-Manrope font-semibold text-[14px] pb-1 transition-colors"
            style={i === tuningMode
              ? { color: "#14FFB1", borderBottom: "2px solid #14FFB1" }
              : { color: "rgba(255,255,255,0.4)" }
            }>
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Main tuner canvas ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-12 py-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "rgba(20,255,177,0.04)", filter: "blur(80px)" }} />

        <div className="relative w-full max-w-3xl flex flex-col items-center">

          {/* Needle area */}
          <div className="relative w-full flex items-end justify-center" style={{ height: 360 }}>
            {/* Semicircle arc */}
            <div className="absolute bottom-0 w-full rounded-full pointer-events-none"
              style={{
                height: "100%",
                border: "1px solid rgba(72,72,71,0.2)",
                clipPath: "ellipse(100% 100% at 50% 100%)",
              }} />

            {/* Cents labels */}
            <div className="absolute bottom-4 w-full flex justify-between px-12 font-Inter text-[10px] uppercase tracking-widest"
              style={{ color: "#adaaaa" }}>
              <span>-50 Cents</span>
              <span style={{ color: "rgba(20,255,177,0.5)" }}>Perfect</span>
              <span>+50 Cents</span>
            </div>

            {/* Note name + frequency */}
            <div className="flex flex-col items-center z-10 mb-16">
              <span className="font-Space-Grotesk font-black leading-none tracking-tighter transition-all duration-300"
                style={{
                  fontSize: "9rem",
                  color: status === "perfect" ? "#14FFB1"
                    : isListening && detectedNote ? "#ffffff"
                    : "#222",
                  filter: status === "perfect"
                    ? "drop-shadow(0 0 60px rgba(20,255,177,0.8)) drop-shadow(0 0 20px rgba(20,255,177,0.9))"
                    : isListening && detectedNote
                    ? `drop-shadow(0 0 30px ${statusColor}50)`
                    : "none",
                }}>
                {noteName}
              </span>
              <span className="font-Space-Grotesk font-medium tracking-[0.4em] -mt-2"
                style={{ fontSize: "1.4rem", color: isListening && detectedNote ? "#14FFB1" : "#333" }}>
                {detectedFreq ? `${detectedFreq.toFixed(2)}` : "—"}{" "}
                <span className="font-Inter font-normal text-[14px] tracking-normal opacity-60">Hz</span>
              </span>
            </div>

            {/* Glowing needle */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom transition-transform duration-75"
              style={{ transform: `translateX(-50%) rotate(${needleAngle}deg)`, height: "100%", width: 2 }}>
              <div className="w-full h-full"
                style={{
                  background: "linear-gradient(to top, transparent 0%, #14FFB1 100%)",
                  boxShadow: isListening && detectedNote ? "0 0 20px rgba(20,255,177,0.6)" : "none",
                  opacity: isListening && detectedNote ? 1 : 0.15,
                }} />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                style={{ background: "#14FFB1", filter: "blur(4px)", opacity: isListening && detectedNote ? 1 : 0 }} />
            </div>

            {/* Static center line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-px"
              style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* String selector pill */}
          <div className="flex items-center gap-3 p-2 rounded-full mt-4"
            style={{ background: "#131313" }}>
            {GUITAR_STRINGS.map((s, i) => {
              const isActive = i === activeStringIdx;
              return (
                <button key={i}
                  onClick={() => { setActiveStringIdx(i); playRefNote(i); }}
                  className="w-14 h-14 rounded-full flex items-center justify-center font-Space-Grotesk font-bold text-[20px] transition-all relative"
                  style={isActive
                    ? { background: "#14FFB1", color: "#005c3d", boxShadow: "0 0 20px rgba(20,255,177,0.3)" }
                    : { color: "#adaaaa" }
                  }>
                  {playingRef === i && <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#14FFB1]" />}
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Auto-Tune / Manual pill */}
          <div className="flex items-center p-1 rounded-full mt-6 border"
            style={{ background: "#000", borderColor: "rgba(72,72,71,0.2)" }}>
            <button onClick={() => setAutoTune(true)}
              className="px-8 py-2.5 rounded-full font-Space-Grotesk font-bold text-[11px] uppercase tracking-widest transition-all"
              style={autoTune
                ? { background: "#262626", color: "#fff" }
                : { color: "#adaaaa" }}>
              Auto-Tune
            </button>
            <button onClick={() => setAutoTune(false)}
              className="px-8 py-2.5 rounded-full font-Space-Grotesk font-bold text-[11px] uppercase tracking-widest transition-all"
              style={!autoTune
                ? { background: "#262626", color: "#fff" }
                : { color: "#adaaaa" }}>
              Manual
            </button>
          </div>

          {/* Start / Stop */}
          <button onClick={isListening ? stopListening : startListening}
            className="mt-6 flex items-center gap-3 px-10 py-3.5 rounded-full font-Space-Grotesk font-bold text-[14px] transition-all"
            style={isListening
              ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }
              : { background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)", color: "#005c3d" }}>
            <MicIcon active={isListening} />
            {isListening ? "Stop Tuning" : "Start Tuning"}
          </button>
        </div>
      </section>

      {/* ── Bottom panel ── */}
      <section className="grid grid-cols-12 gap-5 px-12 pb-10"
        style={{ background: "#131313", borderTop: "1px solid rgba(255,255,255,0.04)", padding: "24px 48px" }}>

        {/* Waveform */}
        <div className="col-span-8 rounded-xl p-5 flex flex-col justify-between overflow-hidden relative"
          style={{ background: "#0a0a0a" }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-Space-Grotesk font-bold text-[11px] uppercase tracking-widest" style={{ color: "#14FFB1" }}>
                Input Waveform
              </h3>
              <p className="font-Inter text-[10px] uppercase mt-0.5 tracking-widest" style={{ color: "#adaaaa" }}>
                Real-time Audio Analysis
              </p>
            </div>
            <span className="font-Inter text-[10px] px-2 py-0.5 rounded tracking-tighter"
              style={{ color: "#14FFB1", background: "rgba(20,255,177,0.1)" }}>
              {isListening ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {waveformBars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm transition-all duration-75"
                style={{
                  height: `${Math.max(4, h * 100)}%`,
                  background: h > 0.6
                    ? "#14FFB1"
                    : `rgba(20,255,177,${0.2 + h * 0.6})`,
                  boxShadow: h > 0.6 ? "0 0 8px rgba(20,255,177,0.3)" : "none",
                }} />
            ))}
          </div>
        </div>

        {/* Input settings */}
        <div className="col-span-4 rounded-xl p-5 flex flex-col gap-4"
          style={{ background: "#1a1a1a" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-Space-Grotesk font-bold text-[11px] uppercase tracking-widest text-white">
              Input Settings
            </h3>
          </div>

          {/* Sensitivity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-Inter text-[10px] uppercase tracking-widest" style={{ color: "#adaaaa" }}>
              <span>Sensitivity</span>
              <span className="text-white">78%</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#000" }}>
              <div className="h-full rounded-full" style={{ width: "78%", background: "#14FFB1", boxShadow: "0 0 8px rgba(20,255,177,0.4)" }} />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isListening ? "animate-pulse" : ""}`}
                style={{ background: isListening ? "#14FFB1" : "#484847" }} />
              <span className="font-Inter text-[10px] uppercase tracking-widest" style={{ color: "#adaaaa" }}>
                {isListening ? "Active" : "Ready"}
              </span>
            </div>
            <button onClick={isListening ? stopListening : startListening}
              className="font-Space-Grotesk font-bold text-[10px] uppercase tracking-widest hover:underline"
              style={{ color: "#14FFB1" }}>
              {isListening ? "Stop" : "Calibrate"}
            </button>
          </div>

          {/* String status mini */}
          <div className="flex gap-2 flex-wrap pt-1">
            {GUITAR_STRINGS.map((s, i) => {
              const st = stringTuneStatus[s.string];
              return (
                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: "#262626" }}>
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background: st ? STATUS_COLOR[st] : "#484847" }} />
                  <span className="font-Space-Grotesk font-bold text-[11px]"
                    style={{ color: st === "perfect" ? "#14FFB1" : "#adaaaa" }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">{MobileLayout}</div>
      <div className="hidden lg:block">{DesktopLayout}</div>
    </>
  );
}
