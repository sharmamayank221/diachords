import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { track as trackEvent } from "@/lib/analytics";
import { createBackingTrack, disposeBackingTrack, isKnownChord, Genre, BackingTrack } from "@/utils/backingTrackEngine";
import { buildJamShareUrl, loadJamSession, saveJamSession } from "@/utils/jamPracticeHelpers";
import { spellScale } from "@/helpers/scaleSpelling";
import { findChord } from "@/helpers/chordSearch";
import ChordDiagram from "@/components/Chord/ChordDiagram";

// ── Data ──────────────────────────────────────────────────────────────────────

const GENRES: { id: Genre; name: string; description: string }[] = [
  { id: "rock", name: "Rock", description: "Driving eighth-note beat" },
  { id: "blues", name: "Blues", description: "Shuffle with a boogie bass" },
  { id: "jazz", name: "Jazz", description: "Swing ride, walking bass" },
  { id: "pop", name: "Pop", description: "Modern, steady beat" },
  { id: "funk", name: "Funk", description: "Syncopated and tight" },
  { id: "reggae", name: "Reggae", description: "Off-beat skank" },
  { id: "country", name: "Country", description: "Train beat, root–fifth bass" },
];

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// written in C; transposed to the chosen key
const PRESET_PROGRESSIONS = [
  { name: "I–V–vi–IV", label: "Pop", chords: ["C", "G", "Am", "F"] },
  { name: "I–IV–V", label: "Rock", chords: ["C", "F", "G", "G"] },
  { name: "ii–V–I", label: "Jazz", chords: ["Dm7", "G7", "Cmaj7", "Cmaj7"] },
  { name: "I–vi–IV–V", label: "50s", chords: ["C", "Am", "F", "G"] },
  { name: "vi–IV–I–V", label: "Sad", chords: ["Am", "F", "C", "G"] },
  { name: "I–IV", label: "2-chord", chords: ["C", "F", "C", "F"] },
  { name: "12-bar blues", label: "Blues", chords: ["C7", "C7", "C7", "C7", "F7", "F7", "C7", "C7", "G7", "F7", "C7", "G7"] },
  { name: "i–VII–VI–VII", label: "Minor", chords: ["Cm", "Bb", "Ab", "Bb"] },
];

const INSTRUMENTS: { key: "drums" | "bass" | "rhythm"; label: string }[] = [
  { key: "drums", label: "Drums" },
  { key: "bass", label: "Bass" },
  { key: "rhythm", label: "Guitar" },
];

const VALID_GENRES = new Set<Genre>(GENRES.map((g) => g.id));
const PLAYBACK_SPEEDS = [0.75, 1, 1.25] as const;
const LOOP_OPTIONS = [
  { value: 0, label: "∞" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 4, label: "4×" },
  { value: 8, label: "8×" },
];
const MIN_BPM = 60;
const MAX_BPM = 180;

