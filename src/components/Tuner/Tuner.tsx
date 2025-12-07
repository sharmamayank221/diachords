import React, { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";

// Standard guitar tuning frequencies (in Hz)
const GUITAR_STRINGS = [
  { note: "E2", frequency: 82.41, string: 6, color: "#38DBE5" },
  { note: "A2", frequency: 110.0, string: 5, color: "#C65151" },
  { note: "D3", frequency: 146.83, string: 4, color: "#C2D934" },
  { note: "G3", frequency: 196.0, string: 3, color: "#F642EF" },
  { note: "B3", frequency: 246.94, string: 2, color: "#EA9E2D" },
  { note: "E4", frequency: 329.63, string: 1, color: "#9c70e7" },
];

// All chromatic notes for detection
const ALL_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

interface TunerState {
  isListening: boolean;
  detectedFrequency: number | null;
  detectedNote: string | null;
  cents: number;
  closestString: (typeof GUITAR_STRINGS)[0] | null;
}

// Pitch detection using autocorrelation
function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number
): number | null {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  // Calculate RMS
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Not enough signal
  if (rms < 0.01) return null;

  let lastCorrelation = 1;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }

    correlation = 1 - correlation / MAX_SAMPLES;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }

    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01 && bestOffset > 0) {
    return sampleRate / bestOffset;
  }

  return null;
}

// Convert frequency to note name and cents offset
function frequencyToNote(frequency: number): {
  note: string;
  octave: number;
  cents: number;
} {
  const A4 = 440;
  const semitones = 12 * Math.log2(frequency / A4);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);

  const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12; // A is index 9
  const octave = Math.floor((roundedSemitones + 9) / 12) + 4;

  return {
    note: ALL_NOTES[noteIndex],
    octave,
    cents,
  };
}

// Find closest guitar string
function findClosestString(frequency: number): (typeof GUITAR_STRINGS)[0] {
  let closest = GUITAR_STRINGS[0];
  let minDiff = Math.abs(frequency - closest.frequency);

  for (const string of GUITAR_STRINGS) {
    const diff = Math.abs(frequency - string.frequency);
    if (diff < minDiff) {
      minDiff = diff;
      closest = string;
    }
  }

  return closest;
}

