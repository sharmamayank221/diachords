import React from "react";
import { track } from "@/lib/analytics";

// ── Meters & subdivisions ────────────────────────────────────────────────────
// BPM always counts the pulse: quarter notes in simple meters, dotted quarters in 6/8 and 12/8.

interface Meter {
  name: string;
  pulses: number;
  compound: boolean; // pulse divides into three eighths
}

const METERS: Meter[] = [
  { name: "2/4", pulses: 2, compound: false },
  { name: "3/4", pulses: 3, compound: false },
  { name: "4/4", pulses: 4, compound: false },
  { name: "6/8", pulses: 2, compound: true },
  { name: "12/8", pulses: 4, compound: true },
];

const SIMPLE_SUBDIVS = [
  { value: 1, label: "Quarters" },
  { value: 2, label: "Eighths" },
  { value: 3, label: "Triplets" },
  { value: 4, label: "16ths" },
];
const COMPOUND_SUBDIVS = [
  { value: 1, label: "Pulse only" },
  { value: 3, label: "Eighths" },
  { value: 6, label: "16ths" },
];

const MIN_BPM = 30;
const MAX_BPM = 260;

const TEMPO_NAMES: [number, string][] = [
  [200, "Prestissimo"],
  [176, "Presto"],
  [156, "Vivace"],
  [120, "Allegro"],
  [108, "Moderato"],
  [76, "Andante"],
  [66, "Adagio"],
  [60, "Larghetto"],
  [40, "Largo"],
  [0, "Grave"],
];
const tempoName = (bpm: number) => TEMPO_NAMES.find(([min]) => bpm >= min)![1];
const clampBpm = (v: number) => Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, v)));

// ── Scheduler constants ──────────────────────────────────────────────────────
const LOOKAHEAD_MS = 25; // how often the scheduler wakes up
const SCHEDULE_AHEAD_S = 0.12; // how far ahead clicks are queued on the audio clock

type ClickKind = "accent" | "pulse" | "sub" | "count";
const CLICK: Record<ClickKind, { freq: number; gain: number; decay: number }> = {
  accent: { freq: 2000, gain: 1, decay: 0.06 },
  pulse: { freq: 1400, gain: 0.75, decay: 0.045 },
  sub: { freq: 900, gain: 0.4, decay: 0.03 },
  count: { freq: 2400, gain: 0.8, decay: 0.05 },
};

interface ScheduledStep {
  time: number;
  step: number;
  pulseIdx: number;
  isPulse: boolean;
  countIn: boolean;
  pulseDur: number;
  pulseCount: number; // running pulse number, for pendulum direction
  subdiv: number;
  meter: Meter;
}

interface Trainer {
  enabled: boolean;
  step: number;
  everyBars: number;
  target: number;
}

