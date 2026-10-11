import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { track as trackEvent } from "@/lib/analytics";
import { buildJamShareUrl, loadJamSession, saveJamSession } from "@/utils/jamPracticeHelpers";
import { findChord } from "@/helpers/chordSearch";
import ChordDiagram from "@/components/Chord/ChordDiagram";
import { STYLES, STYLE_BY_ID } from "@/jam/styles";
import { Arrangement, PartId, generateArrangement, styleProgressions, withCustomChords, progressionToChords } from "@/jam/arrangement";
import { KEY_NAMES, Mode, noteToPc, parseChord } from "@/jam/theory";
import { hashString } from "@/jam/rng";
import type { JamEngine as JamEngineType } from "@/jam/engine";
import { RIG_PRESETS, RigSettings, STYLE_RIG } from "@/jam/rig";
import { addUserTone, listUserTones, removeUserTone, type UserTone } from "@/jam/userTones";
import GuitarRigPanel from "./GuitarRigPanel";

const RIG_STORAGE_KEY = "jam-rig-v1";

const PARTS: { id: PartId; label: string }[] = [
  { id: "drums", label: "Drums" },
  { id: "bass", label: "Bass" },
  { id: "guitar", label: "Guitar" },
  { id: "keys", label: "Keys" },
];
const PLAYBACK_SPEEDS = [0.75, 1, 1.25] as const;
const LOOP_OPTIONS = [
  { value: 0, label: "∞" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 4, label: "4×" },
  { value: 8, label: "8×" },
];
const MINOR_SCALES = new Set(["natural_minor", "harmonic_minor", "melodic_minor", "pentatonic_minor", "blues", "dorian", "phrygian", "locrian"]);
const MIN_BPM = 40;
const MAX_BPM = 240;

const chipClass = (active: boolean) =>
  `h-8 px-3 rounded-full font-Inter text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
    active ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#161616] text-gray-300 hover:bg-[#222]"
  }`;

function parseCustom(text: string) {
  return text
    .split(/[\s,|→]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, valid: !!parseChord(name) && !!findChord(name) }));
}

export interface BackingTrackGeneratorProps {
  practiceKey?: string;
  onPracticeKeyChange?: (key: string) => void;
  practiceScaleId?: string;
  onSuggestScale?: (style: string, mode: Mode) => void;
  onOpenScales?: () => void;
}