export default function Tuner() {
  const [state, setState] = useState<TunerState>({
    isListening: false,
    detectedFrequency: null,
    detectedNote: null,
    cents: 0,
    closestString: null,
  });

  const [selectedString, setSelectedString] = useState<
    (typeof GUITAR_STRINGS)[0] | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const samplerRef = useRef<Tone.Sampler | null>(null);

  // Initialize sampler for reference tones
  useEffect(() => {
    samplerRef.current = new Tone.Sampler({
      urls: {
        A2: "A2.mp3",
        A3: "A3.mp3",
        A4: "A4.mp3",
        C3: "C3.mp3",
        C4: "C4.mp3",
        C5: "C5.mp3",
        D3: "D3.mp3",
        D4: "D4.mp3",
        D5: "D5.mp3",
        E2: "E2.mp3",
        E3: "E3.mp3",
        E4: "E4.mp3",
        G2: "G2.mp3",
        G3: "G3.mp3",
        G4: "G4.mp3",
      },
      baseUrl: "/guitar-acoustic/",
    }).toDestination();

    return () => {
      samplerRef.current?.dispose();
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setState((prev) => ({ ...prev, isListening: true }));

      const detectPitch = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);

        const frequency = autoCorrelate(
          buffer,
          audioContextRef.current.sampleRate
        );

        if (frequency && frequency > 60 && frequency < 1000) {
          const { note, octave, cents } = frequencyToNote(frequency);
          const closestString = findClosestString(frequency);

          setState((prev) => ({
            ...prev,
            detectedFrequency: frequency,
            detectedNote: `${note}${octave}`,
            cents,
            closestString,
          }));
        }

        rafRef.current = requestAnimationFrame(detectPitch);
      };

      detectPitch();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert(
        "Could not access microphone. Please ensure microphone permissions are granted."
      );
    }
  }, []);

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setState({
      isListening: false,
      detectedFrequency: null,
      detectedNote: null,
      cents: 0,
      closestString: null,
    });
  }, []);

  const playReferenceNote = async (stringData: (typeof GUITAR_STRINGS)[0]) => {
    await Tone.start();
    setSelectedString(stringData);
    setIsPlaying(true);

    if (samplerRef.current) {
      samplerRef.current.triggerAttackRelease(stringData.note, 3);
    }

    setTimeout(() => setIsPlaying(false), 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const getTuningIndicator = () => {
    const { cents } = state;
    if (cents === 0 || !state.detectedNote) return "neutral";
    if (Math.abs(cents) <= 5) return "perfect";
    if (cents < -5) return "flat";
    return "sharp";
  };

  const tuningStatus = getTuningIndicator();

  return (
    <div className="min-h-[80vh] bg-black text-white flex flex-col items-center justify-center px-4 py-8">
      {/* Title */}
      <h1 className="font-Lora text-4xl md:text-5xl mb-2 text-center bg-gradient-to-r from-[#1BD79E] to-[#38DBE5] bg-clip-text text-transparent">
        Guitar Tuner
      </h1>
      <p className="font-Lora text-gray-400 text-lg mb-8 text-center">
        Standard Tuning: E A D G B E
      </p>

      {/* Main Tuner Display */}
      <div className="relative w-[300px] h-[300px] md:w-[350px] md:h-[350px] mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-gray-800" />

        {/* Tuning indicator arc */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="8"
          />
          {state.isListening && state.detectedNote && (
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={
                tuningStatus === "perfect"
                  ? "#1BD79E"
                  : tuningStatus === "flat"
                  ? "#C65151"
                  : tuningStatus === "sharp"
                  ? "#EA9E2D"
                  : "#333"
              }
              strokeWidth="8"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * (50 + state.cents / 2)) / 100}
              className="transition-all duration-150"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {state.isListening ? (
            state.detectedNote ? (
              <>
                <span
                  className="font-Lora text-6xl md:text-7xl font-bold transition-all duration-200"
                  style={{
                    color:
                      state.closestString?.color ||
                      (tuningStatus === "perfect"
                        ? "#1BD79E"
                        : tuningStatus === "flat"
                        ? "#C65151"
                        : "#EA9E2D"),
                  }}
                >
                  {state.detectedNote}
                </span>
                <span className="font-Lora text-2xl text-gray-400 mt-2">
                  {state.detectedFrequency?.toFixed(1)} Hz
                </span>
                <span
                  className={`font-Lora text-xl mt-2 ${
                    tuningStatus === "perfect"
                      ? "text-[#1BD79E]"
                      : tuningStatus === "flat"
                      ? "text-[#C65151]"
                      : "text-[#EA9E2D]"
                  }`}
                >
                  {tuningStatus === "perfect"
                    ? "✓ In Tune"
                    : tuningStatus === "flat"
                    ? `♭ ${Math.abs(state.cents)} cents flat`
                    : `♯ ${state.cents} cents sharp`}
                </span>
              </>
            ) : (
              <div className="text-center">
                <div className="tuner-listening-animation mb-4">
                  <span className="block w-4 h-4 bg-[#1BD79E] rounded-full animate-ping" />
                </div>
                <span className="font-Lora text-xl text-gray-400">
                  Listening...
                </span>
                <span className="font-Lora text-sm text-gray-500 block mt-2">
                  Play a string
                </span>
              </div>
            )
          ) : (
            <div className="text-center">
              <span className="font-Lora text-xl text-gray-500">
                Tap to start
              </span>
            </div>
          )}
        </div>

        {/* Tuning markers */}
        <div className="absolute inset-0">
          {[-50, -25, 0, 25, 50].map((position, i) => (
            <div
              key={i}
              className={`absolute w-1 h-3 ${
                position === 0 ? "bg-[#1BD79E] h-5" : "bg-gray-600"
              }`}
              style={{
                left: "50%",
                top: "2%",
                transform: `translateX(-50%) rotate(${
                  position * 1.8
                }deg) translateY(0)`,
                transformOrigin: "center 150px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Start/Stop Button */}
      <button
        onClick={state.isListening ? stopListening : startListening}
        className={`font-Lora text-xl px-8 py-4 rounded-full transition-all duration-300 mb-10 ${
          state.isListening
            ? "bg-[#C65151] hover:bg-[#d66161] text-white"
            : "bg-[#1BD79E] hover:bg-[#15c48e] text-black"
        }`}
      >
        {state.isListening ? "Stop Tuning" : "Start Tuning"}
      </button>

      {/* String Reference Section */}
      <div className="w-full max-w-lg">
        <h2 className="font-Lora text-2xl text-center mb-4 text-gray-300">
          Reference Tones
        </h2>
        <p className="font-Lora text-sm text-gray-500 text-center mb-6">
          Tap a string to hear its reference pitch
        </p>

        <div className="grid grid-cols-6 gap-2 md:gap-4">
          {GUITAR_STRINGS.map((string) => (
            <button
              key={string.string}
              onClick={() => playReferenceNote(string)}
              disabled={isPlaying}
              className={`relative flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
                selectedString?.string === string.string && isPlaying
                  ? "scale-110"
                  : "hover:scale-105"
              }`}
              style={{
                backgroundColor:
                  selectedString?.string === string.string && isPlaying
                    ? string.color + "40"
                    : "#1a1a1a",
                borderWidth: 2,
                borderColor:
                  selectedString?.string === string.string && isPlaying
                    ? string.color
                    : "#333",
              }}
            >
              <span
                className="font-Lora text-lg md:text-xl font-bold"
                style={{ color: string.color }}
              >
                {string.note.replace(/\d/, "")}
              </span>
              <span className="font-Lora text-xs text-gray-500 mt-1">
                {string.string}
              </span>
              <span className="font-Lora text-[10px] text-gray-600 mt-1">
                {string.frequency.toFixed(0)}Hz
              </span>

              {selectedString?.string === string.string && isPlaying && (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <div
                    className="absolute inset-0 animate-pulse opacity-30"
                    style={{ backgroundColor: string.color }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-12 w-full max-w-lg bg-[#111] rounded-2xl p-6">
        <h3 className="font-Lora text-xl text-[#1BD79E] mb-4">Tuning Tips</h3>
        <ul className="font-Lora text-gray-400 text-sm space-y-2">
          <li className="flex items-start">
            <span className="text-[#1BD79E] mr-2">•</span>
            Pluck one string at a time and let it ring clearly
          </li>
          <li className="flex items-start">
            <span className="text-[#1BD79E] mr-2">•</span>
            Tune in a quiet environment for best results
          </li>
          <li className="flex items-start">
            <span className="text-[#1BD79E] mr-2">•</span>
            Green indicator means you&apos;re in tune (±5 cents)
          </li>
          <li className="flex items-start">
            <span className="text-[#1BD79E] mr-2">•</span>
            Red = too flat, Orange = too sharp
          </li>
        </ul>
      </div>
    </div>
  );
}

