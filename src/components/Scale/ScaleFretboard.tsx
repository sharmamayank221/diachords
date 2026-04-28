import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  SCALES,
  ROOT_NOTES,
  GUITAR_STRINGS,
  getScaleNotesOnFretboard,
  getIntervalName,
  getScaleFormula,
  getProgressionChords,
  Scale,
  ChordProgression,
} from "@/data/scales";
import { initAudio, playNote, playChord, playProgressionWithDrums, ProgressionChord } from "@/utils/audioUtils";
import ChordTooltip from "./ChordTooltip";
import { usePitchDetection } from "@/hooks/usePitchDetection";

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
const FRETS = Array.from({ length: 13 }, (_, i) => i);

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

// ── Main Component ────────────────────────────────────────────────────────────

export default function ScaleFretboard() {
  const router = useRouter();

  const [selectedScale, setSelectedScale] = useState<string>("major");
  const [selectedRoot, setSelectedRoot]   = useState<number>(0);
  const [scaleNotes, setScaleNotes]       = useState<ScaleNote[]>([]);
  const [playingNote, setPlayingNote]     = useState<number | null>(null);
  const [showIntervals, setShowIntervals] = useState<boolean>(false);
  const [isPlaying, setIsPlaying]         = useState<boolean>(false);
  const [selectedProgression, setSelectedProgression] = useState<number>(0);
  const [isPlayingProgression, setIsPlayingProgression] = useState<boolean>(false);
  const [currentChordIndex, setCurrentChordIndex]   = useState<number | null>(null);
  const [currentBeat, setCurrentBeat]     = useState<number>(0);
  const [bpm, setBpm]                     = useState<number>(90);
  const [loopCount, setLoopCount]         = useState<number>(1);
  const [stopProgression, setStopProgression] = useState<(() => void) | null>(null);

  // Apply ?scale= and ?root= URL params on mount / navigation
  useEffect(() => {
    if (!router.isReady) return;
    const scaleParam = router.query.scale as string | undefined;
    const rootParam  = router.query.root  as string | undefined;
    if (scaleParam && SCALES[scaleParam]) setSelectedScale(scaleParam);
    if (rootParam) {
      const rootIdx = parseInt(rootParam, 10);
      if (!isNaN(rootIdx) && rootIdx >= 0 && rootIdx < ROOT_NOTES.length) setSelectedRoot(rootIdx);
    }
  }, [router.isReady, router.query.scale, router.query.root]);

  const { isListening, startListening, stopListening, detectedMidi, detectedNote } = usePitchDetection();

  const scale             = SCALES[selectedScale];
  const rootNote          = ROOT_NOTES[selectedRoot];
  const currentProg       = scale.progressions[selectedProgression] || scale.progressions[0];
  const progressionChords = currentProg ? getProgressionChords(selectedRoot, scale, currentProg) : [];

  useEffect(() => { initAudio(); }, []);
  useEffect(() => {
    setScaleNotes(getScaleNotesOnFretboard(selectedRoot, scale, 12));
  }, [selectedScale, selectedRoot, scale]);

  const handleNoteClick = (note: ScaleNote) => {
    setPlayingNote(note.midiNote);
    playNote(note.midiNote);
    setTimeout(() => setPlayingNote(null), 500);
  };

  const playScaleAscending = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    const rootNotes = scaleNotes.filter(n => n.isRoot);
    if (!rootNotes.length) { setIsPlaying(false); return; }
    const lowestRoot = rootNotes.reduce((l, c) => c.midiNote < l.midiNote ? c : l, rootNotes[0]);
    const octaveMidi = lowestRoot.midiNote + 12;
    const unique: ScaleNote[] = [];
    const seen = new Set<number>();
    for (const n of scaleNotes
      .filter(n => n.midiNote >= lowestRoot.midiNote && n.midiNote <= octaveMidi)
      .sort((a, b) => a.midiNote - b.midiNote)) {
      if (!seen.has(n.midiNote)) { seen.add(n.midiNote); unique.push(n); }
    }
    for (const n of unique) {
      setPlayingNote(n.midiNote);
      playNote(n.midiNote);
      await new Promise(r => setTimeout(r, 350));
    }
    setPlayingNote(null);
    setIsPlaying(false);
  };

  const playProgression = async () => {
    if (stopProgression) {
      stopProgression();
      setStopProgression(null); setIsPlayingProgression(false);
      setCurrentChordIndex(null); setCurrentBeat(0); setLoopCount(1);
      return;
    }
    if (!progressionChords.length) return;
    setIsPlayingProgression(true); setCurrentBeat(0); setLoopCount(1);
    const chordsForPlayer: ProgressionChord[] = progressionChords.map(c => ({ midiNotes: c.midiNotes, name: c.chord }));
    const stop = await playProgressionWithDrums(
      chordsForPlayer, bpm,
      (ci, beat, loop) => { setCurrentChordIndex(ci); setCurrentBeat(beat); setLoopCount(loop); },
      () => {
        setIsPlayingProgression(false); setCurrentChordIndex(null);
        setCurrentBeat(0); setLoopCount(1); setStopProgression(null);
      }
    );
    setStopProgression(() => stop);
  };

  const getNoteAtPosition = (s: number, f: number) => scaleNotes.find(n => n.string === s && n.fret === f);
  const hasFretMarker   = (f: number) => [3,5,7,9].includes(f);
  const hasDoubleMark   = (f: number) => f === 12;
  const detectedInScale = detectedNote && scaleNotes.some(n => n.note === detectedNote);

  // ─────────────────────────────────────────────────────────────────────────
  // THE FRETBOARD
  // ─────────────────────────────────────────────────────────────────────────
  const STRING_NAMES = ["E", "B", "G", "D", "A", "E"]; // strings 1–6
  const FRET_COLS    = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12

  const Fretboard = (
    <div className="overflow-x-auto w-full">
      <div className="flex" style={{ minWidth: "max-content" }}>

        {/* ── String name labels (left gutter) ── */}
        <div className="flex flex-col">
          {/* header spacer aligns with fret number row */}
          <div className="h-8" />
          {/* nut spacer */}
          <div className="h-[199px] md:h-[279px] flex flex-col justify-around pb-1">
            {STRING_NAMES.map((name, i) => (
              <span key={i}
                className="flex items-center justify-center w-6 font-Lora font-bold text-[11px] md:text-[13px]"
                style={{ color: "#1BD79E" }}>
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* ── Open-string zone (O / empty) — before the nut ── */}
        <div className="flex flex-col items-center mr-1">
          <div className="h-8 flex items-end pb-1">
            <span className="font-Inter text-[11px] text-gray-500 uppercase tracking-wider w-10 text-center">Open</span>
          </div>
          <div className="h-[199px] md:h-[279px] w-10 relative flex flex-col justify-around py-1">
            {[1,2,3,4,5,6].map(stringNum => {
              const openNote = getNoteAtPosition(stringNum, 0);
              const isDetected = openNote && detectedMidi === openNote.midiNote;
              return (
                <div key={stringNum} className="flex items-center justify-center">
                  {openNote ? (
                    <button
                      onClick={() => handleNoteClick(openNote)}
                      className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      style={{
                        background: openNote.isRoot ? "#1BD79E" : "transparent",
                        border: `2px solid ${openNote.isRoot ? "#1BD79E" : "#1BD79E"}`,
                        boxShadow: playingNote === openNote.midiNote ? "0 0 14px #1BD79E" : isDetected ? "0 0 14px #38DBE5" : "none",
                      }}>
                      <span className={`font-Lora text-[9px] font-bold leading-none ${openNote.isRoot ? "text-black" : "text-[#1BD79E]"}`}>
                        {showIntervals ? getIntervalName(openNote.interval) : "O"}
                      </span>
                    </button>
                  ) : (
                    <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-Lora font-bold text-[12px] text-gray-600">·</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── NUT — thick vertical divider ── */}
        <div className="flex flex-col">
          <div className="h-8" />
          <div className="h-[199px] md:h-[279px] w-[6px] md:w-[8px] rounded-sm" style={{ background: "#e8e8e8" }} />
        </div>

        {/* ── Fret columns 1–12 ── */}
        {FRET_COLS.map(fretNum => (
          <div key={fretNum} className="flex flex-col items-center">
            {/* Fret number label */}
            <div className="h-8 flex items-end pb-1">
              <span className="font-Inter text-[11px] text-gray-500 w-[80px] md:w-[96px] text-center">
                {fretNum}
              </span>
            </div>
            {/* Fret column */}
            <div className="h-[199px] md:h-[279px] w-[80px] md:w-[96px] relative border-r-4 border-r-[#333] border-collapse">
              {[1,2,3,4,5,6].map(stringNum => {
                const note         = getNoteAtPosition(stringNum, fretNum);
                const openMidi     = GUITAR_STRINGS.find(s => s.string === stringNum)?.openNote || 0;
                const isWrongNote  = detectedMidi === openMidi + fretNum && !note && isListening;
                return (
                  <div key={stringNum}
                    className="w-full mb-9 md:mb-[52px] relative"
                    style={{ background:"#FFF", height: STRING_HEIGHTS[stringNum - 1] }}>
                    {isWrongNote && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 md:h-7 md:w-7 rounded-full bg-red-500/40 border-2 border-red-400 animate-pulse z-20 flex items-center justify-center"
                        style={{ boxShadow:"0 0 16px red" }}>
                        <span className="text-white font-Lora text-[9px] font-bold">{detectedNote}</span>
                      </div>
                    )}
                    {note && (
                      <FretboardNote
                        note={note}
                        isNotePlaying={playingNote === note.midiNote}
                        isDetected={detectedMidi === note.midiNote}
                        showIntervals={showIntervals}
                        onClick={handleNoteClick}
                      />
                    )}
                  </div>
                );
              })}
              {/* Position markers (dots) */}
              {hasFretMarker(fretNum) && (
                <div className="w-2.5 h-2.5 bg-[#444] rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              )}
              {hasDoubleMark(fretNum) && (
                <>
                  <div className="w-2.5 h-2.5 bg-[#444] rounded-full absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="w-2.5 h-2.5 bg-[#444] rounded-full absolute left-1/2 top-[65%] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </>
              )}
            </div>
          </div>
        ))}

      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  const MobileView = (
    <div className="max-w-[430px] mx-auto px-4 py-5 flex flex-col gap-4">
        {/* Selectors */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-[1.2px] block mb-1">Root</label>
            <select value={selectedRoot} onChange={e => setSelectedRoot(Number(e.target.value))}
              className="w-full bg-[#131313] border border-white/5 rounded-xl px-4 py-3 font-Space-Grotesk font-bold text-white text-[15px] focus:outline-none appearance-none">
              {ROOT_NOTES.map((r, idx) => <option key={r.name} value={idx}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex-[2]">
            <label className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-[1.2px] block mb-1">Scale</label>
            <select value={selectedScale} onChange={e => setSelectedScale(e.target.value)}
              className="w-full bg-[#131313] border border-white/5 rounded-xl px-4 py-3 font-Space-Grotesk font-bold text-white text-[15px] focus:outline-none appearance-none">
              {Object.entries(SCALES).map(([key, s]) => <option key={key} value={key}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Display toggle */}
        <div className="flex gap-1 bg-[#131313] rounded-full p-1">
          {[{label:"Notes",val:false},{label:"Intervals",val:true}].map(({label,val}) => (
            <button key={label} onClick={() => setShowIntervals(val)}
              className="flex-1 py-2.5 rounded-full font-Space-Grotesk font-bold text-[13px] transition-all"
              style={{ background: showIntervals === val ? "#1a1a1a" : "transparent", color: showIntervals === val ? "white" : "#71717a" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={playScaleAscending} disabled={isPlaying}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-Space-Grotesk font-bold text-[13px]"
            style={{ background: isPlaying ? "rgba(27,215,158,0.1)" : "#1BD79E", color: isPlaying ? "#1BD79E" : "black" }}>
            {isPlaying ? <><span className="w-2 h-2 rounded-full bg-[#1BD79E] animate-ping"/>Playing…</> : <>▶ Play Scale</>}
          </button>
          <button onClick={isListening ? stopListening : startListening}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-Space-Grotesk font-bold text-[13px] border"
            style={{ background: isListening ? "rgba(239,68,68,0.1)" : "transparent", color: isListening ? "#ef4444" : "#1BD79E", borderColor: isListening ? "rgba(239,68,68,0.4)" : "rgba(27,215,158,0.4)" }}>
            {isListening ? <>● Stop</> : <>🎤 Practice</>}
          </button>
        </div>

        {/* Detected badge */}
        {isListening && detectedNote && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full self-start border font-Space-Grotesk font-bold text-[13px] ${detectedInScale ? "bg-[rgba(27,215,158,0.1)] text-[#1BD79E] border-[#1BD79E]/40" : "bg-[rgba(239,68,68,0.1)] text-red-400 border-red-500/40"}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${detectedInScale ? "bg-[#1BD79E]" : "bg-red-400"}`} />
            {detectedNote} — {detectedInScale ? "In scale ✓" : "Not in scale"}
          </div>
        )}

        {/* Fretboard */}
        <div className="bg-black rounded-2xl p-4">{Fretboard}</div>

        {/* Scale info */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-Inter text-[10px] text-gray-500 uppercase tracking-[1.5px]">CURRENT SCALE</p>
              <h3 className="font-Lora text-[#1BD79E] text-xl font-bold mt-0.5">{rootNote.name.split("/")[0]} {scale.name}</h3>
            </div>
            <span className="font-Lora text-gray-500 text-xs">{scale.description?.slice(0, 30)}…</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {getScaleFormula(scale).map((degree, idx) => {
              const isRoot = degree === "1";
              const isMaj = ["1","2","3","4","5","6","7"].includes(degree);
              return (
                <span key={idx} className="px-2 py-1 rounded-md font-Lora text-xs font-semibold"
                  style={{ background: isRoot ? "#1BD79E" : isMaj ? "#2a2a2a" : "rgba(239,68,68,0.12)", color: isRoot ? "black" : isMaj ? "white" : "#ef4444" }}>
                  {degree}
                </span>
              );
            })}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {scale.intervals.map((interval, idx) => {
              const n = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][(selectedRoot + interval) % 12];
              return (
                <span key={idx} className={`px-3 py-1.5 rounded-xl font-Lora text-sm font-bold ${interval === 0 ? "bg-[#1BD79E] text-black" : "bg-[#1a1a1a] text-white border border-[#333]"}`}>
                  {n}
                </span>
              );
            })}
          </div>
        </div>

        {/* Chord progressions */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-Lora text-white text-lg">Chord Progressions</h3>
            <div className="flex gap-1">
              {scale.progressions.map((prog, idx) => (
                <button key={idx} onClick={() => setSelectedProgression(idx)}
                  className={`px-2 py-1 rounded-full font-Lora text-xs transition-all ${selectedProgression === idx ? "bg-[#1BD79E] text-black" : "bg-[#2a2a2a] text-gray-400"}`}>
                  {prog.name}
                </button>
              ))}
            </div>
          </div>
          {currentProg && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={playProgression}
                  className={`px-3 py-1.5 rounded-full font-Lora font-semibold text-xs flex items-center gap-2 ${isPlayingProgression ? "bg-red-500 text-white" : "bg-[#38DBE5] text-black"}`}>
                  {isPlayingProgression ? <>■ Stop</> : <>▶ Play</>}
                </button>
                <div className="flex items-center gap-1 bg-[#2a2a2a] rounded-full px-3 py-1.5">
                  <button onClick={() => setBpm(b => Math.max(60, b - 5))} disabled={isPlayingProgression} className="text-gray-400 font-bold w-4">−</button>
                  <span className="font-Lora text-white text-sm min-w-[28px] text-center">{bpm}</span>
                  <button onClick={() => setBpm(b => Math.min(160, b + 5))} disabled={isPlayingProgression} className="text-gray-400 font-bold w-4">+</button>
                  <span className="text-gray-600 text-xs ml-1">BPM</span>
                </div>
                {isPlayingProgression && (
                  <div className="flex gap-1">
                    {[0,1,2,3].map(b => (
                      <div key={b} className="w-2 h-2 rounded-full transition-all"
                        style={{ background: currentBeat === b ? "#1BD79E" : "#333", transform: currentBeat === b ? "scale(1.4)" : "scale(1)" }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {progressionChords.map((c, idx) => (
                  <ChordTooltip key={idx} chordName={c.chord} searchId={c.searchId} isHighlighted={currentChordIndex === idx}>
                    <Link href={`/chords/${c.searchId}`}>
                      <span className="inline-block px-3 py-2 rounded-xl font-Lora font-bold text-sm transition-all"
                        style={{ background: currentChordIndex === idx ? "#1BD79E" : "#2a2a2a", color: currentChordIndex === idx ? "black" : "white", border: currentChordIndex === idx ? "none" : "1px solid #333" }}>
                        {c.chord}
                      </span>
                    </Link>
                  </ChordTooltip>
                ))}
              </div>
            </>
          )}
        </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP VIEW — Figma practice frame bento layout
  // ─────────────────────────────────────────────────────────────────────────

  const DesktopView = (
    <div className="h-full flex flex-col px-8 pt-5 pb-4 gap-4 overflow-hidden">

      {/* ── Session header ── */}
      <div className="flex items-center gap-8 flex-shrink-0">
        <div className="flex-1">
          <p className="font-Inter text-[11px] text-gray-500 tracking-[2.5px] uppercase mb-1">CURRENT SESSION</p>
          <h2 className="font-Space-Grotesk font-bold text-[40px] leading-none tracking-[-2px] text-white">
            {rootNote.name.split("/")[0]} <span className="text-[#1BD79E]">{scale.name}</span>
          </h2>
          <p className="font-Manrope text-gray-500 text-[13px] mt-1">{scale.description}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={playScaleAscending} disabled={isPlaying}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-Space-Grotesk font-bold text-[13px] transition-all"
            style={{ background: isPlaying ? "rgba(27,215,158,0.1)" : "#1BD79E", color: isPlaying ? "#1BD79E" : "black" }}>
            {isPlaying ? <><span className="w-2 h-2 rounded-full bg-[#1BD79E] animate-ping"/>Playing…</> : <>▶ Play Scale</>}
          </button>
          <button onClick={isListening ? stopListening : startListening}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-Space-Grotesk font-bold text-[13px] border transition-all"
            style={{ background: isListening ? "rgba(239,68,68,0.1)" : "transparent", color: isListening ? "#ef4444" : "#1BD79E", borderColor: isListening ? "rgba(239,68,68,0.4)" : "rgba(27,215,158,0.4)" }}>
            {isListening ? <><span className="w-2 h-2 rounded-full bg-red-400 animate-ping"/>Stop Practice</> : <>🎤 Start Practice</>}
          </button>
        </div>
      </div>

      {/* ── Controls row ── */}
      <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-xl px-3 py-2">
          <span className="font-Inter text-[10px] text-gray-500 uppercase tracking-wider">Root</span>
          <select value={selectedRoot} onChange={e => setSelectedRoot(Number(e.target.value))}
            className="bg-transparent font-Space-Grotesk font-bold text-white text-[14px] focus:outline-none appearance-none cursor-pointer pr-2">
            {ROOT_NOTES.map((r, idx) => <option key={r.name} value={idx}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-xl px-3 py-2">
          <span className="font-Inter text-[10px] text-gray-500 uppercase tracking-wider">Scale</span>
          <select value={selectedScale} onChange={e => setSelectedScale(e.target.value)}
            className="bg-transparent font-Space-Grotesk font-bold text-white text-[14px] focus:outline-none appearance-none cursor-pointer pr-2">
            {Object.entries(SCALES).map(([key, s]) => <option key={key} value={key}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1">
          {[{label:"Notes",val:false},{label:"Intervals",val:true}].map(({label,val}) => (
            <button key={label} onClick={() => setShowIntervals(val)}
              className="px-3 py-1.5 rounded-lg font-Space-Grotesk font-bold text-[12px] transition-all"
              style={{ background: showIntervals === val ? "#1a1a1a" : "transparent", color: showIntervals === val ? "white" : "#52525b" }}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap ml-auto">
          {getScaleFormula(scale).map((degree, idx) => {
            const isRoot = degree === "1";
            const isMaj = ["1","2","3","4","5","6","7"].includes(degree);
            return (
              <span key={idx} className="px-2 py-0.5 rounded-md font-Lora text-xs font-semibold"
                style={{ background: isRoot ? "#1BD79E" : isMaj ? "#1a1a1a" : "rgba(239,68,68,0.12)", color: isRoot ? "black" : isMaj ? "white" : "#ef4444", border: isRoot ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                {degree}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── FRETBOARD — grows to fill remaining height ── */}
      <div className="flex-1 min-h-0 bg-black rounded-2xl p-5 flex items-center overflow-hidden">
        {Fretboard}
      </div>

      {/* ── Bottom bento grid — fixed height, never compresses fretboard ── */}
      <div className="grid grid-cols-12 gap-4 flex-shrink-0">

        {/* Chord Progression — 7 cols */}
        <div className="col-span-7 bg-[#111] border border-[#222] rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-full opacity-5 pointer-events-none"
            style={{ background:"linear-gradient(135deg, #1BD79E 0%, transparent 70%)" }}/>

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="font-Inter text-[10px] text-gray-500 uppercase tracking-[2px]">CHORD PROGRESSION</p>
              <h3 className="font-Space-Grotesk font-bold text-white text-[18px] mt-0.5">{currentProg?.name || ""}</h3>
            </div>
            <div className="flex gap-1.5">
              {scale.progressions.map((prog, idx) => (
                <button key={idx} onClick={() => setSelectedProgression(idx)}
                  className="px-3 py-1 rounded-full font-Inter text-[12px] transition-all"
                  style={{ background: selectedProgression === idx ? "#1BD79E" : "#1a1a1a", color: selectedProgression === idx ? "black" : "#52525b", border: selectedProgression === idx ? "none" : "1px solid #2a2a2a" }}>
                  {prog.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 overflow-x-auto pb-1">
            {progressionChords.map((c, idx) => (
              <React.Fragment key={idx}>
                <ChordTooltip chordName={c.chord} searchId={c.searchId} isHighlighted={currentChordIndex === idx}>
                  <Link href={`/chords/${c.searchId}`}>
                    <div className="flex flex-col items-center gap-1.5 cursor-pointer">
                      <div className="w-14 h-16 rounded-2xl flex items-center justify-center transition-all"
                        style={{
                          background: currentChordIndex === idx ? "linear-gradient(135deg,#1BD79E 0%,#15c48e 100%)" : "#1a1a1a",
                          boxShadow: currentChordIndex === idx ? "0 0 20px rgba(27,215,158,0.4)" : "none",
                          border: currentChordIndex === idx ? "none" : "1px solid #2a2a2a",
                          transform: currentChordIndex === idx ? "scale(1.08)" : "scale(1)",
                        }}>
                        <span className={`font-Space-Grotesk font-bold text-[20px] ${currentChordIndex === idx ? "text-black" : "text-white"}`}>{c.chord}</span>
                      </div>
                      <span className={`font-Inter text-[10px] uppercase tracking-wider ${currentChordIndex === idx ? "text-[#1BD79E]" : "text-gray-600"}`}>{currentProg?.numerals[idx]}</span>
                    </div>
                  </Link>
                </ChordTooltip>
                {idx < progressionChords.length - 1 && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button onClick={playProgression}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-Space-Grotesk font-bold text-[12px] transition-all"
              style={{ background: isPlayingProgression ? "rgba(239,68,68,0.12)" : "#38DBE5", color: isPlayingProgression ? "#ef4444" : "black", border: isPlayingProgression ? "1px solid rgba(239,68,68,0.3)" : "none" }}>
              {isPlayingProgression ? <>■ Stop</> : <>▶ Play</>}
            </button>
            <div className="flex gap-2">
              {[0,1,2,3].map(b => (
                <div key={b} className="h-1 w-10 rounded-full transition-all"
                  style={{ background: isPlayingProgression && currentBeat === b ? "#1BD79E" : "#1a1a1a", boxShadow: isPlayingProgression && currentBeat === b ? "0 0 8px rgba(27,215,158,0.6)" : "none" }}/>
              ))}
            </div>
            {isPlayingProgression && <span className="font-Inter text-[11px] text-gray-500">Loop {loopCount}</span>}
          </div>
        </div>

        {/* Metronome — 3 cols */}
        <div className="col-span-3 bg-[#111] border border-[#222] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <p className="font-Inter text-[10px] text-gray-500 uppercase tracking-[2px]">TEMPO</p>
            <p className="font-Manrope text-gray-600 text-[12px] mt-0.5">{bpm} beats per min</p>
          </div>
          <div className="flex items-end gap-1 justify-center my-2">
            <span className="font-Space-Grotesk font-bold text-white leading-none" style={{ fontSize: 56 }}>{bpm}</span>
            <span className="font-Inter text-[14px] text-gray-500 mb-1">BPM</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setBpm(b => Math.max(60, b - 5))} disabled={isPlayingProgression}
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white disabled:opacity-40 transition-all">
              −
            </button>
            <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full bg-[#1BD79E] rounded-full transition-all"
                style={{ width: `${((bpm - 60) / 100) * 100}%` }}/>
            </div>
            <button onClick={() => setBpm(b => Math.min(160, b + 5))} disabled={isPlayingProgression}
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-[#1BD79E] text-black hover:bg-[#15c48e] disabled:opacity-40 transition-all">
              +
            </button>
          </div>
        </div>

        {/* Settings — 2 cols */}
        <div className="col-span-2 bg-[#111] border border-[#222] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <p className="font-Inter text-[10px] text-gray-500 uppercase tracking-[2px] mb-3">SETTINGS</p>
            <div className="flex flex-col gap-0 border border-[#1a1a1a] rounded-xl overflow-hidden">
              {[
                { label:"Key",   val: rootNote.name.split("/")[0] },
                { label:"Scale", val: scale.name.split(" ")[0] },
                { label:"Tempo", val: `${bpm}` },
              ].map(({ label, val }, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${i < 2 ? "border-b border-[#1a1a1a]" : ""}`}>
                  <span className="font-Manrope text-[11px] text-gray-500">{label}</span>
                  <span className="font-Space-Grotesk font-bold text-[12px] text-white">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={isListening ? stopListening : startListening}
            className="w-full py-3 rounded-2xl font-Space-Grotesk font-bold text-[13px] transition-all mt-3 relative overflow-hidden"
            style={{
              background: isListening ? "rgba(239,68,68,0.12)" : "linear-gradient(135deg,#1BD79E 0%,#15c48e 100%)",
              color: isListening ? "#ef4444" : "black",
              border: isListening ? "1px solid rgba(239,68,68,0.3)" : "none",
            }}>
            {isListening ? (
              <><span className="w-2 h-2 rounded-full bg-red-400 animate-ping absolute left-4 top-1/2 -translate-y-1/2"/>Stop</>
            ) : "Start Practice"}
          </button>
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
