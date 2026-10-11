import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SCALES, GUITAR_STRINGS, getIntervalName, getChordMidiNotes } from "@/data/scales";
import { initAudio, playNote, playProgressionWithDrums, setProgressionBpm, ProgressionChord } from "@/utils/audioUtils";
import { jamKeyToRootIndex } from "@/utils/practiceKeySync";
import { spellScale } from "@/helpers/scaleSpelling";
import { getScalePositions, type PositionSystem } from "@/helpers/scalePositions";
import { findChord } from "@/helpers/chordSearch";
import { getChordStringNotes } from "@/helpers/chordNotes";
import { useNoteListener, LISTEN_ERROR_TEXT } from "@/hooks/useNoteListener";
import ChordDiagram from "@/components/Chord/ChordDiagram";
import { track } from "@/lib/analytics";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScaleNote {
  string: number;
  fret: number;
  note: string;
  midiNote: number;
  isRoot: boolean;
  interval: number;
  color: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STRING_HEIGHTS = ["1px", "2px", "3px", "3.5px", "4px", "5px"];
const NUM_FRETS = 24;
const STRINGS = [1, 2, 3, 4, 5, 6]; // high E (top) → low E (bottom)
const STRING_NAMES: Record<number, string> = { 1: "E", 2: "B", 3: "G", 4: "D", 5: "A", 6: "E" };
const SINGLE_DOTS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOTS = [12, 24];
const MIN_BPM = 60;
const MAX_BPM = 180;

const CHORD_SUFFIX: Record<string, string> = { major: "", minor: "m", dim: "dim", "7": "7", m7: "m7", maj7: "maj7" };

// ─────────────────────────────────────────────────────────────────────────────
// FretboardNote — DO NOT MODIFY (user-approved look)
// ─────────────────────────────────────────────────────────────────────────────

const FretboardNote = React.memo(({
  note, isNotePlaying, isDetected, showIntervals, onClick,
}: {
  note: ScaleNote;
  isNotePlaying: boolean;
  isDetected: boolean;
  showIntervals: boolean;
  onClick: (note: ScaleNote) => void;
}) => (
  <button
    onClick={() => onClick(note)}
    aria-label={`Play ${note.note} on string ${note.string}`}
    className="absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] h-6 w-6 md:h-[30px] md:w-[30px] rounded-full transition-all duration-150 cursor-pointer hover:scale-125 active:scale-95 focus:outline-none"
    style={{
      background: note.isRoot ? "#1BD79E" : "#2D2D2D",
      border: note.isRoot ? "none" : "2px solid #1BD79E",
      transform: `translate(-50%, -50%) scale(${isNotePlaying || isDetected ? 1.25 : 1})`,
      boxShadow: isNotePlaying
        ? "0 0 20px #1BD79E, 0 0 40px #1BD79E"
        : isDetected
        ? "0 0 20px #38DBE5, 0 0 40px #38DBE5"
        : "none",
      outline: isDetected ? "3px solid #38DBE5" : "none",
    }}
  >
    <span className={`flex items-center justify-center font-Lora text-xs font-bold ${note.isRoot ? "text-black" : "text-white"}`}>
      {showIntervals ? getIntervalName(note.interval) : note.note}
    </span>
  </button>
));
FretboardNote.displayName = "FretboardNote";

// ── Component ─────────────────────────────────────────────────────────────────

export interface ScaleFretboardProps {
  practiceKey?: string;
  onPracticeKeyChange?: (key: string) => void;
  practiceScaleId?: string;
  onPracticeScaleChange?: (scaleId: string) => void;
  onOpenJam?: () => void;
  /** slim version that sits under the backing track (no big header, no progression player) */
  compact?: boolean;
  /** chord the band is playing right now: its notes get a ring on the neck */
  currentChord?: { name: string; pcs: number[] } | null;
}

export default function ScaleFretboard({ practiceKey = "C", practiceScaleId = "major", onOpenJam, compact = false, currentChord: bandChord = null }: ScaleFretboardProps) {
  const scaleId = SCALES[practiceScaleId] ? practiceScaleId : "major";
  const scale = SCALES[scaleId];
  const rootPc = jamKeyToRootIndex(practiceKey);
  const spelled = useMemo(() => spellScale(rootPc, scale.intervals, scaleId), [rootPc, scale, scaleId]);

  const [showIntervals, setShowIntervals] = useState(false);
  const [position, setPosition] = useState<number | null>(null); // null = all notes
  const [system, setSystem] = useState<PositionSystem>("positions");
  const [playingNote, setPlayingNote] = useState<number | null>(null);
  const [scalePlaying, setScalePlaying] = useState(false);
  const [progIdx, setProgIdx] = useState(0);
  const [progPlaying, setProgPlaying] = useState(false);
  const [currentChord, setCurrentChord] = useState<number | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [bpm, setBpm] = useState(90);

  const scaleRun = useRef(0); // bump to cancel a running "play scale"
  const stopProg = useRef<(() => void) | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fretRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const listener = useNoteListener();

  useEffect(() => {
    initAudio();
  }, []);

  // ── Notes on the neck ──────────────────────────────────────────────────────
  const notes: ScaleNote[] = useMemo(() => {
    const out: ScaleNote[] = [];
    for (const s of GUITAR_STRINGS) {
      for (let fret = 0; fret <= NUM_FRETS; fret++) {
        const midi = s.openNote + fret;
        const iv = (midi - rootPc + 120) % 12;
        const idx = scale.intervals.indexOf(iv);
        if (idx === -1) continue;
        out.push({ string: s.string, fret, note: spelled.names[idx], midiNote: midi, isRoot: iv === 0, interval: iv, color: s.color });
      }
    }
    return out;
  }, [rootPc, scale, spelled]);
  const noteAt = useMemo(() => {
    const m = new Map<string, ScaleNote>();
    notes.forEach((n) => m.set(`${n.string}:${n.fret}`, n));
    return m;
  }, [notes]);

  // Positions (one window per scale note on low E) or the five CAGED shapes — see scalePositions.ts
  const positions = useMemo(() => getScalePositions(rootPc, scale.intervals, system), [rootPc, scale, system]);
  const win = position !== null ? positions[position] : null;
  const inWindow = (fret: number) => !win || (fret >= win.from && fret <= win.to);

  // a new key or scale starts from "all notes"
  useEffect(() => {
    setPosition(null);
    setProgIdx(0);
  }, [rootPc, scaleId]);
  useEffect(() => setPosition(null), [system]);

  // bring the chosen position (or the first root) into view — matters most on phones
  useEffect(() => {
    const scroller = scrollerRef.current;
    const target = win ? win.from : positions[0]?.from ?? 0;
    const col = target === 0 ? null : fretRefs.current[target];
    if (!scroller) return;
    if (!col) {
      scroller.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    // keep the window's first fret just right of the pinned string labels (+ the open-string column)
    const labelsWidth = 32 + 48;
    const offset = col.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    scroller.scrollTo({ left: Math.max(0, offset - labelsWidth - 8), behavior: "smooth" });
  }, [win, positions]);

  // ── Playback ───────────────────────────────────────────────────────────────
  const flash = (midi: number, ms = 450) => {
    setPlayingNote(midi);
    setTimeout(() => setPlayingNote((p) => (p === midi ? null : p)), ms);
  };

  const handleNoteClick = useCallback((n: ScaleNote) => {
    playNote(n.midiNote);
    setPlayingNote(n.midiNote);
    setTimeout(() => setPlayingNote((p) => (p === n.midiNote ? null : p)), 450);
  }, []);

  const toggleScale = async () => {
    if (scalePlaying) {
      scaleRun.current++;
      setScalePlaying(false);
      setPlayingNote(null);
      return;
    }
    // inside the chosen position, or one octave up from the lowest root
    let run: number[];
    if (win) {
      run = Array.from(new Set(notes.filter((n) => inWindow(n.fret)).map((n) => n.midiNote))).sort((a, b) => a - b);
    } else {
      const low = Math.min(...notes.filter((n) => n.isRoot).map((n) => n.midiNote));
      run = Array.from(new Set(notes.filter((n) => n.midiNote >= low && n.midiNote <= low + 12).map((n) => n.midiNote))).sort((a, b) => a - b);
    }
    const sequence = [...run, ...run.slice(0, -1).reverse()];
    const id = ++scaleRun.current;
    setScalePlaying(true);
    track("scale_play", { key: spelled.rootName, scale: scaleId, system, position: position === null ? "all" : positions[position].label });
    for (const midi of sequence) {
      if (scaleRun.current !== id) return;
      playNote(midi);
      flash(midi, 300);
      await new Promise((r) => setTimeout(r, 60000 / bpmRef.current / 2)); // eighth notes at the current tempo
    }
    if (scaleRun.current === id) setScalePlaying(false);
  };

  const progression = scale.progressions[progIdx] ?? scale.progressions[0];
  const progChords = useMemo(() => {
    if (!progression) return [];
    return progression.degrees.map((deg, i) => {
      const quality = progression.qualities[i];
      const name = `${spelled.names[deg]}${CHORD_SUFFIX[quality] ?? quality}`;
      const item = findChord(name);
      const pos = item?.positions[0];
      const guitarMidi = pos
        ? getChordStringNotes(pos.frets, pos.baseFret, item?.key).map((n) => n.midi).filter((m): m is number => m !== null)
        : [];
      return {
        name,
        numeral: progression.numerals[i],
        href: item?.href,
        position: pos,
        // real guitar voicing from the chord library; plain triad only if a shape is missing
        midi: guitarMidi.length ? guitarMidi : getChordMidiNotes((rootPc + scale.intervals[deg]) % 12, quality),
      };
    });
  }, [progression, spelled, rootPc, scale]);

  const stopProgression = useCallback(() => {
    stopProg.current?.();
    stopProg.current = null;
    setProgPlaying(false);
    setCurrentChord(null);
    setCurrentBeat(0);
  }, []);

  const toggleProgression = async () => {
    if (progPlaying) return stopProgression();
    if (!progChords.length) return;
    setProgPlaying(true);
    track("progression_play", { key: spelled.rootName, scale: scaleId, progression: progression?.name ?? "", bpm });
    const chords: ProgressionChord[] = progChords.map((c) => ({ midiNotes: c.midi, name: c.name }));
    stopProg.current = await playProgressionWithDrums(
      chords,
      bpm,
      (ci, beat) => {
        setCurrentChord(ci);
        setCurrentBeat(beat);
      },
      () => {
        setProgPlaying(false);
        setCurrentChord(null);
        setCurrentBeat(0);
      }
    );
  };

  // tempo changes apply live
  useEffect(() => {
    if (progPlaying) setProgressionBpm(bpm);
  }, [bpm, progPlaying]);

  // a different key, scale or progression restarts from silence
  useEffect(() => {
    stopProgression();
  }, [rootPc, scaleId, progIdx, stopProgression]);

  // leaving the tab or the page stops everything
  useEffect(
    () => () => {
      stopProg.current?.();
      stopProg.current = null;
      scaleRun.current++;
    },
    []
  );

  // ── Listening ──────────────────────────────────────────────────────────────
  const heard = listener.midi;
  const heardPc = heard !== null ? ((heard % 12) + 12) % 12 : null;
  const heardName = heardPc !== null ? spelled.nameForPc(heardPc) : undefined;
  const heardInScale = heardName !== undefined;
  const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const toggleListen = () => {
    if (listener.listening) listener.stop();
    else {
      track("scale_listen_start", { key: spelled.rootName, scale: scaleId });
      listener.start();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const rowH = "h-10 md:h-[46px]";
  const fretW = "w-[58px] md:w-[76px]";

  const renderCell = (stringNum: number, fret: number) => {
    const n = noteAt.get(`${stringNum}:${fret}`);
    const openMidi = GUITAR_STRINGS.find((s) => s.string === stringNum)!.openNote;
    const wrong = listener.listening && heard === openMidi + fret && !n;
    return (
      <div key={stringNum} className={`relative ${rowH}`}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-white/90" style={{ height: STRING_HEIGHTS[stringNum - 1] }} />
        {n && bandChord?.pcs.includes(n.midiNote % 12) && inWindow(fret) && (
          <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 md:h-[40px] md:w-[40px] rounded-full border-2 border-[#f5b942] shadow-[0_0_12px_rgba(245,185,66,0.55)] pointer-events-none transition-opacity" />
        )}
        {n && (
          <div className={`transition-opacity ${inWindow(fret) ? "opacity-100" : "opacity-20"}`}>
            <FretboardNote
              note={n}
              isNotePlaying={playingNote === n.midiNote}
              isDetected={heard === n.midiNote}
              showIntervals={showIntervals}
              onClick={handleNoteClick}
            />
          </div>
        )}
        {wrong && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 md:h-7 md:w-7 rounded-full bg-red-500/40 border-2 border-red-400 z-20 flex items-center justify-center">
            <span className="text-white font-Inter text-[9px] font-bold">{SHARP_NAMES[heardPc!]}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5 text-white">
      {/* ── Scale header ── */}
      <section className={`flex flex-col lg:flex-row lg:justify-between gap-4 ${compact ? "lg:items-center" : "lg:items-end"}`}>
        {compact ? (
          <div>
            <h2 className="font-Lora text-2xl">
              Solo with {spelled.rootName} <span className="text-[#1BD79E]">{scale.name}</span>
            </h2>
            <p className="font-Inter text-xs text-gray-400 mt-1 flex items-center gap-1.5 min-h-[16px]">
              {bandChord ? (
                <>
                  <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-[#f5b942]" aria-hidden />
                  <span>
                    Ringed notes belong to <b className="text-white font-semibold">{bandChord.name}</b>, the chord playing now. Land on them.
                  </span>
                </>
              ) : (
                "Start the jam and the notes of each chord light up as it plays."
              )}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-Lora text-3xl md:text-4xl">
              {spelled.rootName} <span className="text-[#1BD79E]">{scale.name}</span>
            </h2>
            <p className="font-Inter text-sm text-gray-400 mt-1">{scale.description}</p>
          </div>
        )}
        <ol className="flex flex-wrap gap-1 sm:gap-1.5" aria-label="Notes in this scale">
          {spelled.names.map((name, i) => (
            <li
              key={name + i}
              className={`min-w-[38px] sm:min-w-[44px] px-1.5 sm:px-2 py-1.5 rounded-xl text-center ${i === 0 ? "bg-[#1BD79E] text-black" : "bg-[#161616] text-white border border-white/5"}`}
            >
              <span className="block font-Lora text-base leading-none">{name}</span>
              <span className={`block font-Inter text-[10px] mt-1 ${i === 0 ? "text-black/60" : "text-gray-500"}`}>{spelled.degrees[i]}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Controls ── */}
      <section className="flex flex-wrap items-center gap-3" aria-label="Fretboard controls">
        <div className="flex rounded-full bg-[#161616] p-1" role="group" aria-label="Label notes by">
          {[{ label: "Notes", val: false }, { label: "Intervals", val: true }].map(({ label, val }) => (
            <button
              key={label}
              type="button"
              onClick={() => setShowIntervals(val)}
              aria-pressed={showIntervals === val}
              className={`h-8 px-3.5 rounded-full font-Inter text-sm transition-colors ${showIntervals === val ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Scale shapes">
          <label htmlFor="shape-system" className="sr-only">Shape system</label>
          <select
            id="shape-system"
            value={system}
            onChange={(e) => setSystem(e.target.value as PositionSystem)}
            title="How the neck is divided into shapes"
            className="shrink-0 h-8 rounded-full bg-[#161616] border border-white/10 pl-3 pr-7 font-Inter text-sm text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E] cursor-pointer"
          >
            <option value="positions">Positions</option>
            <option value="caged">CAGED</option>
          </select>
          {[null, ...positions.map((_, i) => i)].map((p) => {
            const active = position === p;
            return (
              <button
                key={p === null ? "all" : p}
                type="button"
                onClick={() => setPosition(p)}
                aria-pressed={active}
                title={
                  p === null
                    ? "Show every note"
                    : `${system === "caged" ? `${positions[p].label} shape` : `Position ${positions[p].label}`}, frets ${positions[p].from}–${positions[p].to}`
                }
                aria-label={p === null ? "All notes" : system === "caged" ? `${positions[p].label} shape` : `Position ${positions[p].label}`}
                className={`shrink-0 h-8 min-w-[32px] px-2.5 rounded-full font-Inter text-sm transition-colors ${active ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#161616] text-gray-300 hover:bg-[#222]"}`}
              >
                {p === null ? "All" : positions[p].label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={toggleScale}
            className={`h-10 px-4 rounded-full font-Inter text-sm font-semibold inline-flex items-center gap-2 transition-colors ${scalePlaying ? "bg-white text-black" : "bg-[#1BD79E] text-black hover:brightness-110"}`}
          >
            {scalePlaying ? "■ Stop" : "▶ Play scale"}
          </button>
          <button
            type="button"
            onClick={toggleListen}
            aria-pressed={listener.listening}
            className={`h-10 px-4 rounded-full font-Inter text-sm font-semibold inline-flex items-center gap-2 border transition-colors ${
              listener.listening ? "border-[#38DBE5] text-[#38DBE5] bg-[#38DBE5]/10" : "border-white/15 text-gray-200 hover:border-[#1BD79E]/60"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${listener.listening ? "bg-[#38DBE5] animate-pulse" : "bg-gray-500"}`} />
            {listener.listening ? "Listening" : "Listen to me play"}
          </button>
        </div>
      </section>

      {/* listening feedback */}
      {(listener.listening || listener.error) && (
        <p role="status" aria-live="polite" className="font-Inter text-sm -mt-2 h-5">
          {listener.error ? (
            <span className="text-[#f59e0b]">{LISTEN_ERROR_TEXT[listener.error]}</span>
          ) : heard === null ? (
            <span className="text-gray-400">Play any note — it lights up on the fretboard.</span>
          ) : heardInScale ? (
            <span className="text-[#1BD79E] font-semibold">✓ {heardName} is in {spelled.rootName} {scale.name}</span>
          ) : (
            <span className="text-red-400 font-semibold">✗ {SHARP_NAMES[heardPc!]} isn&rsquo;t in this scale</span>
          )}
        </p>
      )}

      {/* ── Fretboard ── */}
      <section className="rounded-2xl bg-black border border-white/5 py-4" aria-label={`${spelled.rootName} ${scale.name} on the fretboard`}>
        <div ref={scrollerRef} className="overflow-x-auto pr-3">
          <div className="flex" style={{ minWidth: "max-content" }}>
            {/* string names */}
            <div className="sticky left-0 z-30 bg-black pl-3 pr-1 shadow-[8px_0_8px_-4px_rgba(0,0,0,0.9)]">
              <div className="h-6" />
              {STRINGS.map((s) => (
                <div key={s} className={`${rowH} w-5 flex items-center justify-center font-Inter text-xs font-semibold text-[#1BD79E]`}>
                  {STRING_NAMES[s]}
                </div>
              ))}
            </div>

            {/* open strings + nut */}
            <div>
              <div className="h-6 flex items-center justify-center font-Inter text-[10px] uppercase tracking-wider text-gray-500 w-12">Open</div>
              <div className="w-12 border-r-[6px] border-[#e8e8e8]">{STRINGS.map((s) => renderCell(s, 0))}</div>
            </div>

            {/* frets */}
            {Array.from({ length: NUM_FRETS }, (_, i) => i + 1).map((fret) => (
              <div key={fret} ref={(el) => (fretRefs.current[fret] = el)}>
                <div className={`h-6 flex items-center justify-center font-Inter text-[11px] ${fretW} ${inWindow(fret) && win ? "text-[#1BD79E] font-semibold" : "text-gray-500"}`}>
                  {fret}
                </div>
                <div className={`relative ${fretW} border-r-[3px] border-[#3a3a3a] ${win && inWindow(fret) ? "bg-[#1BD79E]/[0.06]" : ""}`}>
                  {SINGLE_DOTS.includes(fret) && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[#444] pointer-events-none" />
                  )}
                  {DOUBLE_DOTS.includes(fret) && (
                    <>
                      <span className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[#444] pointer-events-none" />
                      <span className="absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[#444] pointer-events-none" />
                    </>
                  )}
                  {STRINGS.map((s) => renderCell(s, fret))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Progression ── */}
      {progression && !compact && (
        <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5" aria-labelledby="prog-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="prog-heading" className="font-Lora text-xl">Chords in {spelled.rootName} {scale.name}</h3>
              <p className="font-Inter text-sm text-gray-400 mt-0.5">Play the progression, then solo over it with the scale above.</p>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Progression">
              {scale.progressions.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setProgIdx(i)}
                  aria-pressed={i === progIdx}
                  className={`h-8 px-3 rounded-full font-Inter text-sm transition-colors ${i === progIdx ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#161616] text-gray-300 hover:bg-[#222]"}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {progChords.map((c, i) => {
              const active = currentChord === i;
              const card = (
                <div
                  className={`w-[104px] shrink-0 rounded-2xl p-2 pb-3 flex flex-col items-center border transition-all ${
                    active ? "border-[#1BD79E] bg-[#1BD79E]/10 scale-105" : "border-white/5 bg-[#161616] hover:border-white/15"
                  }`}
                >
                  {c.position && <ChordDiagram position={c.position} size={78} showFingers={false} title={`${c.name} chord shape`} />}
                  <span className={`font-Lora text-lg mt-1 ${active ? "text-[#1BD79E]" : "text-white"}`}>{c.name}</span>
                  <span className="font-Inter text-[11px] text-gray-500">{c.numeral}</span>
                </div>
              );
              return c.href ? (
                <Link key={i} href={c.href} title={`How to play ${c.name}`}>
                  {card}
                </Link>
              ) : (
                <div key={i}>{card}</div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={toggleProgression}
              className={`h-11 px-5 rounded-full font-Inter text-sm font-semibold transition-colors ${progPlaying ? "bg-white text-black" : "bg-[#1BD79E] text-black hover:brightness-110"}`}
            >
              {progPlaying ? "■ Stop" : "▶ Play with drums"}
            </button>
            <div className="flex items-center gap-2" aria-label="Tempo">
              <button
                type="button"
                onClick={() => setBpm((b) => Math.max(MIN_BPM, b - 5))}
                aria-label="Slower"
                className="h-9 w-9 rounded-full bg-[#161616] text-lg text-gray-200 hover:bg-[#222]"
              >
                −
              </button>
              <span className="font-Inter text-sm tabular-nums w-16 text-center">
                <span className="text-white font-semibold">{bpm}</span> <span className="text-gray-500">BPM</span>
              </span>
              <button
                type="button"
                onClick={() => setBpm((b) => Math.min(MAX_BPM, b + 5))}
                aria-label="Faster"
                className="h-9 w-9 rounded-full bg-[#161616] text-lg text-gray-200 hover:bg-[#222]"
              >
                +
              </button>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {[0, 1, 2, 3].map((b) => (
                <span key={b} className={`h-1.5 w-8 rounded-full transition-colors ${progPlaying && currentBeat === b ? "bg-[#1BD79E]" : "bg-[#262626]"}`} />
              ))}
            </div>
            {onOpenJam && (
              <button type="button" onClick={onOpenJam} className="ml-auto font-Inter text-sm font-semibold text-[#1BD79E] hover:underline underline-offset-4">
                Full backing track with bass →
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
