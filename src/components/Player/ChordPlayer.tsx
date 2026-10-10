import React, { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { initAudio, playNote } from "@/utils/audioUtils";
import type { ChordStringNote } from "@/helpers/chordNotes";

const STRUM_GAP_MS = 35;
const ARPEGGIO_GAP_MS = 260;
const HIGHLIGHT_MS = 450;

interface ChordPlayerProps {
  chordName: string;
  variation: number;
  totalVariations: number;
  notes: ChordStringNote[]; // string 6 → 1
  playingStrings: number[];
  onPlayingStringsChange: (strings: number[]) => void;
  // lets the fretboard dots play through the same note + highlight path
  playStringRef?: React.MutableRefObject<((stringNum: number) => void) | null>;
}

export default function ChordPlayer({
  chordName,
  variation,
  totalVariations,
  notes,
  playingStrings,
  onPlayingStringsChange,
  playStringRef,
}: ChordPlayerProps) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = useRef<Set<number>>(new Set());

  useEffect(() => {
    initAudio();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const flash = useCallback(
    (stringNumber: number) => {
      active.current.add(stringNumber);
      onPlayingStringsChange(Array.from(active.current));
      timers.current.push(
        setTimeout(() => {
          active.current.delete(stringNumber);
          onPlayingStringsChange(Array.from(active.current));
        }, HIGHLIGHT_MS)
      );
    },
    [onPlayingStringsChange]
  );

  const playString = useCallback(
    (note: ChordStringNote) => {
      if (note.midi === null) return;
      playNote(note.midi);
      flash(note.stringNumber);
    },
    [flash]
  );

  useEffect(() => {
    if (!playStringRef) return;
    playStringRef.current = (stringNum: number) => {
      const note = notes.find((n) => n.stringNumber === stringNum);
      if (note) playString(note);
    };
    return () => {
      playStringRef.current = null;
    };
  }, [notes, playString, playStringRef]);

  const playSequence = useCallback(
    (gap: number) => {
      // replaying cancels whatever is still scheduled, so the button never locks
      timers.current.forEach(clearTimeout);
      timers.current = [];
      active.current.clear();
      track("chord_play", { chord: chordName, mode: gap === STRUM_GAP_MS ? "strum" : "arpeggio" });
      notes
        .filter((n) => n.midi !== null)
        .forEach((note, i) => {
          timers.current.push(setTimeout(() => playString(note), i * gap));
        });
    },
    [notes, playString, chordName]
  );

  // Space = strum, 1–6 = individual strings
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.code === "Space") {
        e.preventDefault();
        playSequence(STRUM_GAP_MS);
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= 6) {
        const note = notes.find((n) => n.stringNumber === num);
        if (note) playString(note);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notes, playSequence, playString]);

  return (
    <section
      aria-label={`Play ${chordName}`}
      className="w-full max-w-[860px] mx-auto px-4 md:px-0"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 border-t border-[#2D2D2D] pt-6">
        {/* Primary actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => playSequence(STRUM_GAP_MS)}
            aria-label={`Strum ${chordName}`}
            className="group h-16 w-16 shrink-0 rounded-full bg-[#1BD79E] text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 ml-1" fill="currentColor" aria-hidden>
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
            </svg>
          </button>
          <div className="flex flex-col">
            <span className="font-Lora text-white text-2xl leading-tight">{chordName}</span>
            <span className="font-Inter text-xs text-gray-500 uppercase tracking-wider">
              Shape {variation} of {totalVariations}
            </span>
            <button
              onClick={() => playSequence(ARPEGGIO_GAP_MS)}
              className="mt-2 self-start font-Inter text-xs font-semibold text-[#1BD79E] border border-[#1BD79E]/50 rounded-full px-3 py-1 hover:bg-[#1BD79E]/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            >
              Arpeggio
            </button>
          </div>
        </div>

        {/* String chips, low E on the left like the fretboard reads */}
        <div className="flex-1">
          <div className="grid grid-cols-6 gap-2">
            {notes.map((note) => {
              const muted = note.midi === null;
              const isPlaying = playingStrings.includes(note.stringNumber);
              return (
                <button
                  key={note.stringNumber}
                  onClick={() => playString(note)}
                  disabled={muted}
                  aria-label={
                    muted
                      ? `String ${note.stringNumber} muted`
                      : `Play ${note.name}${note.octave} on string ${note.stringNumber}`
                  }
                  className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                    muted
                      ? "border border-dashed border-[#333] text-gray-600 cursor-not-allowed"
                      : note.isRoot
                      ? "bg-[#1BD79E] text-black hover:brightness-110"
                      : "border-2 border-[#1BD79E] text-white hover:bg-[#1BD79E]/10"
                  } ${isPlaying ? "scale-110 shadow-[0_0_18px_#1BD79E]" : ""}`}
                >
                  <span className="font-Lora font-bold text-base leading-none">
                    {muted ? "✕" : note.name}
                  </span>
                  <span
                    className={`font-Inter text-[10px] mt-1 ${
                      note.isRoot && !muted ? "text-black/70" : "text-gray-500"
                    }`}
                  >
                    {muted ? "mute" : `fret ${note.fret}`}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-2 mt-1.5">
            {notes.map((note) => (
              <span key={note.stringNumber} className="text-center font-Inter text-[10px] text-gray-600">
                {note.stringNumber}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="hidden md:block mt-4 font-Inter text-[11px] text-gray-600">
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-400">Space</kbd> strum ·{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-400">1</kbd>–
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-400">6</kbd> play a string · tap any dot on the fretboard ·{" "}
        <Link href="/tuner" className="text-gray-400 hover:text-[#1BD79E] underline-offset-2 hover:underline">
          Sounds off? Tune up first
        </Link>
      </p>
    </section>
  );
}
