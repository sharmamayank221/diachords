import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

// ── Detection logic (unchanged) ───────────────────────────────────────────────

const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const CHORD_TYPES: Record<string, { intervals: number[]; name: string }> = {
  major: { intervals: [0, 4, 7], name: "Major" },
  minor: { intervals: [0, 3, 7], name: "Minor" },
  "7":   { intervals: [0, 4, 7, 10], name: "7" },
  maj7:  { intervals: [0, 4, 7, 11], name: "Maj7" },
  m7:    { intervals: [0, 3, 7, 10], name: "m7" },
  dim:   { intervals: [0, 3, 6], name: "dim" },
  aug:   { intervals: [0, 4, 8], name: "aug" },
  sus2:  { intervals: [0, 2, 7], name: "sus2" },
  sus4:  { intervals: [0, 5, 7], name: "sus4" },
  add9:  { intervals: [0, 4, 7, 14], name: "add9" },
  "6":   { intervals: [0, 4, 7, 9], name: "6" },
  m6:    { intervals: [0, 3, 7, 9], name: "m6" },
  "9":   { intervals: [0, 4, 7, 10, 14], name: "9" },
  m9:    { intervals: [0, 3, 7, 10, 14], name: "m9" },
  "5":   { intervals: [0, 7], name: "5 (Power)" },
};

const COMMON_GUITAR_CHORDS: Record<string, { notes: string[]; display: string }> = {
  C_major: { notes: ["C","E","G"], display: "C" },
  D_major: { notes: ["D","F#","A"], display: "D" },
  E_major: { notes: ["E","G#","B"], display: "E" },
  F_major: { notes: ["F","A","C"], display: "F" },
  G_major: { notes: ["G","B","D"], display: "G" },
  A_major: { notes: ["A","C#","E"], display: "A" },
  B_major: { notes: ["B","D#","F#"], display: "B" },
  C_minor: { notes: ["C","D#","G"], display: "Cm" },
  D_minor: { notes: ["D","F","A"], display: "Dm" },
  E_minor: { notes: ["E","G","B"], display: "Em" },
  F_minor: { notes: ["F","G#","C"], display: "Fm" },
  G_minor: { notes: ["G","A#","D"], display: "Gm" },
  A_minor: { notes: ["A","C","E"], display: "Am" },
  B_minor: { notes: ["B","D","F#"], display: "Bm" },
  G_7:  { notes: ["G","B","D","F"],  display: "G7" },
  C_7:  { notes: ["C","E","G","A#"], display: "C7" },
  D_7:  { notes: ["D","F#","A","C"], display: "D7" },
  E_7:  { notes: ["E","G#","B","D"], display: "E7" },
  A_7:  { notes: ["A","C#","E","G"], display: "A7" },
  B_7:  { notes: ["B","D#","F#","A"],display: "B7" },
};

interface DetectedNote { note: string; frequency: number; confidence: number; timestamp: number; }
interface ChordMatch   { chord: string; confidence: number; notes: string[]; }

function autoCorrelate(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  const MAX = Math.floor(SIZE / 2);
  let bestOffset = -1, bestCorr = 0, lastCorr = 1, rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;
  for (let offset = 0; offset < MAX; offset++) {
    let corr = 0;
    for (let i = 0; i < MAX; i++) corr += Math.abs(buffer[i] - buffer[i + offset]);
    corr = 1 - corr / MAX;
    if (corr > 0.9 && corr > lastCorr && corr > bestCorr) { bestCorr = corr; bestOffset = offset; }
    lastCorr = corr;
  }
  return bestCorr > 0.01 && bestOffset > 0 ? sampleRate / bestOffset : null;
}

function frequencyToNote(frequency: number): { note: string; octave: number } {
  const semitones = 12 * Math.log2(frequency / 440);
  const noteIndex = Math.round(semitones) + 9;
  const octave = Math.floor((noteIndex + 3) / 12) + 4;
  return { note: NOTE_NAMES[((noteIndex % 12) + 12) % 12], octave };
}