export default function BackingTrackGenerator({ practiceKey, practiceScaleId, onSuggestScale, onOpenScales }: BackingTrackGeneratorProps) {
  const router = useRouter();
  const keyName = practiceKey && noteToPc(practiceKey) !== null ? KEY_NAMES[noteToPc(practiceKey)!] : "C";
  const scaleMode: Mode = practiceScaleId && MINOR_SCALES.has(practiceScaleId) ? "minor" : "major";

  const [styleId, setStyleId] = useState("rock");
  const [mode, setMode] = useState<Mode>(scaleMode);
  const [modeTouched, setModeTouched] = useState(false);
  const [progressionIndex, setProgressionIndex] = useState(0);
  const [seed, setSeed] = useState(1);
  const [bpm, setBpm] = useState(STYLE_BY_ID.rock.tempo.default);
  const [speed, setSpeed] = useState(1);
  const [loopLimit, setLoopLimit] = useState(0);
  const [countIn, setCountIn] = useState(true);
  const [customText, setCustomText] = useState("");
  const [parts, setParts] = useState<Record<PartId, boolean>>({ ...STYLE_BY_ID.rock.parts });
  const [volumes, setVolumes] = useState<Record<PartId, number>>({ drums: 0.8, bass: 0.8, guitar: 0.75, keys: 0.7 });

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [beat, setBeat] = useState<{ bar: number; beat: number; countIn: boolean } | null>(null);
  const [chordIdx, setChordIdx] = useState(-1);
  const [shareCopied, setShareCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rigPreset, setRigPreset] = useState<string | null>(STYLE_RIG.rock);
  const [rig, setRig] = useState<RigSettings>(RIG_PRESETS[STYLE_RIG.rock].settings);
  const [rigStatus, setRigStatus] = useState<string | null>(null);
  const [userTones, setUserTones] = useState<Omit<UserTone, "data">[]>([]);
  const engineRef = useRef<JamEngineType | null>(null);
  const hydrated = useRef(false);
  const style = STYLE_BY_ID[styleId];

  useEffect(() => {
    if (!modeTouched) setMode(scaleMode);
  }, [scaleMode, modeTouched]);

  // last-used rig (per browser) and the user's own .nam / IR files
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RIG_STORAGE_KEY) || "null");
      if (saved?.settings) {
        setRig(saved.settings);
        setRigPreset(saved.presetId ?? null);
      }
    } catch {
      /* storage unavailable */
    }
    listUserTones().then(setUserTones);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(RIG_STORAGE_KEY, JSON.stringify({ settings: rig, presetId: rigPreset }));
    } catch {
      /* storage unavailable */
    }
  }, [rig, rigPreset]);

  // restore the last session; share-link params override it
  useEffect(() => {
    if (!router.isReady || hydrated.current) return;
    hydrated.current = true;
    const saved = loadJamSession();
    const q = router.query;
    const st = typeof q.genre === "string" && STYLE_BY_ID[q.genre] ? q.genre : saved?.genre && STYLE_BY_ID[saved.genre] ? saved.genre : null;
    if (st) {
      setStyleId(st);
      setParts({ ...STYLE_BY_ID[st].parts });
    }
    const b = typeof q.bpm === "string" ? parseInt(q.bpm, 10) : saved?.bpm;
    if (b && b >= MIN_BPM && b <= MAX_BPM) setBpm(b);
    else if (st) setBpm(STYLE_BY_ID[st].tempo.default);
    const p = typeof q.preset === "string" ? parseInt(q.preset, 10) : saved?.preset;
    if (p !== undefined && p >= 0) setProgressionIndex(p);
    if (saved?.playbackSpeed) setSpeed(saved.playbackSpeed);
    if (saved?.loopLimit !== undefined) setLoopLimit(saved.loopLimit);
    if (q.countin === "1" || q.countin === "0") setCountIn(q.countin === "1");
    else if (saved?.countIn !== undefined) setCountIn(saved.countIn);
    const chords = typeof q.chords === "string" ? q.chords : saved?.customChords;
    if (chords) setCustomText(chords);
    if (typeof q.mode === "string" && (q.mode === "major" || q.mode === "minor")) {
      setMode(q.mode);
      setModeTouched(true);
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    saveJamSession({
      key: keyName,
      genre: styleId,
      bpm,
      preset: progressionIndex,
      playbackSpeed: speed,
      loopLimit,
      countIn,
      customChords: customText.trim() || undefined,
      scale: practiceScaleId,
      lastTab: "jam",
    });
  }, [keyName, styleId, bpm, progressionIndex, speed, loopLimit, countIn, customText, practiceScaleId]);

  const custom = useMemo(() => parseCustom(customText), [customText]);
  const progressions = styleProgressions(style, mode);
  const effectiveBpm = Math.round(bpm * speed);

  const arrangement: Arrangement = useMemo(() => {
    const base = generateArrangement({ style: styleId, key: keyName, mode, tempo: effectiveBpm, seed, progressionIndex: Math.min(progressionIndex, progressions.length - 1) });
    const withChords = custom.length ? withCustomChords(base, custom.filter((c) => c.valid).map((c) => c.name)) : base;
    return { ...withChords, tempo: effectiveBpm, parts };
  }, [styleId, keyName, mode, effectiveBpm, seed, progressionIndex, progressions.length, custom, parts]);

  // ── engine ─────────────────────────────────────────────────────────────────
  const getEngine = useCallback(async () => {
    if (!engineRef.current) {
      const { JamEngine } = await import("@/jam/engine");
      engineRef.current = new JamEngine({
        onBeat: (b) => setBeat({ bar: b.bar, beat: b.beat, countIn: b.countIn }),
        onChord: (i) => setChordIdx(i),
        onPass: (pass) => setPassCount(pass),
      });
      setRigStatus(null);
      const err = await engineRef.current.setRig(rigRef.current);
      setRigStatus(err);
    }
    return engineRef.current;
  }, []);

  const [passCount, setPassCount] = useState(0);
  const rigRef = useRef(rig);
  rigRef.current = rig;
  useEffect(() => () => engineRef.current?.dispose(), []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setPlaying(false);
    setBeat(null);
    setChordIdx(-1);
    setPassCount(0);
  }, []);

  const play = async () => {
    if (playing) return stop();
    setError(null);
    setLoading(true);
    try {
      const engine = await getEngine();
      PARTS.forEach(({ id }) => engine.setVolume(id, volumes[id]));
      await engine.start(arrangement, { countIn });
      setPlaying(true);
      trackEvent("backing_track_play", { key: keyName, genre: styleId, bpm: effectiveBpm, mode, chords: arrangement.chords.map((c) => c.chord).join(" ") });
    } catch {
      setError("Couldn’t start audio. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // rig changes go straight to the engine (works before and during playback)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const isModel = rig.guitar === "electric" && (rig.amp.model.startsWith("nam:") || rig.amp.model.startsWith("user:"));
    if (isModel) setRigStatus("Loading amp model…");
    engine.setRig(rig).then((err) => setRigStatus(err));
  }, [rig]);

  // live updates while playing
  useEffect(() => {
    if (playing) engineRef.current?.update(arrangement);
  }, [arrangement, playing]);
  useEffect(() => {
    if (playing && loopLimit > 0 && passCount >= loopLimit) stop();
  }, [passCount, loopLimit, playing, stop]);

  const changeStyle = (id: string) => {
    setStyleId(id);
    setBpm(STYLE_BY_ID[id].tempo.default);
    setParts({ ...STYLE_BY_ID[id].parts });
    setProgressionIndex(0);
    setCustomText("");
    const rigId = STYLE_RIG[id];
    if (rigId) {
      setRigPreset(rigId);
      setRig(RIG_PRESETS[rigId].settings);
    }
  };
  const newIdea = () => {
    const nextSeed = hashString(`${Date.now()}|${Math.random()}`);
    setSeed(nextSeed);
    setProgressionIndex(nextSeed % progressions.length);
    setCustomText("");
    trackEvent("backing_track_new_idea", { genre: styleId });
  };
  const changeBpm = (v: number) => setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v))));
  const setVolume = (p: PartId, v: number) => {
    setVolumes((s) => ({ ...s, [p]: v }));
    engineRef.current?.setVolume(p, v);
  };

  const exportWav = async (passes: number) => {
    setExporting(true);
    try {
      const { renderArrangement, audioBufferToWav } = await import("@/jam/engine");
      const muted = { drums: !parts.drums, bass: !parts.bass, guitar: !parts.guitar, keys: !parts.keys };
      const buf = await renderArrangement(arrangement, passes, { volumes, muted }, rig);
      const url = URL.createObjectURL(audioBufferToWav(buf));
      const a = document.createElement("a");
      a.href = url;
      a.download = `diachords-${keyName}${mode === "minor" ? "m" : ""}-${styleId}-${effectiveBpm}bpm.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      trackEvent("backing_track_export", { genre: styleId, passes });
    } catch {
      setError("Export failed. Try fewer loops.");
    } finally {
      setExporting(false);
    }
  };

  const copyShareLink = async () => {
    const url = buildJamShareUrl("/jam", {
      key: keyName,
      genre: styleId,
      bpm,
      preset: progressionIndex,
      countIn,
      customChords: customText.trim() || undefined,
    });
    const withMode = `${url}${url.includes("?") ? "&" : "?"}mode=${mode}`;
    try {
      await navigator.clipboard.writeText(withMode);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", withMode);
    }
  };

  // ── display ────────────────────────────────────────────────────────────────
  const chords = arrangement.chords;
  const nowIdx = playing && chordIdx >= 0 ? chordIdx : 0;
  const nowChord = chords[nowIdx]?.chord;
  const nextChord = chords[(nowIdx + 1) % chords.length]?.chord;
  const nowShape = nowChord ? findChord(nowChord) : undefined;
  const nextShape = nextChord ? findChord(nextChord) : undefined;
  const bpmPercent = ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100;
  const invalid = custom.filter((c) => !c.valid);
  const beatsPerBar = style.meter.beats;

  return (
    <div className="flex flex-col gap-5 text-white">
      {/* ── Now playing ── */}
      <section className="rounded-3xl bg-[#0f0f0f] border border-white/5 p-5 md:p-7" aria-label="Now playing">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="flex items-center gap-5 md:gap-8">
            <div className="shrink-0 rounded-2xl bg-[#161616] p-2">
              {nowShape?.positions[0] ? <ChordDiagram position={nowShape.positions[0]} size={112} title={`${nowChord} chord shape`} /> : <div className="w-[112px] h-[140px]" />}
            </div>
            <div className="min-w-0">
              <p className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-500">
                {beat?.countIn ? <span className="text-[#f59e0b]">Count-in</span> : playing ? "Now playing" : "First chord"}
                <span className="ml-2 normal-case tracking-normal text-gray-600">
                  {style.name} · {style.meter.label} · {keyName} {mode}
                </span>
              </p>
              <p className="font-Lora text-5xl md:text-6xl leading-tight text-[#1BD79E]" aria-live="polite">
                {nowChord ?? "—"}
              </p>
              {nextChord && chords.length > 1 && (
                <p className="mt-2 inline-flex items-center gap-2 font-Inter text-sm text-gray-400">
                  Next
                  {nextShape?.positions[0] && <ChordDiagram position={nextShape.positions[0]} size={46} showFingers={false} />}
                  <span className="font-Lora text-lg text-white">{nextChord}</span>
                </p>
              )}
              <div className="mt-3 flex gap-2" aria-hidden>
                {Array.from({ length: beatsPerBar }, (_, b) => (
                  <span
                    key={b}
                    className="h-3 w-3 rounded-full transition-all duration-75"
                    style={{
                      background: beat && beat.beat === b ? (beat.countIn ? "#f59e0b" : b === 0 ? "#1BD79E" : "#e5e7eb") : "#262626",
                      transform: beat && beat.beat === b ? "scale(1.25)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:w-[320px]">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={play}
                disabled={loading || !chords.length}
                className={`flex-1 h-14 rounded-full font-Inter text-base font-semibold inline-flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60 ${
                  playing ? "bg-white text-black" : "bg-[#1BD79E] text-black hover:brightness-110"
                }`}
              >
                {loading ? "Loading sounds…" : playing ? "■ Stop" : "▶ Start jam"}
              </button>
              <button
                type="button"
                onClick={newIdea}
                title="New progression and feel in this style"
                className="h-14 px-4 rounded-full border border-white/15 font-Inter text-sm font-semibold text-gray-200 hover:border-[#1BD79E]/60"
              >
                ✨ New idea
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => changeBpm(bpm - 5)} aria-label="Slower" className="h-9 w-9 shrink-0 rounded-full bg-[#161616] text-lg hover:bg-[#222]">
                −
              </button>
              <input
                type="range"
                min={MIN_BPM}
                max={MAX_BPM}
                value={bpm}
                onChange={(e) => changeBpm(Number(e.target.value))}
                aria-label="Tempo in BPM"
                className="metronome-range flex-1"
                style={{ background: `linear-gradient(to right, #1BD79E ${bpmPercent}%, #262626 ${bpmPercent}%)` }}
              />
              <button type="button" onClick={() => changeBpm(bpm + 5)} aria-label="Faster" className="h-9 w-9 shrink-0 rounded-full bg-[#161616] text-lg hover:bg-[#222]">
                +
              </button>
            </div>
            <p className="font-Inter text-sm text-center text-gray-400 tabular-nums">
              <span className="text-white font-semibold">{effectiveBpm}</span> BPM
              {speed !== 1 && <span className="text-gray-500"> ({Math.round(speed * 100)}% of {bpm})</span>}
              {playing && loopLimit > 0 && <span className="text-gray-500"> · loop {Math.min(passCount + 1, loopLimit)}/{loopLimit}</span>}
            </p>
            {error && (
              <p role="alert" className="font-Inter text-xs text-[#f59e0b] text-center">
                {error}
              </p>
            )}
          </div>
        </div>

        <ol className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1" aria-label="Progression">
          {chords.map((c, idx) => {
            const active = playing && !beat?.countIn && chordIdx === idx;
            return (
              <li
                key={idx}
                className={`shrink-0 min-w-[56px] px-3 py-2 rounded-xl text-center border transition-colors ${active ? "bg-[#1BD79E] text-black border-transparent" : "bg-[#161616] text-gray-200 border-white/5"}`}
                style={{ flexGrow: c.beats / beatsPerBar }}
              >
                <span className="block font-Lora text-lg">{c.chord}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Style + chords ── */}
        <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5 flex flex-col gap-5" aria-label="Style and chords">
          <div>
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Style</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button key={s.id} type="button" onClick={() => changeStyle(s.id)} aria-pressed={s.id === styleId} className={chipClass(s.id === styleId)} title={`${s.description} · ${s.meter.label}`}>
                  {s.name}
                </button>
              ))}
            </div>
            <p className="mt-2 font-Inter text-sm text-gray-500">
              {style.description} · {style.meter.label} · {style.tempo.min}–{style.tempo.max} BPM
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400 mr-1">Mode</span>
            {(["major", "minor"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setModeTouched(true);
                  setProgressionIndex(0);
                }}
                className={chipClass(mode === m)}
              >
                {keyName} {m}
              </button>
            ))}
          </div>

          <div>
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Progression</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {progressions.map((prog, idx) => {
                const active = !custom.length && progressionIndex === idx;
                const preview = progressionToChords(prog, noteToPc(keyName) ?? 0, mode, beatsPerBar).map((c) => c.chord);
                const unique = preview.filter((c, i) => i === 0 || c !== preview[i - 1]);
                return (
                  <button
                    key={prog}
                    type="button"
                    onClick={() => {
                      setProgressionIndex(idx);
                      setCustomText("");
                    }}
                    aria-pressed={active}
                    className={`text-left rounded-xl px-3.5 py-3 border transition-colors ${active ? "border-[#1BD79E]/60 bg-[#1BD79E]/10" : "border-white/5 bg-[#161616] hover:border-white/15"}`}
                  >
                    <span className={`block font-Inter text-xs ${active ? "text-[#1BD79E]" : "text-gray-500"}`}>{prog.split(" ").length} bars · {prog.replace(/\s+/g, " – ").slice(0, 46)}</span>
                    <span className="block font-Lora text-sm text-gray-200 mt-1 truncate">{unique.join(" · ")}</span>
                  </button>
                );
              })}
            </div>
            <label htmlFor="custom-chords" className="block mt-4 font-Inter text-sm text-gray-300">
              Or type your own chords
            </label>
            <input
              id="custom-chords"
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. Am F C G  ·  D/F# Em7 Cadd9 G"
              className="mt-1.5 w-full h-11 rounded-xl bg-[#161616] border border-white/10 px-3 font-Lora text-base text-white placeholder:text-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            />
            <p className="mt-1.5 font-Inter text-xs text-gray-500">One chord per bar. Separate with spaces, commas or |.</p>
            {invalid.length > 0 && <p className="mt-1 font-Inter text-xs text-[#f59e0b]">Not recognised, so skipped: {invalid.map((c) => c.name).join(", ")}</p>}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          {/* ── Mixer ── */}
          <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5" aria-label="Mixer">
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Band</h3>
            <div className="mt-3 flex flex-col gap-3">
              {PARTS.map(({ id, label }) => {
                const on = parts[id];
                return (
                  <div key={id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setParts((p) => ({ ...p, [id]: !p[id] }))}
                      aria-pressed={on}
                      aria-label={`${on ? "Turn off" : "Turn on"} ${label}`}
                      className={`w-20 shrink-0 h-9 rounded-full font-Inter text-sm font-semibold border transition-colors ${on ? "border-[#1BD79E]/50 text-white" : "border-white/10 text-gray-500 line-through"}`}
                    >
                      {label}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(volumes[id] * 100)}
                      onChange={(e) => setVolume(id, Number(e.target.value) / 100)}
                      aria-label={`${label} volume`}
                      disabled={!on}
                      className="metronome-range flex-1 disabled:opacity-40"
                      style={{ background: `linear-gradient(to right, #1BD79E ${on ? volumes[id] * 100 : 0}%, #262626 ${on ? volumes[id] * 100 : 0}%)` }}
                    />
                    <span className="w-9 text-right font-Inter text-xs tabular-nums text-gray-500">{on ? Math.round(volumes[id] * 100) : "off"}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 font-Inter text-xs text-gray-500">Real recorded drums, bass, acoustic guitar and piano. Turn the guitar off to play the chords yourself.</p>
          </section>

          {/* ── Practice ── */}
          <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5 flex flex-col gap-4" aria-label="Practice options">
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Practice</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-Inter text-sm text-gray-300 w-14">Speed</span>
              {PLAYBACK_SPEEDS.map((s) => (
                <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s} className={chipClass(speed === s)}>
                  {Math.round(s * 100)}%
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-Inter text-sm text-gray-300 w-14">Loops</span>
              {LOOP_OPTIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => setLoopLimit(o.value)} aria-pressed={loopLimit === o.value} className={chipClass(loopLimit === o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="font-Inter text-sm text-gray-300">One-bar count-in</span>
              <button
                type="button"
                role="switch"
                aria-checked={countIn}
                onClick={() => setCountIn((c) => !c)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${countIn ? "bg-[#1BD79E]" : "bg-[#333]"}`}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${countIn ? "left-6" : "left-1"}`} />
              </button>
            </label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-Inter text-sm text-gray-300 w-14">Save</span>
              {[1, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => exportWav(n)}
                  disabled={exporting}
                  className="h-9 px-3.5 rounded-full border border-[#1BD79E]/40 text-[#1BD79E] font-Inter text-sm font-semibold hover:bg-[#1BD79E]/10 disabled:opacity-50"
                >
                  {exporting ? "Rendering…" : `⬇ WAV · ${n} loop${n > 1 ? "s" : ""}`}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {onOpenScales && (
                <button type="button" onClick={onOpenScales} className="h-9 px-3.5 rounded-full border border-white/15 text-gray-200 font-Inter text-sm hover:border-white/30">
                  Solo on the scale fretboard
                </button>
              )}
              {onSuggestScale && (
                <button type="button" onClick={() => onSuggestScale(styleId, mode)} className="h-9 px-3.5 rounded-full border border-white/15 text-gray-200 font-Inter text-sm hover:border-white/30">
                  Best scale for {style.name.toLowerCase()}
                </button>
              )}
              <button type="button" onClick={copyShareLink} className="h-9 px-3.5 rounded-full border border-white/15 text-gray-200 font-Inter text-sm hover:border-white/30">
                {shareCopied ? "✓ Link copied" : "Copy share link"}
              </button>
            </div>
          </section>
        </div>
      </div>

      <GuitarRigPanel
        settings={rig}
        presetId={rigPreset}
        onPreset={(id) => {
          setRigPreset(id);
          setRig(RIG_PRESETS[id].settings);
        }}
        onChange={(next) => {
          setRig(next);
          setRigPreset(null);
        }}
        userTones={userTones}
        onAddFiles={async (files) => {
          let last: Omit<UserTone, "data"> | null = null;
          for (const f of Array.from(files)) last = await addUserTone(f);
          setUserTones(await listUserTones());
          // switch to what was just loaded so you hear it straight away
          if (last) {
            const added = last;
            setRigPreset(null);
            setRig((r) => (added.kind === "nam" ? { ...r, guitar: "electric", amp: { ...r.amp, model: `user:${added.id}` } } : { ...r, guitar: "electric", cab: `user:${added.id}` }));
            trackEvent("rig_user_tone_added", { kind: added.kind });
          }
        }}
        onRemoveTone={async (id) => {
          await removeUserTone(id);
          setUserTones(await listUserTones());
          setRig((r) => ({
            ...r,
            amp: r.amp.model === `user:${id}` ? { ...r.amp, model: "clean" } : r.amp,
            cab: r.cab === `user:${id}` ? "2x12" : r.cab,
          }));
        }}
        status={rigStatus}
      />
    </div>
  );
}
