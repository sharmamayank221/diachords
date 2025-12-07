import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

interface MetronomeProps {}

const TIME_SIGNATURES = [
  { name: "4/4", beats: 4 },
  { name: "3/4", beats: 3 },
  { name: "6/8", beats: 6 },
  { name: "2/4", beats: 2 },
];

export default function Metronome({}: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState(TIME_SIGNATURES[0]);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  
  const clickHigh = useRef<Tone.Synth | null>(null);
  const clickLow = useRef<Tone.Synth | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);
  const beatRef = useRef(0);

  // Initialize synths
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
      if (loopRef.current) {
        loopRef.current.dispose();
      }
      clickHigh.current?.dispose();
      clickLow.current?.dispose();
    };
  }, []);

  // Update BPM when changed
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const startMetronome = async () => {
    await Tone.start();
    
    beatRef.current = 0;
    setCurrentBeat(0);

    if (loopRef.current) {
      loopRef.current.dispose();
    }

    loopRef.current = new Tone.Loop((time) => {
      const beat = beatRef.current;
      
      // Play click sound
      if (beat === 0) {
        // Accent on first beat
        clickHigh.current?.triggerAttackRelease("C6", "32n", time);
      } else {
        clickLow.current?.triggerAttackRelease("G5", "32n", time);
      }

      // Update visual beat indicator
      Tone.Draw.schedule(() => {
        setCurrentBeat(beat);
      }, time);

      beatRef.current = (beat + 1) % timeSignature.beats;
    }, "4n");

    loopRef.current.start(0);
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopMetronome = () => {
    if (loopRef.current) {
      loopRef.current.stop();
    }
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setIsPlaying(false);
    setCurrentBeat(0);
    beatRef.current = 0;
  };

  const toggleMetronome = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  // Tap tempo functionality
  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].filter((t) => now - t < 3000); // Keep taps within 3 seconds
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setBpm(calculatedBpm);
      }
    }
  }, [tapTimes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggleMetronome();
      } else if (e.code === "KeyT") {
        handleTapTempo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, handleTapTempo]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-Lora text-4xl md:text-5xl mb-2 bg-gradient-to-r from-[#1BD79E] to-[#38DBE5] bg-clip-text text-transparent">
          Metronome
        </h1>
        <p className="font-Lora text-gray-400 text-lg">
          Keep perfect time while practicing
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {/* Beat Indicators */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: timeSignature.beats }).map((_, idx) => (
            <div
              key={idx}
              className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-Lora text-xl font-bold transition-all duration-100 ${
                currentBeat === idx && isPlaying
                  ? idx === 0
                    ? "bg-[#1BD79E] text-black scale-125 shadow-lg shadow-[#1BD79E]/50"
                    : "bg-[#38DBE5] text-black scale-110 shadow-lg shadow-[#38DBE5]/50"
                  : "bg-[#1a1a1a] text-gray-500 border border-[#333]"
              }`}
            >
              {idx + 1}
            </div>
          ))}
        </div>

        {/* BPM Display */}
        <div className="text-center mb-6">
          <div className="text-7xl md:text-8xl font-Lora font-bold text-white mb-2">
            {bpm}
          </div>
          <div className="text-gray-500 font-Lora text-lg">BPM</div>
        </div>

        {/* BPM Slider */}
        <div className="mb-6 px-4">
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full h-3 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#1BD79E]"
          />
          <div className="flex justify-between text-gray-500 text-sm font-Lora mt-2">
            <span>40</span>
            <span>100</span>
            <span>160</span>
            <span>240</span>
          </div>
        </div>

        {/* Quick BPM Buttons */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {[60, 80, 100, 120, 140, 160].map((tempo) => (
            <button
              key={tempo}
              onClick={() => setBpm(tempo)}
              className={`px-4 py-2 rounded-lg font-Lora text-sm transition-all ${
                bpm === tempo
                  ? "bg-[#1BD79E] text-black"
                  : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a] border border-[#333]"
              }`}
            >
              {tempo}
            </button>
          ))}
        </div>

        {/* BPM Adjustment Buttons */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <button
            onClick={() => setBpm((prev) => Math.max(40, prev - 5))}
            className="w-12 h-12 rounded-full bg-[#1a1a1a] text-white text-2xl font-bold border border-[#333] hover:bg-[#2a2a2a] transition-all"
          >
            -
          </button>
          <button
            onClick={() => setBpm((prev) => Math.max(40, prev - 1))}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] text-white text-xl border border-[#333] hover:bg-[#2a2a2a] transition-all"
          >
            -1
          </button>
          <button
            onClick={() => setBpm((prev) => Math.min(240, prev + 1))}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] text-white text-xl border border-[#333] hover:bg-[#2a2a2a] transition-all"
          >
            +1
          </button>
          <button
            onClick={() => setBpm((prev) => Math.min(240, prev + 5))}
            className="w-12 h-12 rounded-full bg-[#1a1a1a] text-white text-2xl font-bold border border-[#333] hover:bg-[#2a2a2a] transition-all"
          >
            +
          </button>
        </div>

        {/* Play/Stop Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={toggleMetronome}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold transition-all transform hover:scale-105 active:scale-95 ${
              isPlaying
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
                : "bg-[#1BD79E] hover:bg-[#15c48e] text-black shadow-lg shadow-[#1BD79E]/30"
            }`}
          >
            {isPlaying ? "■" : "▶"}
          </button>
        </div>

        {/* Time Signature & Tap Tempo */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Time Signature */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <label className="block font-Lora text-gray-400 text-sm mb-2">
              Time Signature
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIME_SIGNATURES.map((ts) => (
                <button
                  key={ts.name}
                  onClick={() => {
                    setTimeSignature(ts);
                    if (isPlaying) {
                      stopMetronome();
                    }
                  }}
                  className={`px-3 py-2 rounded-lg font-Lora text-sm transition-all ${
                    timeSignature.name === ts.name
                      ? "bg-[#1BD79E] text-black"
                      : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
                  }`}
                >
                  {ts.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tap Tempo */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <label className="block font-Lora text-gray-400 text-sm mb-2">
              Tap Tempo
            </label>
            <button
              onClick={handleTapTempo}
              className="w-full py-3 rounded-lg font-Lora text-lg bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border border-[#333] transition-all active:scale-95"
            >
              TAP
            </button>
            <p className="text-gray-600 text-xs mt-2 font-Lora">or press T</p>
          </div>
        </div>

        {/* Tempo Markings Guide */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <h3 className="font-Lora text-[#1BD79E] text-sm mb-3">Tempo Guide</h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-Lora">
            <div className="flex justify-between text-gray-400">
              <span>Largo</span>
              <span className="text-gray-600">40-60</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Adagio</span>
              <span className="text-gray-600">66-76</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Andante</span>
              <span className="text-gray-600">76-108</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Moderato</span>
              <span className="text-gray-600">108-120</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Allegro</span>
              <span className="text-gray-600">120-168</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Presto</span>
              <span className="text-gray-600">168-200</span>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mt-6 text-center text-gray-600 text-sm font-Lora">
          <span className="bg-[#1a1a1a] px-2 py-1 rounded">Space</span> Play/Stop
          <span className="mx-2">•</span>
          <span className="bg-[#1a1a1a] px-2 py-1 rounded">T</span> Tap Tempo
        </div>
      </div>
    </div>
  );
}