function matchChord(detectedNotes: string[]): ChordMatch[] {
  const unique = Array.from(new Set(detectedNotes));
  if (unique.length < 2) return [];
  const matches: ChordMatch[] = [];
  for (const [, { notes, display }] of Object.entries(COMMON_GUITAR_CHORDS)) {
    const matched = notes.filter(n => unique.includes(n));
    const conf = matched.length / notes.length;
    if (conf >= 0.66) matches.push({ chord: display, confidence: conf, notes: matched });
  }
  if (matches.length === 0) {
    for (const root of unique) {
      const ri = NOTE_NAMES.indexOf(root);
      for (const [, { intervals, name }] of Object.entries(CHORD_TYPES)) {
        const expected = intervals.map(i => NOTE_NAMES[(ri + i) % 12]);
        const matched  = expected.filter(n => unique.includes(n));
        const conf = matched.length / expected.length;
        if (conf >= 0.66) matches.push({ chord: `${root}${name === "Major" ? "" : name}`, confidence: conf, notes: matched });
      }
    }
  }
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// ── Common chord suggestions ──────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "C",  type: "major" }, { label: "G",  type: "major" }, { label: "D",  type: "major" },
  { label: "A",  type: "major" }, { label: "E",  type: "major" }, { label: "F",  type: "major" },
  { label: "Am", type: "minor" }, { label: "Em", type: "minor" }, { label: "Dm", type: "minor" },
  { label: "G7", type: "7th"  }, { label: "C7", type: "7th"   }, { label: "E7", type: "7th"   },
];

const TYPE_COLOR: Record<string, string> = { major: "#aeffd4", minor: "#82e9ff", "7th": "#f59e0b" };

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? "#10feb0" : "#adaaaa"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10s0 7 7 7 7-7 7-7"/><line x1="12" y1="17" x2="12" y2="22"/>
    </svg>
  );
}

// ── Waveform bars animation ───────────────────────────────────────────────────