const STORAGE_KEY = "metronome-settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Small UI pieces ──────────────────────────────────────────────────────────

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`h-9 px-3.5 rounded-full font-Inter text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
        active ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#161616] text-gray-300 hover:bg-[#222]"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${checked ? "bg-[#1BD79E]" : "bg-[#333]"}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function NumberField({ value, onChange, min, max, label, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string; suffix?: string }) {
  return (
    <label className="flex items-center gap-1.5 font-Inter text-sm text-gray-300">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, Math.round(v))));
        }}
        className="w-16 h-9 rounded-lg bg-[#161616] border border-white/10 px-2 text-center text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
      />
      {suffix}
    </label>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Metronome() {
  const [bpm, setBpm] = React.useState(100);
  const [meterIdx, setMeterIdx] = React.useState(2);
  const [subdiv, setSubdiv] = React.useState(1);
  const [accent, setAccent] = React.useState(true);
  const [volume, setVolume] = React.useState(0.8);
  const [countIn, setCountIn] = React.useState(false);
  const [trainer, setTrainer] = React.useState<Trainer>({ enabled: false, step: 5, everyBars: 4, target: 140 });
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState<{ step: number; pulseIdx: number; countIn: boolean } | null>(null);
  const [taps, setTaps] = React.useState<number[]>([]);

  const meter = METERS[meterIdx];
  const subdivOptions = meter.compound ? COMPOUND_SUBDIVS : SIMPLE_SUBDIVS;

  // restore last-used settings (per browser)
  React.useEffect(() => {
    const s = loadSettings();
    if (!s) return;
    if (typeof s.bpm === "number") setBpm(clampBpm(s.bpm));
    if (typeof s.meterIdx === "number" && METERS[s.meterIdx]) setMeterIdx(s.meterIdx);
    if (typeof s.subdiv === "number") setSubdiv(s.subdiv);
    if (typeof s.accent === "boolean") setAccent(s.accent);
    if (typeof s.volume === "number") setVolume(Math.min(1, Math.max(0, s.volume)));
  }, []);
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bpm, meterIdx, subdiv, accent, volume }));
    } catch {
      // storage unavailable: settings just won't persist
    }
  }, [bpm, meterIdx, subdiv, accent, volume]);

  // switching between simple and compound meters resets to that family's natural feel
  // (6/8 and 12/8 are felt in eighths); within a family your subdivision is kept
  const selectMeter = (i: number) => {
    if (METERS[i].compound !== meter.compound) setSubdiv(METERS[i].compound ? 3 : 1);
    setMeterIdx(i);
  };
  React.useEffect(() => {
    if (!subdivOptions.some((o) => o.value === subdiv)) setSubdiv(meter.compound ? 3 : 1);
  }, [meter.compound, subdiv, subdivOptions]);

  // ── Audio engine (own AudioContext, so it never touches the backing-track clock) ──
  const ctxRef = React.useRef<AudioContext | null>(null);
  const masterRef = React.useRef<GainNode | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const pendulumRef = React.useRef<SVGGElement | null>(null);

  const desired = React.useRef({ bpm, meter, subdiv, accent, trainer });
  desired.current = { bpm, meter, subdiv, accent, trainer };

  const engine = React.useRef({
    nextTime: 0,
    step: 0,
    meter: METERS[2],
    subdiv: 1,
    bar: 0,
    countInBars: 0,
    pulseCount: 0,
    bpm: 100,
    queue: [] as ScheduledStep[],
    lastPulse: null as ScheduledStep | null,
  });

  React.useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = volume;
  }, [volume]);

  const playClick = (time: number, kind: ClickKind) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const { freq, gain, decay } = CLICK[kind];
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(gain, time + 0.001);
    env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    osc.connect(env).connect(master);
    osc.start(time);
    osc.stop(time + decay + 0.01);
  };

  const schedule = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const e = engine.current;
    const want = desired.current;

    while (e.nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      // meter changes land on the next bar, subdivision changes on the next pulse
      if (e.step === 0 && e.meter !== want.meter) {
        e.meter = want.meter;
        e.subdiv = want.subdiv;
      } else if (e.subdiv !== want.subdiv && e.step % e.subdiv === 0) {
        e.step = (e.step / e.subdiv) * want.subdiv;
        e.subdiv = want.subdiv;
      }

      const pulseDur = 60 / e.bpm;
      const stepDur = pulseDur / e.subdiv;
      const isPulse = e.step % e.subdiv === 0;
      const pulseIdx = Math.floor(e.step / e.subdiv);
      const inCountIn = e.countInBars > 0;

      if (isPulse) e.pulseCount += 1;
      if (!inCountIn || isPulse) {
        const kind: ClickKind = inCountIn
          ? "count"
          : !isPulse
          ? "sub"
          : pulseIdx === 0 && want.accent
          ? "accent"
          : "pulse";
        playClick(e.nextTime, kind);
      }
      e.queue.push({
        time: e.nextTime,
        step: e.step,
        pulseIdx,
        isPulse,
        countIn: inCountIn,
        pulseDur,
        pulseCount: e.pulseCount,
        subdiv: e.subdiv,
        meter: e.meter,
      });

      e.nextTime += stepDur;
      e.step += 1;
      if (e.step >= e.meter.pulses * e.subdiv) {
        e.step = 0;
        if (inCountIn) {
          e.countInBars -= 1;
        } else {
          e.bar += 1;
          const t = want.trainer;
          if (t.enabled && e.bar % t.everyBars === 0 && e.bpm < t.target) {
            e.bpm = Math.min(t.target, e.bpm + t.step);
            setBpm(e.bpm);
          }
        }
      }
    }
  };

  // visuals follow the audio clock, not timers, so lights and pendulum stay on the click
  const animate = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const e = engine.current;
    const now = ctx.currentTime - ((ctx as any).outputLatency ?? 0);

    let current: ScheduledStep | null = null;
    while (e.queue.length && e.queue[0].time <= now) {
      current = e.queue.shift()!;
      if (current.isPulse) e.lastPulse = current;
    }
    if (current) {
      const c = current;
      setPosition((p) => (p && p.step === c.step && p.countIn === c.countIn && p.pulseIdx === c.pulseIdx ? p : { step: c.step, pulseIdx: c.pulseIdx, countIn: c.countIn }));
    }

    const lp = e.lastPulse;
    if (lp && pendulumRef.current) {
      // passes centre exactly on each pulse, swinging out and back in between, alternating sides
      const phase = Math.min(1, Math.max(0, (now - lp.time) / lp.pulseDur));
      const dir = lp.pulseCount % 2 === 0 ? 1 : -1;
      pendulumRef.current.style.transform = `rotate(${dir * 26 * Math.sin(Math.PI * phase)}deg)`;
    }
    rafRef.current = requestAnimationFrame(animate);
  };

  const stop = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
    engine.current.queue = [];
    engine.current.lastPulse = null;
    if (pendulumRef.current) pendulumRef.current.style.transform = "rotate(0deg)";
    // let the last click ring out, then release the audio hardware
    const ctx = ctxRef.current;
    ctxRef.current = null;
    masterRef.current = null;
    if (ctx) setTimeout(() => ctx.close().catch(() => {}), 150);
    setPlaying(false);
    setPosition(null);
  }, []);

  const start = async () => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx({ latencyHint: "interactive" });
    await ctx.resume();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterRef.current = master;

    const want = desired.current;
    engine.current = {
      nextTime: ctx.currentTime + 0.06,
      step: 0,
      meter: want.meter,
      subdiv: want.subdiv,
      bar: 0,
      countInBars: countIn ? 1 : 0,
      pulseCount: 0,
      bpm: want.bpm,
      queue: [],
      lastPulse: null,
    };
    schedule();
    timerRef.current = setInterval(schedule, LOOKAHEAD_MS);
    rafRef.current = requestAnimationFrame(animate);
    setPlaying(true);
    track("metronome_start", { bpm: want.bpm, meter: want.meter.name, subdivision: want.subdiv, trainer: want.trainer.enabled, count_in: countIn });
  };

  const toggle = () => (playing ? stop() : start());

  // leaving the page stops the metronome and frees the audio device
  React.useEffect(() => stop, [stop]);

  // BPM edits apply straight away during playback (the trainer then continues from here)
  const changeBpm = (v: number) => {
    const next = clampBpm(v);
    setBpm(next);
    engine.current.bpm = next;
  };

  const tap = () => {
    const now = performance.now();
    // a pause of more than 2 s starts a new measurement; average the last few taps
    const last = taps[taps.length - 1];
    const fresh = [...(last !== undefined && now - last < 2000 ? taps : []), now].slice(-6);
    setTaps(fresh);
    if (fresh.length >= 2) {
      const intervals = fresh.slice(1).map((t, i) => t - fresh[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      changeBpm(60000 / avg);
    }
  };

  // Keyboard: Space play/stop, T tap, ↑/↓ ±1 (Shift ±5). Ignored while typing in a field.
  const keyHandler = React.useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input:not([type="range"]), textarea, select, [contenteditable]')) return;
    if (e.code === "Space") {
      e.preventDefault(); // also stops a focused button from being "clicked" by Space
      toggle();
    } else if (e.code === "KeyT") {
      tap();
    } else if ((e.code === "ArrowUp" || e.code === "ArrowDown") && target?.getAttribute("type") !== "range") {
      e.preventDefault();
      changeBpm(bpm + (e.code === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 5 : 1));
    }
  };
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Beat lights ────────────────────────────────────────────────────────────
  // Simple meters: one light per beat. Compound meters: one per eighth, grouped in threes.
  const lightCount = meter.compound ? meter.pulses * 3 : meter.pulses;
  const activeLight =
    position === null
      ? -1
      : meter.compound
      ? position.countIn
        ? position.pulseIdx * 3
        : Math.floor((position.step * 3) / subdiv)
      : position.pulseIdx;
  const activeSub = position && !position.countIn && !meter.compound && subdiv > 1 ? position.step % subdiv : -1;

  const bpmPercent = ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100;

  return (
    <div className="max-w-3xl mx-auto text-white">
      <div className="text-center">
        <h1 className="font-Lora text-3xl md:text-4xl">Metronome</h1>
        <p className="font-Inter text-sm text-gray-400 mt-1">Keep time with clicks you can hear over a guitar.</p>
      </div>

      {/* ── Main card ── */}
      <section className="mt-6 rounded-3xl bg-[#0f0f0f] border border-white/5 px-5 md:px-10 py-6 md:py-8" aria-label="Tempo">
        {/* Beat lights */}
        <div className="flex items-center justify-center gap-4 min-h-[28px]" aria-hidden>
          {Array.from({ length: lightCount }, (_, i) => {
            const isGroupStart = meter.compound ? i % 3 === 0 : true;
            const isBarStart = i === 0;
            const lit = i === activeLight;
            const size = isBarStart ? "h-5 w-5" : isGroupStart ? "h-4 w-4" : "h-3 w-3";
            return (
              <span
                key={i}
                className={`${size} rounded-full transition-all duration-75 ${meter.compound && i > 0 && i % 3 === 0 ? "ml-3" : ""}`}
                style={{
                  background: lit ? (position?.countIn ? "#f59e0b" : isBarStart && accent ? "#1BD79E" : "#e5e7eb") : "#262626",
                  boxShadow: lit ? `0 0 14px ${position?.countIn ? "#f59e0b" : "#1BD79E"}` : "none",
                  transform: lit ? "scale(1.2)" : "scale(1)",
                }}
              />
            );
          })}
        </div>
        <div className="h-4 mt-2 flex items-center justify-center gap-1.5" aria-hidden>
          {position?.countIn ? (
            <span className="font-Inter text-[11px] font-semibold uppercase tracking-wider text-[#f59e0b]">Count-in</span>
          ) : (
            !meter.compound &&
            subdiv > 1 &&
            Array.from({ length: subdiv }, (_, i) => (
              <span key={i} className={`h-1 w-4 rounded-full ${i === activeSub ? "bg-[#1BD79E]" : "bg-[#262626]"}`} />
            ))
          )}
        </div>

        <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
          <div>
            {/* BPM readout with −/+ */}
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <button
                type="button"
                onClick={() => changeBpm(bpm - 1)}
                aria-label="Slower by 1 BPM"
                className="h-12 w-12 rounded-full bg-[#161616] text-2xl text-gray-200 hover:bg-[#222] focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
              >
                −
              </button>
              <div className="text-center min-w-[150px]">
                <div className="font-Lora leading-none tabular-nums" style={{ fontSize: "clamp(64px, 16vw, 104px)" }} aria-live="polite">
                  {bpm}
                </div>
                <div className="mt-1 font-Inter text-sm text-gray-400">
                  BPM · <span className="text-[#1BD79E] font-semibold">{tempoName(bpm)}</span>
                  {meter.compound && <span className="text-gray-500"> · per dotted quarter</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => changeBpm(bpm + 1)}
                aria-label="Faster by 1 BPM"
                className="h-12 w-12 rounded-full bg-[#161616] text-2xl text-gray-200 hover:bg-[#222] focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
              >
                +
              </button>
            </div>

            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(e) => changeBpm(Number(e.target.value))}
              aria-label="Tempo in BPM"
              className="metronome-range mt-6 w-full"
              style={{ background: `linear-gradient(to right, #1BD79E ${bpmPercent}%, #262626 ${bpmPercent}%)` }}
            />

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Stop metronome" : "Start metronome"}
                className={`h-16 w-16 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1BD79E] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  playing ? "bg-white text-black" : "bg-[#1BD79E] text-black"
                }`}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-7 w-7 ml-1" fill="currentColor" aria-hidden>
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={tap}
                className="h-12 px-5 rounded-full border border-white/15 font-Inter text-sm font-semibold text-gray-200 hover:border-[#1BD79E]/60 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
              >
                Tap tempo
              </button>
            </div>
            <p className="mt-2 h-4 text-center font-Inter text-xs text-gray-500">
              {taps.length === 1 ? "Keep tapping…" : taps.length > 1 ? `Measured from ${taps.length} taps` : ""}
            </p>
          </div>

          {/* Pendulum: pivot at the bottom like a wind-up metronome */}
          <svg viewBox="0 0 120 150" className="hidden md:block w-[120px] h-[150px]" aria-hidden>
            <path d="M 20 140 L 60 10 L 100 140 Z" fill="#141414" stroke="#262626" />
            <g ref={pendulumRef} style={{ transformOrigin: "60px 132px" }}>
              <line x1="60" y1="132" x2="60" y2="22" stroke={playing ? "#1BD79E" : "#52525b"} strokeWidth="3" strokeLinecap="round" />
              <rect x="50" y={36 + ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 70} width="20" height="12" rx="3" fill={playing ? "#1BD79E" : "#3f3f46"} />
            </g>
            <circle cx="60" cy="132" r="4" fill="#3f3f46" />
          </svg>
        </div>
      </section>

      {/* ── Settings ── */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Settings">
        <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5">
          <h2 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Time signature</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {METERS.map((m, i) => (
              <Chip key={m.name} active={i === meterIdx} onClick={() => selectMeter(i)}>
                {m.name}
              </Chip>
            ))}
          </div>
          <h2 className="mt-5 font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Subdivision</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {subdivOptions.map((o) => (
              <Chip key={o.value} active={o.value === subdiv} onClick={() => setSubdiv(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
          <p className="mt-3 font-Inter text-xs text-gray-500">Changes apply on the next beat, without stopping.</p>
        </div>

        <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5 flex flex-col gap-4">
          <h2 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Sound</h2>
          <div className="flex items-center justify-between gap-3">
            <span className="font-Inter text-sm text-gray-200">Accent the first beat</span>
            <Toggle checked={accent} onChange={setAccent} label="Accent the first beat" />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-Inter text-sm text-gray-200 shrink-0">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="Click volume"
              className="metronome-range flex-1"
              style={{ background: `linear-gradient(to right, #1BD79E ${volume * 100}%, #262626 ${volume * 100}%)` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-Inter text-sm text-gray-200">One-bar count-in</span>
            <Toggle checked={countIn} onChange={setCountIn} label="One-bar count-in" />
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl bg-[#0f0f0f] border border-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Speed trainer</h2>
              <p className="font-Inter text-sm text-gray-400 mt-1">Speeds up automatically while you play.</p>
            </div>
            <Toggle checked={trainer.enabled} onChange={(v) => setTrainer((t) => ({ ...t, enabled: v }))} label="Speed trainer" />
          </div>
          <div className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-Inter text-sm text-gray-300 ${trainer.enabled ? "" : "opacity-50"}`}>
            <span>Add</span>
            <NumberField label="BPM to add" value={trainer.step} min={1} max={20} onChange={(v) => setTrainer((t) => ({ ...t, step: v }))} suffix="BPM" />
            <span>every</span>
            <NumberField label="Bars between increases" value={trainer.everyBars} min={1} max={32} onChange={(v) => setTrainer((t) => ({ ...t, everyBars: v }))} suffix="bars" />
            <span>until</span>
            <NumberField label="Target BPM" value={trainer.target} min={MIN_BPM} max={MAX_BPM} onChange={(v) => setTrainer((t) => ({ ...t, target: v }))} suffix="BPM" />
          </div>
        </div>
      </section>

      <p className="mt-5 hidden md:block text-center font-Inter text-xs text-gray-500">
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-300">Space</kbd> start/stop ·{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-300">T</kbd> tap tempo ·{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-300">↑</kbd>
        <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-300">↓</kbd> ±1 BPM (Shift ±5)
      </p>
    </div>
  );
}
