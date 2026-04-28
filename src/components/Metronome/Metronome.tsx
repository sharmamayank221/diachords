import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

// ── Data ──────────────────────────────────────────────────────────────────────

const TIME_SIGNATURES = [
  { name: "4/4", beats: 4 },
  { name: "3/4", beats: 3 },
  { name: "6/8", beats: 6 },
  { name: "2/4", beats: 2 },
];

const QUICK_BPMS = [60, 80, 100, 120, 140, 160];

const TEMPO_MARKS = [
  { name: "Largo",    range: "40–60",   min: 40,  max: 60  },
  { name: "Adagio",   range: "66–76",   min: 66,  max: 76  },
  { name: "Andante",  range: "76–108",  min: 76,  max: 108 },
  { name: "Moderato", range: "108–120", min: 108, max: 120 },
  { name: "Allegro",  range: "120–168", min: 120, max: 168 },
  { name: "Presto",   range: "168–200", min: 168, max: 200 },
];

function getTempoName(bpm: number) {
  return TEMPO_MARKS.find(m => bpm >= m.min && bpm <= m.max)?.name ?? "Vivace";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Metronome() {
  const [isPlaying, setIsPlaying]       = useState(false);
  const [bpm, setBpm]                   = useState(100);
  const [currentBeat, setCurrentBeat]   = useState(0);
  const [timeSignature, setTimeSignature] = useState(TIME_SIGNATURES[0]);
  const [tapTimes, setTapTimes]         = useState<number[]>([]);
  const [pendulumDir, setPendulumDir]   = useState(1); // 1 = right, -1 = left

  const clickHigh = useRef<Tone.Synth | null>(null);
  const clickLow  = useRef<Tone.Synth | null>(null);
  const loopRef   = useRef<Tone.Loop | null>(null);
  const beatRef   = useRef(0);

  // Init synths
  useEffect(() => {
    clickHigh.current = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    clickHigh.current.volume.value = -6;

    clickLow.current = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    clickLow.current.volume.value = -10;

    return () => {
      loopRef.current?.dispose();
      clickHigh.current?.dispose();
      clickLow.current?.dispose();
    };
  }, []);

  useEffect(() => { Tone.Transport.bpm.value = bpm; }, [bpm]);

  const startMetronome = async () => {
    await Tone.start();
    beatRef.current = 0;
    setCurrentBeat(0);
    loopRef.current?.dispose();

    loopRef.current = new Tone.Loop((time) => {
      const beat = beatRef.current;
      if (beat === 0) {
        clickHigh.current?.triggerAttackRelease("C6", "32n", time);
      } else {
        clickLow.current?.triggerAttackRelease("G5", "32n", time);
      }
      Tone.Draw.schedule(() => {
        setCurrentBeat(beat);
        setPendulumDir(prev => prev * -1);
      }, time);
      beatRef.current = (beat + 1) % timeSignature.beats;
    }, "4n");

    loopRef.current.start(0);
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopMetronome = () => {
    loopRef.current?.stop();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setIsPlaying(false);
    setCurrentBeat(0);
    beatRef.current = 0;
    setPendulumDir(1);
  };

  const toggleMetronome = () => (isPlaying ? stopMetronome() : startMetronome());

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const taps = [...tapTimes, now].filter(t => now - t < 3000);
    setTapTimes(taps);
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calc = Math.round(60000 / avg);
      if (calc >= 40 && calc <= 240) setBpm(calc);
    }
  }, [tapTimes]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) { e.preventDefault(); toggleMetronome(); }
      else if (e.code === "KeyT") { handleTapTempo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, handleTapTempo]);

  // ── Pendulum derived values ────────────────────────────────────────────────

  const swingDuration = isPlaying ? (60000 / bpm) : 0; // one tick = one direction
  const pendulumAngle = isPlaying ? pendulumDir * 28 : 0; // degrees

  const bpmPercent = ((bpm - 40) / (240 - 40)) * 100;
  const tempoName  = getTempoName(bpm);

  // ── Shared sub-components ─────────────────────────────────────────────────

  const BeatDots = (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: timeSignature.beats }).map((_, idx) => {
        const isActive = isPlaying && currentBeat === idx;
        const isAccent = idx === 0;
        return (
          <div key={idx}
            className="flex flex-col items-center gap-1.5 transition-all duration-100"
            style={{ transform: isActive ? "scale(1.2)" : "scale(1)" }}>
            <div className="font-Inter text-[10px] tracking-[1px] uppercase"
              style={{ color: isActive ? (isAccent ? "#1BD79E" : "#38DBE5") : "#3f3f46" }}>
              {idx + 1}
            </div>
            <div className="w-3 h-3 rounded-full transition-all duration-75"
              style={{
                background: isActive
                  ? isAccent ? "#1BD79E" : "#38DBE5"
                  : "#1a1a1a",
                boxShadow: isActive
                  ? `0 0 12px ${isAccent ? "#1BD79E" : "#38DBE5"}`
                  : "none",
                border: isActive ? "none" : "1px solid #2a2a2a",
              }} />
          </div>
        );
      })}
    </div>
  );

  const PlayStopButton = ({ large = false }: { large?: boolean }) => (
    <button onClick={toggleMetronome}
      className={`rounded-full flex items-center justify-center font-Space-Grotesk font-bold transition-all active:scale-95 hover:scale-105 ${large ? "w-20 h-20 text-[28px]" : "w-14 h-14 text-[20px]"}`}
      style={{
        background: isPlaying
          ? "rgba(239,68,68,0.12)"
          : "linear-gradient(135deg, #1BD79E 0%, #15c48e 100%)",
        color: isPlaying ? "#ef4444" : "black",
        border: isPlaying ? "1px solid rgba(239,68,68,0.3)" : "none",
        boxShadow: isPlaying ? "none" : "0 0 24px rgba(27,215,158,0.3)",
      }}>
      {isPlaying ? "■" : "▶"}
    </button>
  );

  const BpmSlider = (
    <div className="flex flex-col gap-2">
      <input type="range" min="40" max="240" value={bpm}
        onChange={e => setBpm(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #1BD79E 0%, #1BD79E ${bpmPercent}%, #1a1a1a ${bpmPercent}%, #1a1a1a 100%)`
        }}
      />
      <div className="flex justify-between font-Inter text-[10px] text-[#3f3f46]">
        <span>40</span><span>100</span><span>160</span><span>240</span>
      </div>
    </div>
  );

  const BpmNudge = (
    <div className="flex items-center gap-2">
      {[
        { label: "−5", delta: -5 },
        { label: "−1", delta: -1 },
        { label: "+1", delta: 1 },
        { label: "+5", delta: 5 },
      ].map(({ label, delta }) => (
        <button key={label}
          onClick={() => setBpm(b => Math.min(240, Math.max(40, b + delta)))}
          className="flex-1 py-2 rounded-xl font-Space-Grotesk font-bold text-[13px] bg-[#131313] border border-white/5 text-white hover:bg-[#1a1a1a] hover:border-white/10 transition-all active:scale-95">
          {label}
        </button>
      ))}
    </div>
  );

  const QuickBpms = (
    <div className="flex gap-2 flex-wrap">
      {QUICK_BPMS.map(t => (
        <button key={t} onClick={() => setBpm(t)}
          className="flex-1 min-w-[48px] py-2.5 rounded-xl font-Space-Grotesk font-bold text-[13px] transition-all active:scale-95"
          style={{
            background: bpm === t ? "#1BD79E" : "#131313",
            color: bpm === t ? "black" : "#71717a",
            border: bpm === t ? "none" : "1px solid rgba(255,255,255,0.05)",
          }}>
          {t}
        </button>
      ))}
    </div>
  );

  const TimeSig = (
    <div className="flex gap-2">
      {TIME_SIGNATURES.map(ts => (
        <button key={ts.name}
          onClick={() => { setTimeSignature(ts); if (isPlaying) stopMetronome(); }}
          className="flex-1 py-3 rounded-xl font-Space-Grotesk font-bold text-[14px] transition-all active:scale-95"
          style={{
            background: timeSignature.name === ts.name ? "#1BD79E" : "#131313",
            color: timeSignature.name === ts.name ? "black" : "#71717a",
            border: timeSignature.name === ts.name ? "none" : "1px solid rgba(255,255,255,0.05)",
          }}>
          {ts.name}
        </button>
      ))}
    </div>
  );

  const TapButton = (
    <button onClick={handleTapTempo}
      className="w-full py-4 rounded-xl font-Space-Grotesk font-bold text-[16px] bg-[#131313] border border-white/5 text-white hover:bg-[#1a1a1a] transition-all active:scale-95 relative overflow-hidden">
      <span className="relative z-10">TAP TEMPO</span>
      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-Inter text-[10px] text-[#3f3f46] uppercase tracking-wider">or T</span>
    </button>
  );

  const TempoGuide = (
    <div className="bg-[#0b0b0b] rounded-2xl p-5 border border-[#1a1a1a] flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-0.5 bg-[#1BD79E]" />
        <h3 className="font-Space-Grotesk font-bold text-[14px] text-white">Tempo Guide</h3>
      </div>
      {TEMPO_MARKS.map(m => {
        const active = bpm >= m.min && bpm <= m.max;
        return (
          <button key={m.name} onClick={() => setBpm(Math.round((m.min + m.max) / 2))}
            className="flex items-center justify-between hover:bg-white/3 rounded-lg px-2 py-1 transition-colors">
            <span className={`font-Manrope font-semibold text-[13px] ${active ? "text-[#1BD79E]" : "text-[#52525b]"}`}>{m.name}</span>
            <span className="font-Inter text-[11px] text-[#3f3f46]">{m.range}</span>
          </button>
        );
      })}
    </div>
  );

  // ── Pendulum visual ───────────────────────────────────────────────────────

  const PendulumVisual = (
    <div className="flex flex-col items-center gap-4">
      {/* SVG pendulum */}
      <div className="relative w-48 h-52 flex items-start justify-center">
        {/* Pivot */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#1BD79E]/20 border border-[#1BD79E]/40 z-10" />

        {/* Pendulum arm */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-40 origin-top flex flex-col items-center"
          style={{
            transform: `translateX(-50%) rotate(${pendulumAngle}deg)`,
            transition: isPlaying ? `transform ${swingDuration}ms ease-in-out` : "transform 500ms ease-out",
            transformOrigin: "top center",
          }}>
          {/* Rod */}
          <div className="flex-1 w-0.5 rounded-full"
            style={{ background: "linear-gradient(to bottom, #1BD79E, rgba(27,215,158,0.3))" }} />
          {/* Bob */}
          <div className="w-10 h-10 rounded-full mt-[-2px] flex items-center justify-center"
            style={{
              background: isPlaying ? "#1BD79E" : "#1a1a1a",
              border: isPlaying ? "none" : "2px solid #2a2a2a",
              boxShadow: isPlaying ? "0 0 20px rgba(27,215,158,0.6), 0 0 40px rgba(27,215,158,0.2)" : "none",
              transition: "background 300ms, box-shadow 300ms",
            }} />
        </div>

        {/* Arc guide */}
        <svg className="absolute inset-0" viewBox="0 0 192 208" fill="none">
          <path d="M 40 8 Q 96 200 152 8" stroke="#1BD79E" strokeWidth="0.5" strokeOpacity="0.12" strokeDasharray="3 4"/>
        </svg>
      </div>
    </div>
  );

  // ── MOBILE VIEW ───────────────────────────────────────────────────────────

  const MobileView = (
    <div className="max-w-[430px] mx-auto px-5 py-5 flex flex-col gap-6">

      {/* BPM + Pendulum card */}
      <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col items-center gap-6">
        {PendulumVisual}

        {/* Beat dots */}
        {BeatDots}

        {/* BPM display */}
        <div className="text-center">
          <div className="font-Space-Grotesk font-bold leading-none text-white"
            style={{ fontSize: "clamp(64px, 18vw, 88px)", letterSpacing: "-3px" }}>
            {bpm}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="font-Inter text-[12px] text-[#3f3f46] uppercase tracking-[2px]">BPM</span>
            <span className="font-Space-Grotesk font-bold text-[12px] text-[#1BD79E]">— {tempoName}</span>
          </div>
        </div>

        {/* Slider */}
        {BpmSlider}

        {/* Play + nudge */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1">{BpmNudge}</div>
          <PlayStopButton large />
        </div>
      </div>

      {/* Quick BPM */}
      <div className="bg-[#0b0b0b] rounded-2xl border border-[#1a1a1a] p-5 flex flex-col gap-3">
        <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">QUICK BPM</p>
        {QuickBpms}
      </div>

      {/* Time sig + Tap */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0b0b0b] rounded-2xl border border-[#1a1a1a] p-5 flex flex-col gap-3">
          <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">TIME SIG</p>
          <div className="flex flex-col gap-2">
            {TIME_SIGNATURES.map(ts => (
              <button key={ts.name}
                onClick={() => { setTimeSignature(ts); if (isPlaying) stopMetronome(); }}
                className="py-2.5 rounded-xl font-Space-Grotesk font-bold text-[13px] transition-all"
                style={{
                  background: timeSignature.name === ts.name ? "#1BD79E" : "#131313",
                  color: timeSignature.name === ts.name ? "black" : "#71717a",
                  border: timeSignature.name === ts.name ? "none" : "1px solid rgba(255,255,255,0.05)",
                }}>
                {ts.name}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#0b0b0b] rounded-2xl border border-[#1a1a1a] p-5 flex flex-col gap-3">
          <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">TAP</p>
          <button onClick={handleTapTempo}
            className="flex-1 rounded-xl font-Space-Grotesk font-bold text-[22px] bg-[#131313] border border-white/5 text-white hover:bg-[#1a1a1a] transition-all active:scale-95"
            style={{ minHeight: "80px" }}>
            TAP
          </button>
          <p className="font-Inter text-[10px] text-[#3f3f46] text-center">press T</p>
          {tapTimes.length >= 2 && (
            <p className="font-Inter text-[10px] text-[#1BD79E] text-center">{tapTimes.length} taps</p>
          )}
        </div>
      </div>

      {TempoGuide}

      {/* Keyboard hint */}
      <div className="flex items-center justify-center gap-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-Inter text-[10px] bg-[#131313] border border-white/5 px-2 py-1 rounded text-[#555]">Space</span>
          <span className="font-Inter text-[10px] text-[#3f3f46]">Play/Stop</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-Inter text-[10px] bg-[#131313] border border-white/5 px-2 py-1 rounded text-[#555]">T</span>
          <span className="font-Inter text-[10px] text-[#3f3f46]">Tap Tempo</span>
        </div>
      </div>
    </div>
  );

  // ── DESKTOP VIEW ──────────────────────────────────────────────────────────

  const DesktopView = (
    <div className="px-8 pt-6 pb-16">

      {/* Hero */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-Space-Grotesk font-bold text-[64px] leading-none tracking-[-2px] text-white">Metronome</h2>
          <p className="font-Inter text-[#adaaaa] text-[13px] tracking-[1.4px] uppercase mt-2">KEEP PERFECT TIME WHILE YOU PLAY</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-Inter text-[11px] bg-[#131313] border border-white/5 px-3 py-1.5 rounded-full text-[#555]">Space — Play/Stop</span>
          <span className="font-Inter text-[11px] bg-[#131313] border border-white/5 px-3 py-1.5 rounded-full text-[#555]">T — Tap</span>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* ── LEFT: Pendulum + BPM ── (5 cols) */}
        <div className="col-span-5 flex flex-col gap-6">

          {/* Pendulum card */}
          <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-8 flex flex-col items-center gap-6">
            {/* BPM display */}
            <div className="text-center w-full">
              <div className="font-Space-Grotesk font-bold text-[96px] leading-none tracking-[-4px] text-white">
                {bpm}
              </div>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="font-Inter text-[12px] text-[#3f3f46] uppercase tracking-[2.5px]">BPM</span>
                <div className="w-px h-3 bg-[#2a2a2a]" />
                <span className="font-Space-Grotesk font-bold text-[#1BD79E] text-[13px]">{tempoName}</span>
                <div className="w-px h-3 bg-[#2a2a2a]" />
                <span className="font-Manrope text-[#52525b] text-[12px]">{timeSignature.name}</span>
              </div>
            </div>

            {/* Pendulum */}
            <div className="relative w-52 h-56 flex items-start justify-center my-2">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full z-10"
                style={{ background: "#0b0b0b", border: "2px solid #1BD79E", boxShadow: "0 0 12px rgba(27,215,158,0.4)" }} />

              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-0.5 h-44 flex flex-col items-center"
                style={{
                  transform: `translateX(-50%) rotate(${pendulumAngle}deg)`,
                  transition: isPlaying ? `transform ${swingDuration}ms ease-in-out` : "transform 600ms ease-out",
                  transformOrigin: "top center",
                }}>
                <div className="flex-1 w-0.5"
                  style={{ background: "linear-gradient(to bottom, #1BD79E 0%, rgba(27,215,158,0.15) 100%)" }} />
                <div className="w-12 h-12 rounded-full mt-[-2px] flex items-center justify-center"
                  style={{
                    background: isPlaying ? "radial-gradient(circle at 35% 35%, #22f3b4, #0fad7a)" : "#131313",
                    border: isPlaying ? "none" : "2px solid #222",
                    boxShadow: isPlaying ? "0 0 28px rgba(27,215,158,0.7), 0 0 56px rgba(27,215,158,0.25)" : "none",
                    transition: "all 300ms",
                  }}>
                  {isPlaying && (
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                  )}
                </div>
              </div>

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 224" fill="none">
                <path d="M 40 10 Q 104 210 168 10" stroke="#1BD79E" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="3 5"/>
                <path d="M 60 10 Q 104 175 148 10" stroke="#1BD79E" strokeWidth="0.5" strokeOpacity="0.07" strokeDasharray="2 4"/>
              </svg>
            </div>

            {/* Beat dots */}
            {BeatDots}

            {/* Play button */}
            <PlayStopButton large />
          </div>

          {/* Tempo guide */}
          {TempoGuide}
        </div>

        {/* ── RIGHT: Controls bento ── (7 cols) */}
        <div className="col-span-7 flex flex-col gap-6">

          {/* BPM controls card */}
          <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-[#1BD79E]" />
              <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">BPM Control</h3>
            </div>

            {/* Slider */}
            {BpmSlider}

            {/* Nudge buttons */}
            {BpmNudge}

            {/* Quick BPM presets */}
            <div className="flex flex-col gap-2">
              <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">PRESETS</p>
              {QuickBpms}
            </div>
          </div>

          {/* Time signature + Tap grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* Time signature */}
            <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 bg-[#38DBE5]" />
                <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">Time Signature</h3>
              </div>
              {TimeSig}
              <p className="font-Manrope text-[#3f3f46] text-[12px]">
                Stops metronome when changed
              </p>
            </div>

            {/* Tap tempo */}
            <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 bg-[#f59e0b]" />
                <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">Tap Tempo</h3>
              </div>
              {TapButton}
              {tapTimes.length >= 2 && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1BD79E] animate-pulse" />
                  <p className="font-Inter text-[12px] text-[#1BD79E]">{tapTimes.length} taps detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Pro tips card */}
          <div className="rounded-3xl p-6 border border-white/5 flex flex-col gap-4"
            style={{ background: "rgba(27,215,158,0.03)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>
              <span className="font-Space-Grotesk font-bold text-[#1BD79E] text-[13px] tracking-wider">PRACTICE TIPS</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Start slow", "Begin at 60–70% of target speed. Accuracy before speed."],
                ["Accent the 1", "Feel the first beat strongly — everything else follows."],
                ["Use tap tempo", "Match a song's tempo by tapping along to find the BPM."],
                ["Build gradually", "Increase BPM by 5 only when you're comfortable."],
              ].map(([title, desc]) => (
                <div key={title} className="flex flex-col gap-1">
                  <div className="w-1 h-1 rounded-full bg-[#1BD79E]" />
                  <span className="font-Manrope font-semibold text-[13px] text-white">{title}</span>
                  <span className="font-Manrope text-[12px] text-[#52525b] leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>
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
