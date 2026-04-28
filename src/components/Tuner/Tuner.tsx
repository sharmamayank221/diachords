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
          className="font-Space-Grotesk font-bold leading-none tracking-tight transition-all duration-200"
          style={{
            fontSize: "clamp(48px, 12vw, 96px)",
            color: isListening && detectedNote ? "#00eea5" : "#333",
            filter: isListening && detectedNote ? "drop-shadow(0 0 20px rgba(0,238,165,0.4))" : "none",
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

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────────
  const DesktopLayout = (
    <div className="px-8 pt-6 pb-16">
      {/* Page title */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-Space-Grotesk font-bold text-[64px] leading-none tracking-[-2px] text-white">Guitar Tuner</h2>
          <p className="font-Inter text-[#adaaaa] text-[13px] tracking-[1.4px] uppercase mt-2">CHROMATIC PITCH DETECTION</p>
        </div>
        <button
          onClick={isListening ? stopListening : startListening}
          className="flex items-center gap-3 px-8 py-4 rounded-full font-Space-Grotesk font-bold text-[16px] transition-all"
          style={{
            background: isListening ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)",
            color: isListening ? "#ef4444" : "#005c3d",
            border: isListening ? "1px solid rgba(239,68,68,0.3)" : "none",
          }}
        >
          <MicIcon active={isListening} />
          {isListening ? "Stop Tuning" : "Start Tuning"}
        </button>
      </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-12 gap-8">

            {/* Left: Gauge + Strings + Mode */}
            <div className="col-span-7 flex flex-col gap-6">
              {/* Mode + Auto-tune */}
              <div className="bg-[#131313] rounded-2xl px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="font-Inter text-[11px] text-[#adaaaa] tracking-[2px] uppercase">MODE</p>
                    <p className="font-Space-Grotesk font-bold text-white text-[20px]">{TUNING_MODES[tuningMode].label}</p>
                  </div>
                  {/* Tuning mode selector */}
                  <div className="flex gap-2">
                    {TUNING_MODES.map((m, i) => (
                      <button key={i} onClick={() => setTuningMode(i)}
                        className={`px-3 py-1 rounded-full text-[11px] font-Inter transition-all ${i === tuningMode ? "bg-[#aeffd4] text-[#005c3d] font-bold" : "bg-[#262626] text-[#adaaaa] hover:bg-[#333]"}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setAutoTune(!autoTune)}
                  className="flex items-center gap-3 bg-[#20201f] rounded-full px-4 py-2">
                  <span className="font-Inter font-semibold text-[12px] text-[#adaaaa]">AUTO-TUNE</span>
                  <div className={`relative w-12 h-6 rounded-full transition-colors ${autoTune ? "bg-[#10feb0]" : "bg-[#333]"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${autoTune ? "right-1 bg-[#005c3d]" : "left-1 bg-[#777]"}`} />
                  </div>
                </button>
              </div>

              {/* Gauge + status */}
              <div className="bg-[#131313] rounded-2xl p-8 flex flex-col items-center gap-4">
                <div className="w-full max-w-[480px]">{Gauge}</div>
                {StatusBadge}
              </div>

              {/* String selectors */}
              <div className="bg-[#131313] rounded-2xl px-6 py-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="font-Inter text-[12px] text-[#adaaaa] uppercase tracking-[1.2px]">STRING SELECTOR</p>
                  <p className="font-Inter text-[12px] text-[#adaaaa]">Tap to play reference tone</p>
                </div>
                <StringButtons />
              </div>

              {/* Precision card */}
              {PrecisionCard}
            </div>

            {/* Right: Info panels */}
            <div className="col-span-5 flex flex-col gap-6">

              {/* All strings status */}
              <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-0.5 bg-[#aeffd4]" />
                  <h3 className="font-Space-Grotesk font-bold text-white text-[16px]">All Strings Status</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {GUITAR_STRINGS.map((s, i) => {
                    const st = stringTuneStatus[s.string];
                    const isAct = i === activeStringIdx;
                    return (
                      <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isAct ? "bg-[#1a1a1a]" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center">
                            <span className="font-Space-Grotesk font-bold text-[14px]" style={{ color: st === "perfect" ? "#10feb0" : "#adaaaa" }}>{s.label}</span>
                          </div>
                          <div>
                            <p className="font-Manrope font-medium text-white text-[13px]">String {7 - s.string} — {s.note}</p>
                            <p className="font-Inter text-[11px] text-[#adaaaa]">{s.frequency} Hz</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {st ? (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[st] }} />
                              <span className="font-Inter text-[11px] uppercase tracking-wide" style={{ color: STATUS_COLOR[st] }}>{st}</span>
                            </>
                          ) : (
                            <span className="font-Inter text-[11px] text-[#555] uppercase">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tuning Tips */}
              <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-0.5 bg-[#aeffd4]" />
                  <h3 className="font-Space-Grotesk font-bold text-white text-[16px]">Tuning Tips</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    "Pluck one string at a time and let it ring clearly",
                    "Tune in a quiet environment for best accuracy",
                    "Green = in tune (±5 cents). Red = flat. Orange = sharp",
                    "Tune low E first, then work your way to high e",
                    "Use Auto-Tune to detect the closest string automatically",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#aeffd4] mt-1.5 shrink-0" />
                      <p className="font-Manrope text-[#adaaaa] text-[13px] leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practice Tip glassmorphism */}
              <div className="rounded-2xl p-6 border border-white/5 flex flex-col gap-3"
                style={{ background: "rgba(38,38,38,0.4)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#82e9ff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>
                  <span className="font-Space-Grotesk font-bold text-[#82e9ff] text-[13px] tracking-wider">PRO TIP</span>
                </div>
                <p className="font-Manrope text-[#adaaaa] text-[13px] leading-relaxed">
                  Tune before every practice session. Temperature and playing affect string tension — a quick re-tune keeps you sounding great.
                </p>
              </div>
            </div>
          </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">{MobileLayout}</div>
      <div className="hidden lg:block">{DesktopLayout}</div>
    </>
  );
}
