import React, { useState, useRef, useCallback, useEffect } from "react";

// All chromatic notes
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Chord definitions with their intervals from root
const CHORD_TYPES: Record<string, { intervals: number[]; name: string }> = {
  major: { intervals: [0, 4, 7], name: "Major" },
  minor: { intervals: [0, 3, 7], name: "Minor" },
  "7": { intervals: [0, 4, 7, 10], name: "7" },
  maj7: { intervals: [0, 4, 7, 11], name: "Maj7" },
  m7: { intervals: [0, 3, 7, 10], name: "m7" },
  dim: { intervals: [0, 3, 6], name: "dim" },
  aug: { intervals: [0, 4, 8], name: "aug" },
  sus2: { intervals: [0, 2, 7], name: "sus2" },
  sus4: { intervals: [0, 5, 7], name: "sus4" },
  add9: { intervals: [0, 4, 7, 14], name: "add9" },
  "6": { intervals: [0, 4, 7, 9], name: "6" },
  m6: { intervals: [0, 3, 7, 9], name: "m6" },
  "9": { intervals: [0, 4, 7, 10, 14], name: "9" },
  m9: { intervals: [0, 3, 7, 10, 14], name: "m9" },
  "5": { intervals: [0, 7], name: "5 (Power)" },
};

// Common guitar chord voicings for better detection
const COMMON_GUITAR_CHORDS: Record<string, { notes: string[]; display: string }> = {
  // Major chords
  "C_major": { notes: ["C", "E", "G"], display: "C" },
  "D_major": { notes: ["D", "F#", "A"], display: "D" },
  "E_major": { notes: ["E", "G#", "B"], display: "E" },
  "F_major": { notes: ["F", "A", "C"], display: "F" },
  "G_major": { notes: ["G", "B", "D"], display: "G" },
  "A_major": { notes: ["A", "C#", "E"], display: "A" },
  "B_major": { notes: ["B", "D#", "F#"], display: "B" },
  // Minor chords
  "C_minor": { notes: ["C", "D#", "G"], display: "Cm" },
  "D_minor": { notes: ["D", "F", "A"], display: "Dm" },
  "E_minor": { notes: ["E", "G", "B"], display: "Em" },
  "F_minor": { notes: ["F", "G#", "C"], display: "Fm" },
  "G_minor": { notes: ["G", "A#", "D"], display: "Gm" },
  "A_minor": { notes: ["A", "C", "E"], display: "Am" },
  "B_minor": { notes: ["B", "D", "F#"], display: "Bm" },
  // 7th chords
  "G_7": { notes: ["G", "B", "D", "F"], display: "G7" },
  "C_7": { notes: ["C", "E", "G", "A#"], display: "C7" },
  "D_7": { notes: ["D", "F#", "A", "C"], display: "D7" },
  "E_7": { notes: ["E", "G#", "B", "D"], display: "E7" },
  "A_7": { notes: ["A", "C#", "E", "G"], display: "A7" },
  "B_7": { notes: ["B", "D#", "F#", "A"], display: "B7" },
};

interface DetectedNote {
  note: string;
  frequency: number;
  confidence: number;
  timestamp: number;
}

interface ChordMatch {
  chord: string;
  confidence: number;
  notes: string[];
}

