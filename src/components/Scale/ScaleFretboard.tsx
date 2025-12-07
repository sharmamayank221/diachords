import React, { useState, useEffect } from "react";
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
import Link from "next/link";
import { initAudio, playNote, playChord, playProgressionWithDrums, ProgressionChord } from "@/utils/audioUtils";

interface ScaleNote {
  string: number;
  fret: number;
  note: string;
  midiNote: number;
  isRoot: boolean;
  interval: number;
  color: string;
}

// String thickness (similar to chord fretboard)
const STRING_HEIGHTS = ["1px", "2px", "3px", "3.5px", "4px", "5px"];

export default function ScaleFretboard() {
  const [selectedScale, setSelectedScale] = useState<string>("pentatonic_minor");
  const [selectedRoot, setSelectedRoot] = useState<number>(0); // C
  const [scaleNotes, setScaleNotes] = useState<ScaleNote[]>([]);
  const [playingNote, setPlayingNote] = useState<number | null>(null);
  const [showIntervals, setShowIntervals] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedProgression, setSelectedProgression] = useState<number>(0);
  const [isPlayingProgression, setIsPlayingProgression] = useState<boolean>(false);
  const [currentChordIndex, setCurrentChordIndex] = useState<number | null>(null);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(90);
  const [loopCount, setLoopCount] = useState<number>(1);
  const [stopProgression, setStopProgression] = useState<(() => void) | null>(null);

  const FRETS = Array.from({ length: 13 }, (_, i) => i); // 0-12 frets
  const scale = SCALES[selectedScale];
  const rootNote = ROOT_NOTES[selectedRoot];
  
  // Get current progression and its chords
  const currentProgression = scale.progressions[selectedProgression] || scale.progressions[0];
  const progressionChords = currentProgression 
    ? getProgressionChords(selectedRoot, scale, currentProgression)
    : [];

  // Initialize audio
  useEffect(() => {
    initAudio();
  }, []);

  // Update scale notes when selection changes
  useEffect(() => {
    const notes = getScaleNotesOnFretboard(selectedRoot, scale, 12);
    setScaleNotes(notes);
  }, [selectedScale, selectedRoot, scale]);

  // Play a single note
  const handleNoteClick = (note: ScaleNote) => {
    setPlayingNote(note.midiNote);
    playNote(note.midiNote);
    setTimeout(() => setPlayingNote(null), 500);
  };

  // Play the scale ascending from root to octave
  const playScaleAscending = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    // Find the lowest root note on the fretboard
    const rootNotes = scaleNotes.filter((n) => n.isRoot);
    const lowestRoot = rootNotes.reduce((lowest, current) => 
      current.midiNote < lowest.midiNote ? current : lowest
    , rootNotes[0]);

    if (!lowestRoot) {
      setIsPlaying(false);
      return;
    }

    // Get all scale notes from root to octave (root + 12 semitones)
    const octaveMidi = lowestRoot.midiNote + 12;
    
    // Get unique MIDI notes in the scale between root and octave
    const notesInRange = scaleNotes
      .filter((n) => n.midiNote >= lowestRoot.midiNote && n.midiNote <= octaveMidi)
      .sort((a, b) => a.midiNote - b.midiNote);

    // Remove duplicates (same MIDI note on different strings)
    const uniqueNotes: ScaleNote[] = [];
    const seenMidi = new Set<number>();
    for (const note of notesInRange) {
      if (!seenMidi.has(note.midiNote)) {
        seenMidi.add(note.midiNote);
        uniqueNotes.push(note);
      }
    }

    // Play each note
    for (let i = 0; i < uniqueNotes.length; i++) {
      const note = uniqueNotes[i];
      setPlayingNote(note.midiNote);
      playNote(note.midiNote);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    setPlayingNote(null);
    setIsPlaying(false);
  };

  // Play the chord progression with drums in 4/4 time
  const playProgression = async () => {
    // If already playing, stop it
    if (stopProgression) {
      stopProgression();
      setStopProgression(null);
      setIsPlayingProgression(false);
      setCurrentChordIndex(null);
      setCurrentBeat(0);
      setLoopCount(1);
      return;
    }
    
    if (progressionChords.length === 0) return;
    
    setIsPlayingProgression(true);
    setCurrentBeat(0);
    setLoopCount(1);

    // Convert to the format expected by playProgressionWithDrums
    const chordsForPlayer: ProgressionChord[] = progressionChords.map(c => ({
      midiNotes: c.midiNotes,
      name: c.chord
    }));

    const stop = await playProgressionWithDrums(
      chordsForPlayer,
      bpm,
      // On beat callback - update UI
      (chordIndex, beat, loop) => {
        setCurrentChordIndex(chordIndex);
        setCurrentBeat(beat);
        setLoopCount(loop);
      },
      // On complete callback
      () => {
        setIsPlayingProgression(false);
        setCurrentChordIndex(null);
        setCurrentBeat(0);
        setLoopCount(1);
        setStopProgression(null);
      }
    );

    setStopProgression(() => stop);
  };

  // Stop progression when component unmounts or scale changes
  const handleStopProgression = () => {
    if (stopProgression) {
      stopProgression();
      setStopProgression(null);
      setIsPlayingProgression(false);
      setCurrentChordIndex(null);
      setCurrentBeat(0);
      setLoopCount(1);
    }
  };

  // Get note at specific position
  const getNoteAtPosition = (stringNum: number, fretNum: number): ScaleNote | undefined => {
    return scaleNotes.find((n) => n.string === stringNum && n.fret === fretNum);
  };

  // Check if fret should have a marker
  const hasFretMarker = (fretNum: number): boolean => {
    return [3, 5, 7, 9].includes(fretNum);
  };

  const hasDoubleFretMarker = (fretNum: number): boolean => {
    return fretNum === 12;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-Lora text-4xl md:text-5xl mb-2 bg-gradient-to-r from-[#1BD79E] to-[#38DBE5] bg-clip-text text-transparent">
          Scale Explorer
        </h1>
        <p className="font-Lora text-gray-400 text-lg">
          Learn and practice guitar scales
        </p>
      </div>

      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Root Note Selector */}
            <div>
              <label className="block font-Lora text-gray-400 mb-2 text-sm">
                Root Note
              </label>
              <select
                value={selectedRoot}
                onChange={(e) => setSelectedRoot(Number(e.target.value))}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 font-Lora text-white focus:outline-none focus:border-[#1BD79E]"
              >
                {ROOT_NOTES.map((root, idx) => (
                  <option key={root.name} value={idx}>
                    {root.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scale Selector */}
            <div>
              <label className="block font-Lora text-gray-400 mb-2 text-sm">
                Scale Type
              </label>
              <select
                value={selectedScale}
                onChange={(e) => setSelectedScale(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 font-Lora text-white focus:outline-none focus:border-[#1BD79E]"
              >
                {Object.entries(SCALES).map(([key, scaleData]) => (
                  <option key={key} value={key}>
                    {scaleData.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Toggle */}
            <div>
              <label className="block font-Lora text-gray-400 mb-2 text-sm">
                Display
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowIntervals(false)}
                  className={`flex-1 px-4 py-3 rounded-lg font-Lora transition-all ${
                    !showIntervals
                      ? "bg-[#1BD79E] text-black"
                      : "bg-[#1a1a1a] text-gray-400 border border-[#333]"
                  }`}
                >
                  Notes
                </button>
                <button
                  onClick={() => setShowIntervals(true)}
                  className={`flex-1 px-4 py-3 rounded-lg font-Lora transition-all ${
                    showIntervals
                      ? "bg-[#1BD79E] text-black"
                      : "bg-[#1a1a1a] text-gray-400 border border-[#333]"
                  }`}
                >
                  Intervals
                </button>
              </div>
            </div>
          </div>

          {/* Scale Info and Chord Progressions - Side by Side */}
          <div className="mt-6 pt-4 border-t border-[#222]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Side - Scale Info */}
              <div className="bg-[#1a1a1a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-Lora text-xl text-[#1BD79E]">
                      {rootNote.name.split("/")[0]} {scale.name}
                    </h2>
                    <p className="font-Lora text-gray-500 text-xs mt-1">
                      {scale.description}
                    </p>
                  </div>
                  <button
                    onClick={playScaleAscending}
                    disabled={isPlaying}
                    className={`px-4 py-2 rounded-full font-Lora font-semibold text-sm transition-all flex items-center gap-2 ${
                      isPlaying
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-[#1BD79E] text-black hover:bg-[#15c48e] hover:scale-105"
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <span className="w-2 h-2 bg-black rounded-full animate-ping" />
                        Playing...
                      </>
                    ) : (
                      <>▶ Play Scale</>
                    )}
                  </button>
                </div>

                {/* Scale Formula */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-Lora text-gray-500 text-xs">Formula:</span>
                    <div className="flex gap-1">
                      {getScaleFormula(scale).map((degree, idx) => {
                        const isMajorDegree = ["1", "2", "3", "4", "5", "6", "7"].includes(degree);
                        const isRoot = degree === "1";
                        return (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded font-Lora text-xs font-semibold ${
                              isRoot
                                ? "bg-[#1BD79E] text-black"
                                : isMajorDegree
                                ? "bg-[#2a2a2a] text-white"
                                : "bg-[#2a2a2a] text-[#FF6B6B]"
                            }`}
                          >
                            {degree}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-gray-600 text-xs font-Lora">vs Major: 1 2 3 4 5 6 7</span>
                  </div>
                </div>

                {/* Scale Notes */}
                <div className="flex flex-wrap gap-1.5">
                  {scale.intervals.map((interval, idx) => {
                    const noteSemitone = (selectedRoot + interval) % 12;
                    const noteName = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][noteSemitone];
                    const formula = getScaleFormula(scale);
                    return (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-lg font-Lora text-xs ${
                          interval === 0
                            ? "bg-[#1BD79E] text-black font-bold"
                            : "bg-[#2a2a2a] text-white border border-[#333]"
                        }`}
                      >
                        {noteName} ({formula[idx]})
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Right Side - Chord Progressions */}
              <div className="bg-[#1a1a1a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-Lora text-lg text-white">Chord Progressions</h3>
                  <div className="flex gap-1.5">
                    {scale.progressions.map((prog, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedProgression(idx)}
                        className={`px-2 py-1 rounded-full font-Lora text-xs transition-all ${
                          selectedProgression === idx
                            ? "bg-[#1BD79E] text-black"
                            : "bg-[#2a2a2a] text-gray-400 hover:bg-[#333] hover:text-white"
                        }`}
                      >
                        {prog.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progression Display */}
                {currentProgression && (
                  <div>
                    {/* Controls Row - Play, Stop, BPM */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <button
                        onClick={playProgression}
                        className={`px-3 py-1.5 rounded-full font-Lora font-semibold text-xs transition-all flex items-center gap-2 ${
                          isPlayingProgression
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-[#38DBE5] text-black hover:bg-[#2bc8d5] hover:scale-105"
                        }`}
                      >
                        {isPlayingProgression ? (
                          <>■ Stop</>
                        ) : (
                          <>▶ Play</>
                        )}
                      </button>
                      
                      {/* BPM Control */}
                      <div className="flex items-center gap-1 bg-[#2a2a2a] rounded-full px-2 py-1">
                        <span className="text-gray-500 font-Lora text-xs">BPM:</span>
                        <input
                          type="number"
                          min="60"
                          max="140"
                          value={bpm}
                          onChange={(e) => setBpm(Math.max(60, Math.min(140, parseInt(e.target.value) || 90)))}
                          disabled={isPlayingProgression}
                          className="w-10 bg-transparent text-white font-Lora text-xs text-center focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      {/* Beat Indicator - 4 dots for 4/4 time + Loop Counter */}
                      {isPlayingProgression && (
                        <div className="flex items-center gap-2 ml-2">
                          <div className="flex items-center gap-1">
                            {[0, 1, 2, 3].map((beat) => (
                              <div
                                key={beat}
                                className={`w-2 h-2 rounded-full transition-all duration-100 ${
                                  currentBeat === beat
                                    ? "bg-[#1BD79E] scale-125"
                                    : "bg-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-gray-500 font-Lora text-xs">
                            Loop {loopCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pattern Display */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-gray-500 font-Lora text-xs">Pattern:</span>
                      <div className="flex gap-1">
                        {currentProgression.numerals.map((numeral, idx) => (
                          <span key={idx} className="flex items-center">
                            <span 
                              className={`font-Lora text-sm transition-all duration-200 px-1.5 py-0.5 rounded ${
                                currentChordIndex === idx 
                                  ? "bg-[#1BD79E] text-black scale-110 font-bold" 
                                  : "text-[#38DBE5]"
                              }`}
                            >
                              {numeral}
                            </span>
                            {idx < currentProgression.numerals.length - 1 && (
                              <span className="text-gray-600 mx-1">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Chords */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500 font-Lora text-xs">Chords:</span>
                      {progressionChords.map((chordInfo, idx) => (
                        <Link
                          key={idx}
                          href={`/chords/${chordInfo.searchId}`}
                          className="group flex items-center"
                        >
                          <span 
                            className={`px-2 py-1 rounded-lg font-Lora text-sm transition-all duration-200 ${
                              currentChordIndex === idx
                                ? "bg-[#1BD79E] text-black scale-110 shadow-lg shadow-[#1BD79E]/30 border-2 border-white"
                                : "bg-[#2a2a2a] text-white border border-[#333] group-hover:border-[#1BD79E] group-hover:text-[#1BD79E]"
                            }`}
                          >
                            {chordInfo.chord}
                          </span>
                          {idx < progressionChords.length - 1 && (
                            <span className="text-gray-600 mx-1">→</span>
                          )}
                        </Link>
                      ))}
                    </div>

                    <p className="mt-2 text-gray-600 text-xs font-Lora">
                      Click chord to see diagram
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fretboard - matching chord viewer style */}
      <div className="max-w-full overflow-x-auto pb-8">
        <div className="flex">
          {FRETS.map((fretNum) => (
            <div key={fretNum} className="flex flex-col items-center">
              {/* Fret Number */}
              <p className="text-white text-center pb-2 text-xl md:text-2xl font-Lora">
                {fretNum === 0 ? "Open" : fretNum}
              </p>

              {/* Fret with strings */}
              <div
                className={`h-[199px] md:h-[279px] w-[100px] md:w-[120px] relative border-r-8 border-l-8 border-collapse ${
                  fretNum === 0 ? "border-l-[12px]" : ""
                }`}
              >
                {/* Strings */}
                {[1, 2, 3, 4, 5, 6].map((stringNum) => {
                  const note = getNoteAtPosition(stringNum, fretNum);
                  const isNotePlaying = note && playingNote === note.midiNote;

                  return (
                    <div
                      key={stringNum}
                      className="w-[84px] md:w-[103px] mb-9 md:mb-[52px] relative"
                      style={{
                        background: "#FFF",
                        height: STRING_HEIGHTS[stringNum - 1],
                      }}
                    >
                      {/* Note on string */}
                      {note && (
                        <button
                          onClick={() => handleNoteClick(note)}
                          className={`absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] h-6 w-6 md:h-[32px] md:w-[32px] rounded-full transition-all duration-150 cursor-pointer hover:scale-125 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-white ${
                            note.isRoot
                              ? "bg-[#1BD79E]"
                              : "bg-[#2D2D2D] border-2 border-[#1BD79E]"
                          } ${
                            isNotePlaying
                              ? "scale-125 ring-4 ring-white ring-opacity-50"
                              : ""
                          }`}
                          style={
                            isNotePlaying
                              ? { boxShadow: "0 0 20px #1BD79E, 0 0 40px #1BD79E" }
                              : {}
                          }
                          aria-label={`Play ${note.note} on string ${stringNum}`}
                        >
                          <span
                            className={`flex items-center justify-center font-Lora text-xs md:text-sm font-bold ${
                              note.isRoot ? "text-black" : "text-white"
                            }`}
                          >
                            {showIntervals ? getIntervalName(note.interval) : note.note}
                          </span>
                        </button>
                      )}

                      {/* String number on open position */}
                      {fretNum === 0 && !note && (
                        <div className="absolute -left-8 top-[50%] translate-y-[-50%] text-white font-Lora text-sm">
                          {stringNum}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Fret marker (diamond) */}
                {hasFretMarker(fretNum) && (
                  <div className="w-3 h-3 bg-[#FFF] absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rotate-45" />
                )}

                {/* Double fret marker for 12th fret */}
                {hasDoubleFretMarker(fretNum) && (
                  <>
                    <div className="w-3 h-3 bg-[#FFF] absolute left-[50%] top-[35%] translate-x-[-50%] translate-y-[-50%] rotate-45" />
                    <div className="w-3 h-3 bg-[#FFF] absolute left-[50%] top-[65%] translate-x-[-50%] translate-y-[-50%] rotate-45" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <h3 className="font-Lora text-xl text-[#1BD79E] mb-4">How to Use</h3>
          <ul className="font-Lora text-gray-400 text-sm space-y-2">
            <li className="flex items-start">
              <span className="text-[#1BD79E] mr-2">•</span>
              <span>
                <strong className="text-[#1BD79E]">Solid green circles</strong> are root notes - the &quot;home base&quot; of the scale
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-[#1BD79E] mr-2">•</span>
              <span>
                <strong className="text-white">Outlined circles</strong> are other notes in the scale
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-[#1BD79E] mr-2">•</span>
              <span>Click any note to hear how it sounds</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#1BD79E] mr-2">•</span>
              <span>Toggle between Notes and Intervals view to learn scale patterns</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