function WaveformBars({ active, volume }: { active: boolean; volume: number }) {
  const bars = Array.from({ length: 20 });
  return (
    <div className="flex items-end justify-center gap-[3px] h-12">
      {bars.map((_, i) => {
        const base = 0.15 + 0.15 * Math.sin((i / bars.length) * Math.PI);
        const height = active ? `${Math.max(8, (base + volume * 0.6) * 48)}px` : "4px";
        return (
          <div key={i} className="rounded-full transition-all duration-75"
            style={{
              width: 3,
              height,
              background: active
                ? `rgba(174,255,212,${0.4 + volume * 0.6})`
                : "rgba(72,72,71,0.3)",
              transitionDelay: `${i * 20}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Confidence ring ───────────────────────────────────────────────────────────

function ConfidenceRing({ confidence }: { confidence: number }) {
  const r = 42, circ = 2 * Math.PI * r;
  const offset = circ - (circ * confidence);
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="absolute -inset-4">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(72,72,71,0.2)" strokeWidth="3"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#10feb0" strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.4s ease", filter: "drop-shadow(0 0 6px rgba(16,254,176,0.5))" }}/>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChordRecognition() {
  const [isListening, setIsListening]     = useState(false);
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);
  const [matchedChords, setMatchedChords] = useState<ChordMatch[]>([]);
  const [currentNote, setCurrentNote]     = useState<string | null>(null);
  const [volume, setVolume]               = useState(0);
  const [sensitivity, setSensitivity]     = useState(0.02);
  const [history, setHistory]             = useState<string[]>([]);

  const audioCtxRef    = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const animRef        = useRef<number | null>(null);
  const noteHistoryRef = useRef<DetectedNote[]>([]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current    = stream;
      audioCtxRef.current  = new AudioContext();
      analyserRef.current  = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.8;
      audioCtxRef.current.createMediaStreamSource(stream).connect(analyserRef.current);
      setIsListening(true);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsListening(false);
    setDetectedNotes([]);
    setMatchedChords([]);
    setCurrentNote(null);
    setVolume(0);
    noteHistoryRef.current = [];
  }, []);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioCtxRef.current || audioCtxRef.current.state === "closed") return;
    const buf = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buf);
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    setVolume(Math.min(rms * 10, 1));
    if (rms > sensitivity) {
      const freq = autoCorrelate(buf, audioCtxRef.current.sampleRate);
      if (freq && freq > 60 && freq < 1200) {
        const { note, octave } = frequencyToNote(freq);
        const now = Date.now();
        setCurrentNote(`${note}${octave}`);
        noteHistoryRef.current.push({ note, frequency: freq, confidence: rms, timestamp: now });
        noteHistoryRef.current = noteHistoryRef.current.filter(n => now - n.timestamp < 1500);
        setDetectedNotes([...noteHistoryRef.current]);
        const unique = Array.from(new Set(noteHistoryRef.current.map(n => n.note)));
        const matches = matchChord(unique);
        setMatchedChords(matches);
        if (matches[0]) {
          setHistory(prev => {
            const next = [matches[0].chord, ...prev.filter(c => c !== matches[0].chord)].slice(0, 6);
            return next;
          });
        }
      }
    }
    animRef.current = requestAnimationFrame(analyze);
  }, [sensitivity]);

  useEffect(() => {
    if (isListening && audioCtxRef.current && analyserRef.current) analyze();
    return () => { if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; } };
  }, [isListening, analyze]);

  useEffect(() => {
    if (!isListening) return;
    const id = setInterval(() => {
      const now = Date.now();
      noteHistoryRef.current = noteHistoryRef.current.filter(n => now - n.timestamp < 1500);
      setDetectedNotes([...noteHistoryRef.current]);
      const unique = Array.from(new Set(noteHistoryRef.current.map(n => n.note)));
      setMatchedChords(unique.length >= 2 ? matchChord(unique) : []);
    }, 500);
    return () => clearInterval(id);
  }, [isListening]);

  useEffect(() => () => {
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const uniqueNotes  = Array.from(new Set(detectedNotes.map(n => n.note)));
  const topChord     = matchedChords[0] ?? null;
  const topConf      = topChord ? topChord.confidence : 0;
  const isDetected   = !!topChord;

  // ── SHARED SECTIONS ──────────────────────────────────────────────────────────

  const ChordDisplay = (
    <div className="flex flex-col items-center gap-3">
      <p className="font-Inter text-[11px] text-[#adaaaa] tracking-[2px] uppercase">
        {isListening ? (isDetected ? "DETECTED CHORD" : "LISTENING...") : "CHORD DETECTION"}
      </p>
      <div className="relative flex items-center justify-center w-[108px] h-[108px]">
        {isDetected && <ConfidenceRing confidence={topConf} />}
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: isDetected ? "rgba(16,254,176,0.06)" : "rgba(72,72,71,0.1)" }}>
          <span
            className="font-Space-Grotesk font-bold leading-none transition-all duration-300"
            style={{
              fontSize: isDetected ? (topChord!.chord.length > 3 ? 28 : 36) : 28,
              color: isDetected ? "#00eea5" : "#333",
              filter: isDetected ? "drop-shadow(0 0 16px rgba(0,238,165,0.5))" : "none",
            }}
          >
            {isDetected ? topChord!.chord : isListening ? "?" : "—"}
          </span>
        </div>
      </div>
      {isDetected && (
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10feb0] animate-pulse" />
          <span className="font-Inter text-[12px] text-[#10feb0]">
            {Math.round(topConf * 100)}% confidence
          </span>
        </div>
      )}
      {!isDetected && isListening && (
        <span className="font-Inter text-[12px] text-[#adaaaa]">Play a chord to detect it</span>
      )}
    </div>
  );

  const AlternativeMatches = matchedChords.length > 1 ? (
    <div className="flex flex-col gap-2">
      <p className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-[1.2px]">Other Possibilities</p>
      <div className="flex gap-2 flex-wrap">
        {matchedChords.slice(1).map((m, i) => (
          <div key={i} className="bg-[#20201f] border border-white/5 rounded-full px-3 py-1.5 flex items-center gap-2">
            <span className="font-Space-Grotesk font-bold text-[14px] text-[#82e9ff]">{m.chord}</span>
            <span className="font-Inter text-[10px] text-[#adaaaa]">{Math.round(m.confidence * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const NotePills = (
    <div className="flex flex-col gap-2">
      <p className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-[1.2px]">
        Notes Detected {uniqueNotes.length > 0 && `(${uniqueNotes.length})`}
      </p>
      <div className="flex gap-2 flex-wrap min-h-[36px]">
        {uniqueNotes.length > 0 ? uniqueNotes.map((note, i) => (
          <span key={i} className="font-Space-Grotesk font-bold text-[14px] text-white bg-[#1a1a1a] border border-[#aeffd4]/20 rounded-lg px-3 py-1.5">
            {note}
          </span>
        )) : (
          <span className="font-Manrope text-[13px] text-[#555]">
            {isListening ? "Waiting for input..." : "Start listening to detect notes"}
          </span>
        )}
      </div>
    </div>
  );

  const VolumeBar = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-[1.2px]">Input Level</p>
        {currentNote && (
          <span className="font-Space-Grotesk font-bold text-[14px] text-[#82e9ff]">{currentNote}</span>
        )}
      </div>
      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${volume * 100}%`,
            background: volume > 0.7 ? "#ef4444" : volume > 0.4 ? "#f59e0b" : "#10feb0",
          }}
        />
      </div>
    </div>
  );

  const SensitivityControl = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-[1.2px]">Sensitivity</p>
        <span className="font-Inter text-[11px] text-[#adaaaa]">
          {sensitivity <= 0.01 ? "Very High" : sensitivity <= 0.02 ? "High" : sensitivity <= 0.03 ? "Medium" : "Low"}
        </span>
      </div>
      <input type="range" min="0.005" max="0.05" step="0.005" value={sensitivity}
        onChange={e => setSensitivity(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #10feb0 0%, #10feb0 ${((sensitivity - 0.005) / 0.045) * 100}%, #262626 ${((sensitivity - 0.005) / 0.045) * 100}%, #262626 100%)` }}
      />
      <div className="flex justify-between font-Inter text-[10px] text-[#555]">
        <span>More sensitive</span>
        <span>Less sensitive</span>
      </div>
    </div>
  );

  const StartStopButton = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`flex items-center justify-center gap-3 py-4 rounded-full font-Space-Grotesk font-bold text-[16px] transition-all ${fullWidth ? "w-full" : "px-8"}`}
      style={{
        background: isListening ? "rgba(239,68,68,0.12)" : "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)",
        color: isListening ? "#ef4444" : "#005c3d",
        border: isListening ? "1px solid rgba(239,68,68,0.3)" : "none",
      }}
    >
      <MicIcon active={isListening} />
      {isListening ? "Stop Listening" : "Start Listening"}
    </button>
  );

  // ── MOBILE ────────────────────────────────────────────────────────────────────

  const MobileView = (
    <div className="max-w-[430px] mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Main detection card */}
        <div className="bg-[#131313] rounded-2xl p-6 flex flex-col items-center gap-6">
          {ChordDisplay}
          <WaveformBars active={isListening} volume={volume} />
          {VolumeBar}
          {NotePills}
          {AlternativeMatches}
        </div>

        {SensitivityControl}
        <StartStopButton fullWidth />

        {/* Session history */}
        {history.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-[1.2px]">Session History</p>
            <div className="flex gap-2 flex-wrap">
              {history.map((c, i) => (
                <Link key={i} href={`/chords/${c.toLowerCase().replace("#", "sharp")}major`}>
                  <span className="font-Space-Grotesk font-bold text-[14px] text-[#aeffd4] bg-[#1a1a1a] border border-[#aeffd4]/15 rounded-xl px-3 py-2 cursor-pointer hover:border-[#aeffd4]/40 transition-colors">
                    {c}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-[#131313] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 bg-[#aeffd4]" />
            <p className="font-Space-Grotesk font-bold text-white text-[14px]">Tips for best results</p>
          </div>
          {["Strum all strings clearly and let them ring", "Hold the chord for 1–2 seconds", "Play in a quiet environment", "Make sure your guitar is in tune", "Adjust sensitivity if detection feels off"].map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-[#aeffd4] mt-1.5 shrink-0" />
              <p className="font-Manrope text-[#adaaaa] text-[13px] leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
    </div>
  );

  // ── DESKTOP ───────────────────────────────────────────────────────────────────

  const DesktopView = (
    <div className="px-8 pt-6 pb-16">
      {/* Hero */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-Space-Grotesk font-bold text-[64px] leading-none tracking-[-2px] text-white">Chord Detect</h2>
          <p className="font-Inter text-[#adaaaa] text-[13px] tracking-[1.4px] uppercase mt-2">REAL-TIME CHORD RECOGNITION</p>
        </div>
        <StartStopButton />
      </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-12 gap-8">

            {/* Left column — main detection */}
            <div className="col-span-7 flex flex-col gap-6">

              {/* Big detection card */}
              <div className="bg-[#131313] rounded-2xl p-8 flex flex-col gap-8">
                {/* Chord display + waveform side by side */}
                <div className="flex items-center gap-8">
                  {ChordDisplay}
                  <div className="flex-1">
                    <WaveformBars active={isListening} volume={volume} />
                  </div>
                </div>
                {VolumeBar}
                {NotePills}
                {AlternativeMatches && (
                  <div className="pt-4 border-t border-white/5">{AlternativeMatches}</div>
                )}
              </div>

              {/* Sensitivity */}
              <div className="bg-[#131313] rounded-2xl p-6">{SensitivityControl}</div>

              {/* Session history */}
              {history.length > 0 && (
                <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-0.5 bg-[#aeffd4]" />
                    <h3 className="font-Space-Grotesk font-bold text-white text-[16px]">Session History</h3>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {history.map((c, i) => (
                      <Link key={i} href={`/chords/${c.toLowerCase().replace("#","sharp")}major`}>
                        <span className="font-Space-Grotesk font-bold text-[14px] text-[#aeffd4] bg-[#1a1a1a] border border-[#aeffd4]/15 rounded-xl px-4 py-2 cursor-pointer hover:border-[#aeffd4]/40 transition-colors">
                          {c}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column — info panels */}
            <div className="col-span-5 flex flex-col gap-6">

              {/* Try these chords */}
              <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-0.5 bg-[#aeffd4]" />
                  <h3 className="font-Space-Grotesk font-bold text-white text-[16px]">Try These Chords</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <div key={i} className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-3 flex flex-col items-center gap-1">
                      <span className="font-Space-Grotesk font-bold text-[18px]" style={{ color: TYPE_COLOR[s.type] }}>{s.label}</span>
                      <span className="font-Inter text-[10px] text-[#555] uppercase tracking-wide">{s.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-0.5 bg-[#aeffd4]" />
                  <h3 className="font-Space-Grotesk font-bold text-white text-[16px]">Tips for Best Results</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {["Strum all strings clearly and let them ring", "Hold the chord for 1–2 seconds", "Play in a quiet environment", "Ensure your guitar is in tune first", "Lower sensitivity if getting false detections"].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#aeffd4] mt-1.5 shrink-0" />
                      <p className="font-Manrope text-[#adaaaa] text-[13px] leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works glassmorphism */}
              <div className="rounded-2xl p-6 border border-white/5 flex flex-col gap-3"
                style={{ background: "rgba(38,38,38,0.4)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#82e9ff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>
                  <span className="font-Space-Grotesk font-bold text-[#82e9ff] text-[13px] tracking-wider">HOW IT WORKS</span>
                </div>
                <p className="font-Manrope text-[#adaaaa] text-[13px] leading-relaxed">
                  Your microphone captures the audio. We use pitch detection to identify individual notes, then match them against known chord patterns — all in real time, in your browser.
                </p>
              </div>
            </div>
          </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">{MobileView}</div>
      <div className="hidden lg:block">{DesktopView}</div>
    </>
  );
}