// Pitch detection using autocorrelation
function autoCorrelate(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

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

// Convert frequency to note name
function frequencyToNote(frequency: number): { note: string; octave: number } {
  const A4 = 440;
  const semitones = 12 * Math.log2(frequency / A4);
  const noteIndex = Math.round(semitones) + 9; // A is at index 9
  const octave = Math.floor((noteIndex + 3) / 12) + 4;
  const note = NOTE_NAMES[((noteIndex % 12) + 12) % 12];
  return { note, octave };
}

// Get note index (0-11) from note name
function getNoteIndex(note: string): number {
  return NOTE_NAMES.indexOf(note);
}

// Match detected notes to chords
function matchChord(detectedNotes: string[]): ChordMatch[] {
  const matches: ChordMatch[] = [];
  const uniqueNotes = Array.from(new Set(detectedNotes));

  if (uniqueNotes.length < 2) return [];

  // First check against common guitar chord voicings
  for (const [key, { notes, display }] of Object.entries(COMMON_GUITAR_CHORDS)) {
    const matchedNotes = notes.filter(n => uniqueNotes.includes(n));
    const confidence = matchedNotes.length / notes.length;
    
    if (confidence >= 0.66) { // At least 2/3 notes match
      matches.push({
        chord: display,
        confidence: confidence,
        notes: matchedNotes,
      });
    }
  }

  // If no common chord matched, try generic chord detection
  if (matches.length === 0) {
    for (const root of uniqueNotes) {
      const rootIndex = getNoteIndex(root);
      
      for (const [type, { intervals, name }] of Object.entries(CHORD_TYPES)) {
        const expectedNotes = intervals.map(i => NOTE_NAMES[(rootIndex + i) % 12]);
        const matchedNotes = expectedNotes.filter(n => uniqueNotes.includes(n));
        const confidence = matchedNotes.length / expectedNotes.length;
        
        if (confidence >= 0.66) {
          matches.push({
            chord: `${root}${name === "Major" ? "" : name}`,
            confidence: confidence,
            notes: matchedNotes,
          });
        }
      }
    }
  }

  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export default function ChordRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);
  const [matchedChords, setMatchedChords] = useState<ChordMatch[]>([]);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.02);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const noteHistoryRef = useRef<DetectedNote[]>([]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);
      
      setIsListening(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure microphone permissions are granted.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {
        // Ignore errors if already closed
      });
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
    setDetectedNotes([]);
    setMatchedChords([]);
    setCurrentNote(null);
    setVolume(0);
    noteHistoryRef.current = [];
  }, []);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);

    // Calculate volume (RMS)
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);
    setVolume(Math.min(rms * 10, 1));

    // Only process if volume is above threshold
    if (rms > sensitivity) {
      const frequency = autoCorrelate(buffer, audioContextRef.current.sampleRate);
      
      if (frequency && frequency > 60 && frequency < 1200) {
        const { note, octave } = frequencyToNote(frequency);
        const now = Date.now();
        
        setCurrentNote(`${note}${octave}`);
        
        // Add to note history
        const newNote: DetectedNote = {
          note,
          frequency,
          confidence: rms,
          timestamp: now,
        };
        
        noteHistoryRef.current.push(newNote);
        
        // Keep only recent notes (last 1.5 seconds)
        noteHistoryRef.current = noteHistoryRef.current.filter(
          n => now - n.timestamp < 1500
        );
        
        // Update state with unique notes
        setDetectedNotes([...noteHistoryRef.current]);
        
        // Try to match chords with all detected notes
        const uniqueNoteNames = Array.from(new Set(noteHistoryRef.current.map(n => n.note)));
        const matches = matchChord(uniqueNoteNames);
        setMatchedChords(matches);
      }
    }

    animationRef.current = requestAnimationFrame(analyze);
  }, [sensitivity]);

  // Start analyzing when listening starts
  useEffect(() => {
    if (isListening && audioContextRef.current && analyserRef.current) {
      analyze();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isListening, analyze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup if we're still listening
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Clear old notes periodically
  useEffect(() => {
    if (!isListening) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      noteHistoryRef.current = noteHistoryRef.current.filter(
        n => now - n.timestamp < 1500
      );
      setDetectedNotes([...noteHistoryRef.current]);
      
      if (noteHistoryRef.current.length >= 2) {
        const uniqueNoteNames = Array.from(new Set(noteHistoryRef.current.map(n => n.note)));
        const matches = matchChord(uniqueNoteNames);
        setMatchedChords(matches);
      } else {
        setMatchedChords([]);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isListening]);

  const uniqueRecentNotes = Array.from(new Set(detectedNotes.map(n => n.note)));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-Lora font-bold mb-2">
            🎸 Chord Recognition
          </h1>
          <p className="text-gray-400 font-Lora">
            Play a chord and I&apos;ll tell you what it is
          </p>
        </div>

        {/* Main Display */}
        <div className="bg-[#0a0a0a] rounded-3xl p-6 md:p-8 border border-[#222] mb-6">
          {/* Detected Chord */}
          <div className="text-center mb-8">
            <div className="text-gray-500 text-sm font-Lora mb-2 uppercase tracking-wider">
              Detected Chord
            </div>
            <div className="relative">
              {matchedChords.length > 0 ? (
                <div className="space-y-4">
                  <div 
                    className="text-6xl md:text-8xl font-bold font-Lora text-[#1BD79E] animate-pulse"
                    style={{ 
                      textShadow: "0 0 30px rgba(27, 215, 158, 0.5)",
                    }}
                  >
                    {matchedChords[0].chord}
                  </div>
                  <div className="text-sm text-gray-400">
                    Confidence: {Math.round(matchedChords[0].confidence * 100)}%
                  </div>
                  
                  {/* Alternative matches */}
                  {matchedChords.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-[#333]">
                      <div className="text-xs text-gray-500 mb-2">Other possibilities:</div>
                      <div className="flex justify-center gap-3 flex-wrap">
                        {matchedChords.slice(1).map((match, i) => (
                          <span 
                            key={i}
                            className="px-3 py-1 bg-[#1a1a1a] rounded-full text-gray-400 text-sm"
                          >
                            {match.chord} ({Math.round(match.confidence * 100)}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-4xl md:text-6xl font-bold font-Lora text-gray-600">
                  {isListening ? "Play a chord..." : "---"}
                </div>
              )}
            </div>
          </div>

          {/* Current Note */}
          <div className="text-center mb-6">
            <div className="text-gray-500 text-xs font-Lora mb-1 uppercase tracking-wider">
              Current Note
            </div>
            <div className="text-2xl font-bold font-Lora text-[#38DBE5]">
              {currentNote || "---"}
            </div>
          </div>

          {/* Volume Meter */}
          <div className="mb-6">
            <div className="text-gray-500 text-xs font-Lora mb-2 uppercase tracking-wider text-center">
              Input Level
            </div>
            <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-75 rounded-full"
                style={{ 
                  width: `${volume * 100}%`,
                  backgroundColor: volume > 0.7 ? '#C65151' : volume > 0.4 ? '#EA9E2D' : '#1BD79E',
                }}
              />
            </div>
          </div>

          {/* Detected Notes */}
          <div className="mb-6">
            <div className="text-gray-500 text-xs font-Lora mb-2 uppercase tracking-wider text-center">
              Notes Detected ({uniqueRecentNotes.length})
            </div>
            <div className="flex justify-center gap-2 flex-wrap min-h-[40px]">
              {uniqueRecentNotes.length > 0 ? (
                uniqueRecentNotes.map((note, i) => (
                  <span 
                    key={`${note}-${i}`}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg font-Lora font-bold text-white"
                  >
                    {note}
                  </span>
                ))
              ) : (
                <span className="text-gray-600 font-Lora">No notes detected</span>
              )}
            </div>
          </div>

          {/* Sensitivity Control */}
          <div className="mb-6">
            <div className="text-gray-500 text-xs font-Lora mb-2 uppercase tracking-wider text-center">
              Sensitivity
            </div>
            <input
              type="range"
              min="0.005"
              max="0.05"
              step="0.005"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More sensitive</span>
              <span>Less sensitive</span>
            </div>
          </div>

          {/* Start/Stop Button */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-full py-4 rounded-2xl font-Lora font-bold text-xl transition-all transform hover:scale-[1.02] ${
              isListening
                ? "bg-gradient-to-r from-[#C65151] to-[#a03f3f] text-white"
                : "bg-gradient-to-r from-[#1BD79E] to-[#15a87a] text-black"
            }`}
          >
            {isListening ? "🛑 Stop Listening" : "🎤 Start Listening"}
          </button>
        </div>

        {/* Tips */}
        <div className="bg-[#0a0a0a] rounded-2xl p-5 border border-[#222]">
          <h3 className="font-Lora font-bold text-lg mb-3 text-[#38DBE5]">💡 Tips for best results:</h3>
          <ul className="space-y-2 text-gray-400 font-Lora text-sm">
            <li>• Strum all strings clearly and let them ring</li>
            <li>• Hold the chord for 1-2 seconds</li>
            <li>• Play in a quiet environment</li>
            <li>• Make sure your guitar is in tune</li>
            <li>• Adjust sensitivity if detection is too fast/slow</li>
          </ul>
        </div>

        {/* Common Chords Reference */}
        <div className="mt-6 bg-[#0a0a0a] rounded-2xl p-5 border border-[#222]">
          <h3 className="font-Lora font-bold text-lg mb-4 text-center">🎵 Try These Chords</h3>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
            {["C", "D", "E", "F", "G", "A", "B"].map(note => (
              <div key={note} className="text-center">
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]">
                  <div className="font-Lora font-bold text-[#1BD79E]">{note}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-2">
            {["Am", "Dm", "Em", "Fm", "Gm", "Bm", "G7"].map(chord => (
              <div key={chord} className="text-center">
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]">
                  <div className="font-Lora font-bold text-[#EA9E2D]">{chord}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Styling for range slider */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #1BD79E;
          cursor: pointer;
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #1BD79E;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}