// Transpose a chord written in C into `key`, spelled the way that key is written (Ab key → Db, not C#)
function transposeChord(chord: string, key: string): string {
  const m = chord.match(/^([A-G])([#b]?)(.*)$/);
  if (!m) return chord;
  const fromPc = (LETTER_PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
  const keyPc = KEYS.indexOf(key);
  if (keyPc < 0) return chord;
  const pc = (fromPc + keyPc) % 12;
  const spelled = spellScale(keyPc, [0, 2, 4, 5, 7, 9, 11]);
  const inKey = spelled.nameForPc(pc);
  if (inKey) return inKey + m[3];
  // borrowed chords keep the direction they're written in (bVII stays a flat: Bb, not A#)
  const flat = m[2] === "b" || (m[2] !== "#" && spelled.names.some((n) => n.includes("b")));
  return (flat ? FLATS : SHARPS)[pc] + m[3];
}

function parseCustomChords(text: string) {
  return text
    .split(/[\s,|→]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, valid: isKnownChord(name) }));
}

const chipClass = (active: boolean) =>
  `h-8 px-3 rounded-full font-Inter text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
    active ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#161616] text-gray-300 hover:bg-[#222]"
  }`;

// ── Component ─────────────────────────────────────────────────────────────────

export interface BackingTrackGeneratorProps {
  practiceKey?: string;
  onPracticeKeyChange?: (key: string) => void;
  practiceScaleId?: string;
  onSuggestScale?: (genre: Genre) => void;
  onOpenScales?: () => void;
}

export default function BackingTrackGenerator({ practiceKey, practiceScaleId, onSuggestScale, onOpenScales }: BackingTrackGeneratorProps) {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<Genre>("rock");
  const [selectedKey, setSelectedKey] = useState(practiceKey && KEYS.includes(practiceKey) ? practiceKey : "C");
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [countingIn, setCountingIn] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopLimit, setLoopLimit] = useState(0);
  const [loopsDone, setLoopsDone] = useState(0);
  const [countIn, setCountIn] = useState(true);
  const [customChordsText, setCustomChordsText] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [volumes, setVolumes] = useState({ drums: 80, bass: 70, rhythm: 55 });
  const [muted, setMuted] = useState({ drums: false, bass: false, rhythm: false });

  const trackRef = useRef<BackingTrack | null>(null);
  const lastChordIdxRef = useRef(-1);
  const loopsRef = useRef(0);
  const hydratedRef = useRef(false);

  useEffect(() => () => disposeBackingTrack(), []);

  // restore the last session, then let URL params (share links) override it
  useEffect(() => {
    if (!router.isReady || hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = loadJamSession();
    if (saved) {
      if (VALID_GENRES.has(saved.genre as Genre)) setSelectedGenre(saved.genre as Genre);
      if (saved.bpm >= MIN_BPM && saved.bpm <= MAX_BPM) setBpm(saved.bpm);
      if (saved.preset >= 0 && saved.preset < PRESET_PROGRESSIONS.length) setSelectedPreset(saved.preset);
      if (saved.playbackSpeed) setPlaybackSpeed(saved.playbackSpeed);
      if (saved.loopLimit !== undefined) setLoopLimit(saved.loopLimit);
      if (saved.countIn !== undefined) setCountIn(saved.countIn);
      if (saved.customChords) setCustomChordsText(saved.customChords);
    }
    const { genre, bpm: bpmParam, preset, speed, loops, countin, chords } = router.query;
    if (typeof genre === "string" && VALID_GENRES.has(genre as Genre)) setSelectedGenre(genre as Genre);
    if (typeof bpmParam === "string") {
      const n = parseInt(bpmParam, 10);
      if (n >= MIN_BPM && n <= MAX_BPM) setBpm(n);
    }
    if (typeof preset === "string") {
      const i = parseInt(preset, 10);
      if (i >= 0 && i < PRESET_PROGRESSIONS.length) setSelectedPreset(i);
    }
    if (typeof speed === "string" && PLAYBACK_SPEEDS.includes(parseFloat(speed) as (typeof PLAYBACK_SPEEDS)[number])) setPlaybackSpeed(parseFloat(speed));
    if (typeof loops === "string" && parseInt(loops, 10) >= 0) setLoopLimit(parseInt(loops, 10));
    if (countin === "1" || countin === "0") setCountIn(countin === "1");
    if (typeof chords === "string") setCustomChordsText(chords);
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (practiceKey && KEYS.includes(practiceKey)) setSelectedKey(practiceKey);
  }, [practiceKey]);

  useEffect(() => {
    saveJamSession({
      key: selectedKey,
      genre: selectedGenre,
      bpm,
      preset: selectedPreset,
      playbackSpeed,
      loopLimit,
      countIn,
      customChords: customChordsText.trim() || undefined,
      scale: practiceScaleId,
      lastTab: "jam",
    });
  }, [selectedKey, selectedGenre, bpm, selectedPreset, playbackSpeed, loopLimit, countIn, customChordsText, practiceScaleId]);

  const effectiveBpm = Math.round(bpm * playbackSpeed);
  const custom = useMemo(() => parseCustomChords(customChordsText), [customChordsText]);
  const chords = useMemo(
    () => (custom.length ? custom.filter((c) => c.valid).map((c) => c.name) : PRESET_PROGRESSIONS[selectedPreset].chords.map((c) => transposeChord(c, selectedKey))),
    [custom, selectedPreset, selectedKey]
  );
  const chordKey = chords.join(" ");

  // ── Transport ──────────────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    trackRef.current?.stop();
    trackRef.current = null;
    setIsPlaying(false);
    setCountingIn(false);
    setCurrentBeat(-1);
    setCurrentChordIndex(-1);
    lastChordIdxRef.current = -1;
    loopsRef.current = 0;
    setLoopsDone(0);
  }, []);

  const startSession = useCallback(
    async (withCountIn: boolean) => {
      if (!chords.length) return;
      setStarting(true);
      const len = chords.length;
      const t = await createBackingTrack({
        key: selectedKey,
        bpm: effectiveBpm,
        genre: selectedGenre,
        chordProgression: chords,
        countIn: withCountIn,
        onBeat: (beat, isCount) => {
          setCountingIn(isCount);
          setCurrentBeat(beat);
        },
        onChordChange: (idx) => {
          if (lastChordIdxRef.current === len - 1 && idx === 0) {
            loopsRef.current += 1;
            setLoopsDone(loopsRef.current);
          }
          lastChordIdxRef.current = idx;
          setCurrentChordIndex(idx);
        },
      });
      t.setVolume("drums", muted.drums ? 0 : volumes.drums);
      t.setVolume("bass", muted.bass ? 0 : volumes.bass);
      t.setVolume("rhythm", muted.rhythm ? 0 : volumes.rhythm);
      trackRef.current = t;
      lastChordIdxRef.current = -1;
      loopsRef.current = 0;
      setLoopsDone(0);
      t.start();
      setStarting(false);
      setIsPlaying(true);
    },
    [chords, selectedKey, effectiveBpm, selectedGenre, muted, volumes]
  );

  const handlePlay = async () => {
    if (isPlaying) return stopSession();
    if (starting) return;
    trackEvent("backing_track_play", { key: selectedKey, genre: selectedGenre, bpm: effectiveBpm, chords: chordKey });
    await startSession(countIn);
  };

  // stop after the chosen number of loops
  useEffect(() => {
    if (isPlaying && loopLimit > 0 && loopsDone >= loopLimit) stopSession();
  }, [isPlaying, loopLimit, loopsDone, stopSession]);

  // changing the style or the chords while playing restarts the band with them (no count-in)
  const restartKey = `${selectedGenre}|${chordKey}`;
  const lastRestartKey = useRef(restartKey);
  useEffect(() => {
    if (lastRestartKey.current === restartKey) return;
    lastRestartKey.current = restartKey;
    if (trackRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
      startSession(false);
    }
  }, [restartKey, startSession]);

  const changeBpm = (v: number) => {
    const next = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v)));
    setBpm(next);
    trackRef.current?.setBpm(Math.round(next * playbackSpeed));
  };
  const changeSpeed = (s: number) => {
    setPlaybackSpeed(s);
    trackRef.current?.setBpm(Math.round(bpm * s));
  };
  const handleVolume = (inst: "drums" | "bass" | "rhythm", v: number) => {
    setVolumes((p) => ({ ...p, [inst]: v }));
    if (!muted[inst]) trackRef.current?.setVolume(inst, v);
  };
  const handleMute = (inst: "drums" | "bass" | "rhythm") => {
    const next = !muted[inst];
    setMuted((p) => ({ ...p, [inst]: next }));
    trackRef.current?.setVolume(inst, next ? 0 : volumes[inst]);
  };

  const copyShareLink = async () => {
    const url = buildJamShareUrl("/jam", {
      key: selectedKey,
      genre: selectedGenre,
      bpm,
      preset: selectedPreset,
      playbackSpeed,
      loopLimit,
      countIn,
      customChords: customChordsText.trim() || undefined,
    });
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  // ── Derived display ────────────────────────────────────────────────────────
  const activeGenre = GENRES.find((g) => g.id === selectedGenre)!;
  const nowIdx = isPlaying && currentChordIndex >= 0 ? currentChordIndex : 0;
  const nowChord = chords[nowIdx];
  const nextChord = chords[(nowIdx + 1) % chords.length];
  const nowShape = nowChord ? findChord(nowChord) : undefined;
  const nextShape = nextChord ? findChord(nextChord) : undefined;
  const bpmPercent = ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100;
  const invalid = custom.filter((c) => !c.valid);

  return (
    <div className="flex flex-col gap-5 text-white">
      {/* ── Now playing ── */}
      <section className="rounded-3xl bg-[#0f0f0f] border border-white/5 p-5 md:p-7" aria-label="Now playing">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="flex items-center gap-5 md:gap-8">
            <div className="shrink-0 rounded-2xl bg-[#161616] p-2">
              {nowShape?.positions[0] ? (
                <ChordDiagram position={nowShape.positions[0]} size={112} title={`${nowChord} chord shape`} />
              ) : (
                <div className="w-[112px] h-[140px]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-500">
                {countingIn ? <span className="text-[#f59e0b]">Count-in</span> : isPlaying ? "Now playing" : "First chord"}
              </p>
              <p className="font-Lora text-5xl md:text-6xl leading-tight text-[#1BD79E]" aria-live="polite">
                {nowChord ?? "—"}
              </p>
              <div className="mt-2 flex items-center gap-3">
                {nextChord && chords.length > 1 && (
                  <span className="inline-flex items-center gap-2 font-Inter text-sm text-gray-400">
                    Next
                    {nextShape?.positions[0] && <ChordDiagram position={nextShape.positions[0]} size={46} showFingers={false} />}
                    <span className="font-Lora text-lg text-white">{nextChord}</span>
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-2" aria-hidden>
                {[0, 1, 2, 3].map((b) => (
                  <span
                    key={b}
                    className="h-3 w-3 rounded-full transition-all duration-75"
                    style={{
                      background: currentBeat === b ? (countingIn ? "#f59e0b" : b === 0 ? "#1BD79E" : "#e5e7eb") : "#262626",
                      transform: currentBeat === b ? "scale(1.25)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:w-[300px]">
            <button
              type="button"
              onClick={handlePlay}
              disabled={!chords.length}
              className={`h-14 rounded-full font-Inter text-base font-semibold inline-flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-40 ${
                isPlaying ? "bg-white text-black" : "bg-[#1BD79E] text-black hover:brightness-110"
              }`}
            >
              {starting ? "Loading sounds…" : isPlaying ? "■ Stop" : "▶ Start jam"}
            </button>
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
              {playbackSpeed !== 1 && <span className="text-gray-500"> ({Math.round(playbackSpeed * 100)}% of {bpm})</span>}
              {isPlaying && loopLimit > 0 && <span className="text-gray-500"> · loop {Math.min(loopsDone + 1, loopLimit)}/{loopLimit}</span>}
            </p>
          </div>
        </div>

        {/* progression strip */}
        <ol className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1" aria-label="Progression">
          {chords.map((chord, idx) => {
            const active = isPlaying && !countingIn && currentChordIndex === idx;
            return (
              <li
                key={idx}
                className={`shrink-0 min-w-[56px] px-3 py-2 rounded-xl text-center font-Lora text-lg border transition-colors ${
                  active ? "bg-[#1BD79E] text-black border-transparent" : "bg-[#161616] text-gray-200 border-white/5"
                }`}
              >
                {chord}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Style + progression ── */}
        <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5 flex flex-col gap-5" aria-label="Style and chords">
          <div>
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Style</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button key={g.id} type="button" onClick={() => setSelectedGenre(g.id)} aria-pressed={g.id === selectedGenre} className={chipClass(g.id === selectedGenre)}>
                  {g.name}
                </button>
              ))}
            </div>
            <p className="mt-2 font-Inter text-sm text-gray-500">{activeGenre.description}</p>
          </div>

          <div>
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Progression in {selectedKey}</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_PROGRESSIONS.map((prog, idx) => {
                const active = !custom.length && selectedPreset === idx;
                const preview = prog.chords.slice(0, 4).map((c) => transposeChord(c, selectedKey));
                return (
                  <button
                    key={prog.name}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(idx);
                      setCustomChordsText("");
                    }}
                    aria-pressed={active}
                    className={`text-left rounded-xl px-3.5 py-3 border transition-colors ${active ? "border-[#1BD79E]/60 bg-[#1BD79E]/10" : "border-white/5 bg-[#161616] hover:border-white/15"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={`font-Inter text-sm font-semibold ${active ? "text-[#1BD79E]" : "text-white"}`}>{prog.name}</span>
                      <span className="font-Inter text-[11px] text-gray-500">{prog.label}</span>
                    </span>
                    <span className="block font-Lora text-sm text-gray-400 mt-1">
                      {preview.join(" · ")}
                      {prog.chords.length > 4 ? " …" : ""}
                    </span>
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
              value={customChordsText}
              onChange={(e) => setCustomChordsText(e.target.value)}
              placeholder="e.g. Am F C G  ·  D/F# Em7 Cadd9 G"
              className="mt-1.5 w-full h-11 rounded-xl bg-[#161616] border border-white/10 px-3 font-Lora text-base text-white placeholder:text-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            />
            <p className="mt-1.5 font-Inter text-xs text-gray-500">One chord per bar. Separate with spaces, commas or |.</p>
            {invalid.length > 0 && (
              <p role="alert" className="mt-1 font-Inter text-xs text-[#f59e0b]">
                Not recognised, so skipped: {invalid.map((c) => c.name).join(", ")}
              </p>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          {/* ── Mixer ── */}
          <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5" aria-label="Mixer">
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Mixer</h3>
            <div className="mt-3 flex flex-col gap-3">
              {INSTRUMENTS.map(({ key, label }) => {
                const isMuted = muted[key];
                const v = volumes[key];
                return (
                  <div key={key} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleMute(key)}
                      aria-pressed={isMuted}
                      aria-label={`${isMuted ? "Unmute" : "Mute"} ${label}`}
                      className={`w-20 shrink-0 h-9 rounded-full font-Inter text-sm font-semibold border transition-colors ${
                        isMuted ? "border-white/10 text-gray-500 line-through" : "border-[#1BD79E]/40 text-white"
                      }`}
                    >
                      {label}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={v}
                      onChange={(e) => handleVolume(key, Number(e.target.value))}
                      aria-label={`${label} volume`}
                      disabled={isMuted}
                      className="metronome-range flex-1 disabled:opacity-40"
                      style={{ background: `linear-gradient(to right, #1BD79E ${isMuted ? 0 : v}%, #262626 ${isMuted ? 0 : v}%)` }}
                    />
                    <span className="w-9 text-right font-Inter text-xs tabular-nums text-gray-500">{isMuted ? "off" : v}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 font-Inter text-xs text-gray-500">Tip: mute the guitar and play the chords yourself.</p>
          </section>

          {/* ── Practice options ── */}
          <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5 flex flex-col gap-4" aria-label="Practice options">
            <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Practice</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-Inter text-sm text-gray-300 w-14">Speed</span>
              {PLAYBACK_SPEEDS.map((s) => (
                <button key={s} type="button" onClick={() => changeSpeed(s)} aria-pressed={playbackSpeed === s} className={chipClass(playbackSpeed === s)}>
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
            <div className="flex flex-wrap gap-2 pt-1">
              {onOpenScales && (
                <button type="button" onClick={onOpenScales} className="h-9 px-3.5 rounded-full border border-[#1BD79E]/40 text-[#1BD79E] font-Inter text-sm font-semibold hover:bg-[#1BD79E]/10">
                  Solo on the scale fretboard
                </button>
              )}
              {onSuggestScale && (
                <button type="button" onClick={() => onSuggestScale(selectedGenre)} className="h-9 px-3.5 rounded-full border border-white/15 text-gray-200 font-Inter text-sm hover:border-white/30">
                  Best scale for {activeGenre.name.toLowerCase()}
                </button>
              )}
              <button type="button" onClick={copyShareLink} className="h-9 px-3.5 rounded-full border border-white/15 text-gray-200 font-Inter text-sm hover:border-white/30">
                {shareCopied ? "✓ Link copied" : "Copy share link"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
