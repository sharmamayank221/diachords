import React, { useState, useEffect, useRef } from "react";
import { createBackingTrack, disposeBackingTrack, Genre, BackingTrack } from "@/utils/backingTrackEngine";

const GENRES: { id: Genre; name: string; emoji: string; description: string }[] = [
  { id: "rock", name: "Rock", emoji: "🎸", description: "Driving 4/4 beat" },
  { id: "blues", name: "Blues", emoji: "🎷", description: "Shuffle feel, walking bass" },
  { id: "jazz", name: "Jazz", emoji: "🎹", description: "Swing, off-beat comping" },
  { id: "pop", name: "Pop", emoji: "🎤", description: "Modern, steady beat" },
  { id: "funk", name: "Funk", emoji: "🕺", description: "Syncopated, groovy" },
  { id: "reggae", name: "Reggae", emoji: "🌴", description: "Off-beat skank" },
  { id: "country", name: "Country", emoji: "🤠", description: "Train beat, twangy" },
];

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const PRESET_PROGRESSIONS: { name: string; chords: string[] }[] = [
  { name: "I-V-vi-IV (Pop)", chords: ["C", "G", "Am", "F"] },
  { name: "I-IV-V (Rock)", chords: ["C", "F", "G", "G"] },
  { name: "ii-V-I (Jazz)", chords: ["Dm", "G", "C", "C"] },
  { name: "I-vi-IV-V (50s)", chords: ["C", "Am", "F", "G"] },
  { name: "vi-IV-I-V (Sad)", chords: ["Am", "F", "C", "G"] },
  { name: "I-IV (Two Chord)", chords: ["C", "F", "C", "F"] },
  { name: "12-Bar Blues", chords: ["C", "C", "C", "C", "F", "F", "C", "C", "G", "F", "C", "G"] },
  { name: "i-VII-VI-VII (Minor)", chords: ["Am", "G", "F", "G"] },
];

export default function BackingTrackGenerator() {
  const [selectedGenre, setSelectedGenre] = useState<Genre>("rock");
  const [selectedKey, setSelectedKey] = useState("C");
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customChords, setCustomChords] = useState<string[]>(["C", "G", "Am", "F"]);
  const [useCustom, setUseCustom] = useState(false);
  
  // Volume states (0-100)
  const [drumVolume, setDrumVolume] = useState(80);
  const [bassVolume, setBassVolume] = useState(70);
  const [rhythmVolume, setRhythmVolume] = useState(50);
  
  // Mute states
  const [drumMuted, setDrumMuted] = useState(false);
  const [bassMuted, setBassMuted] = useState(false);
  const [rhythmMuted, setRhythmMuted] = useState(false);
  
  const backingTrackRef = useRef<BackingTrack | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  
  // Transpose chords to selected key
  const transposeChord = (chord: string, fromKey: string, toKey: string): string => {
    const fromIndex = KEYS.indexOf(fromKey);
    const toIndex = KEYS.indexOf(toKey);
    if (fromIndex === -1 || toIndex === -1) return chord;
    
    const semitones = (toIndex - fromIndex + 12) % 12;
    
    // Parse chord root and suffix
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;
    
    const root = match[1];
    const suffix = match[2];
    
    let rootIndex = KEYS.indexOf(root);
    if (rootIndex === -1) {
      // Handle flats
      const flatToSharp: Record<string, string> = { "Db": "C#", "Eb": "Eb", "Gb": "F#", "Ab": "Ab", "Bb": "Bb" };
      rootIndex = KEYS.indexOf(flatToSharp[root] || root);
    }
    
    const newRootIndex = (rootIndex + semitones) % 12;
    return KEYS[newRootIndex] + suffix;
  };
  
  const getTransposedProgression = (): string[] => {
    const baseChords = useCustom ? customChords : PRESET_PROGRESSIONS[selectedPreset].chords;
    return baseChords.map(chord => transposeChord(chord, "C", selectedKey));
  };
  
  // Beat animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentBeat(prev => (prev + 1) % 4);
      }, (60 / bpm) * 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, bpm]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeBackingTrack();
    };
  }, []);
  
  const handlePlay = async () => {
    if (isPlaying && backingTrackRef.current) {
      // Stop
      try {
        backingTrackRef.current.stop();
      } catch (e) {
        console.warn("Stop error handled:", e);
      }
      backingTrackRef.current = null;
      setIsPlaying(false);
      setCurrentBeat(0);
    } else if (!isPlaying) {
      // Start
      const chords = getTransposedProgression();
      const track = await createBackingTrack({
        key: selectedKey,
        bpm,
        genre: selectedGenre,
        chordProgression: chords,
        measures: chords.length,
      });
      
      backingTrackRef.current = track;
      
      // Apply initial volumes
      track.setVolume("drums", drumMuted ? 0 : drumVolume);
      track.setVolume("bass", bassMuted ? 0 : bassVolume);
      track.setVolume("rhythm", rhythmMuted ? 0 : rhythmVolume);
      
      track.start();
      setIsPlaying(true);
    }
  };
  
  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    backingTrackRef.current?.setBpm(newBpm);
  };
  
  const handleVolumeChange = (instrument: "drums" | "bass" | "rhythm", value: number) => {
    if (instrument === "drums") {
      setDrumVolume(value);
      if (!drumMuted) backingTrackRef.current?.setVolume("drums", value);
    }
    if (instrument === "bass") {
      setBassVolume(value);
      if (!bassMuted) backingTrackRef.current?.setVolume("bass", value);
    }
    if (instrument === "rhythm") {
      setRhythmVolume(value);
      if (!rhythmMuted) backingTrackRef.current?.setVolume("rhythm", value);
    }
  };
  
  const handleMuteToggle = (instrument: "drums" | "bass" | "rhythm") => {
    if (instrument === "drums") {
      const newMuted = !drumMuted;
      setDrumMuted(newMuted);
      backingTrackRef.current?.setVolume("drums", newMuted ? 0 : drumVolume);
    }
    if (instrument === "bass") {
      const newMuted = !bassMuted;
      setBassMuted(newMuted);
      backingTrackRef.current?.setVolume("bass", newMuted ? 0 : bassVolume);
    }
    if (instrument === "rhythm") {
      const newMuted = !rhythmMuted;
      setRhythmMuted(newMuted);
      backingTrackRef.current?.setVolume("rhythm", newMuted ? 0 : rhythmVolume);
    }
  };
  
  const chords = getTransposedProgression();
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-Lora text-4xl text-white mb-2">
          🎵 AI Backing Track Generator
        </h1>
        <p className="font-Lora text-gray-400">
          Generate custom backing tracks to practice and jam along
        </p>
      </div>
      
      {/* Main Controls */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-6">
        {/* Genre Selection */}
        <div className="mb-6">
          <label className="font-Lora text-gray-400 text-sm mb-3 block">Style / Genre</label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.id)}
                className={`p-3 rounded-xl transition-all ${
                  selectedGenre === genre.id
                    ? "bg-[#1BD79E] text-black"
                    : "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]"
                }`}
              >
                <div className="text-2xl mb-1">{genre.emoji}</div>
                <div className="font-Lora text-sm font-semibold">{genre.name}</div>
              </button>
            ))}
          </div>
          <p className="font-Lora text-gray-500 text-xs mt-2">
            {GENRES.find(g => g.id === selectedGenre)?.description}
          </p>
        </div>
        
        {/* Key and BPM */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="font-Lora text-gray-400 text-sm mb-2 block">Key</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full bg-[#1a1a1a] text-white border border-[#333] rounded-lg px-4 py-3 font-Lora focus:outline-none focus:border-[#1BD79E]"
            >
              {KEYS.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="font-Lora text-gray-400 text-sm mb-2 block">
              Tempo: {bpm} BPM
            </label>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => handleBpmChange(parseInt(e.target.value))}
              className="w-full h-3 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#1BD79E]"
            />
            <div className="flex justify-between text-gray-500 text-xs font-Lora mt-1">
              <span>60</span>
              <span>120</span>
              <span>180</span>
            </div>
          </div>
        </div>
        
        {/* Chord Progression */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="font-Lora text-gray-400 text-sm">Chord Progression</label>
            <button
              onClick={() => setUseCustom(!useCustom)}
              className={`px-3 py-1 rounded-full font-Lora text-xs ${
                useCustom
                  ? "bg-[#1BD79E] text-black"
                  : "bg-[#2a2a2a] text-gray-400 hover:text-white"
              }`}
            >
              {useCustom ? "Using Custom" : "Use Custom"}
            </button>
          </div>
          
          {!useCustom ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRESET_PROGRESSIONS.map((prog, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPreset(idx)}
                  className={`p-3 rounded-lg text-left transition-all ${
                    selectedPreset === idx
                      ? "bg-[#1BD79E] text-black"
                      : "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border border-[#333]"
                  }`}
                >
                  <div className="font-Lora text-sm font-semibold">{prog.name}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {prog.chords.slice(0, 4).join(" → ")}
                    {prog.chords.length > 4 && "..."}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {customChords.map((chord, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={chord}
                      onChange={(e) => {
                        const newChords = [...customChords];
                        newChords[idx] = e.target.value;
                        setCustomChords(newChords);
                      }}
                      className="w-16 bg-[#2a2a2a] text-white border border-[#444] rounded px-2 py-1 font-Lora text-center"
                    />
                    {customChords.length > 2 && (
                      <button
                        onClick={() => setCustomChords(customChords.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setCustomChords([...customChords, "C"])}
                  className="px-3 py-1 bg-[#2a2a2a] text-[#1BD79E] rounded hover:bg-[#333]"
                >
                  + Add
                </button>
              </div>
              <p className="text-gray-500 text-xs font-Lora">
                Enter chords like: C, Am, F, G, Dm7, etc.
              </p>
            </div>
          )}
        </div>
        
        {/* Current Progression Display */}
        <div className="bg-[#0a0a0a] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {chords.map((chord, idx) => (
              <div
                key={idx}
                className={`px-4 py-2 rounded-lg font-Lora text-lg transition-all duration-200 ${
                  isPlaying && idx === Math.floor(currentBeat / (4 / chords.length)) % chords.length
                    ? "bg-[#1BD79E] text-black scale-110 shadow-lg shadow-[#1BD79E]/30"
                    : "bg-[#1a1a1a] text-white"
                }`}
              >
                {chord}
              </div>
            ))}
          </div>
          {isPlaying && (
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2, 3].map((beat) => (
                <div
                  key={beat}
                  className={`w-3 h-3 rounded-full transition-all duration-100 ${
                    currentBeat === beat
                      ? "bg-[#1BD79E] scale-125"
                      : "bg-gray-600"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Play Button */}
        <div className="flex justify-center">
          <button
            onClick={handlePlay}
            className={`px-12 py-4 rounded-full font-Lora text-xl font-bold transition-all duration-300 ${
              isPlaying
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                : "bg-[#1BD79E] text-black hover:bg-[#15c48e] hover:scale-105"
            }`}
          >
            {isPlaying ? "■ Stop" : "▶ Play Backing Track"}
          </button>
        </div>
      </div>
      
      {/* Mixer */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
        <h2 className="font-Lora text-xl text-white mb-4 text-center">🎚️ Mixer</h2>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Drums */}
          <div className="text-center">
            <button
              onClick={() => handleMuteToggle("drums")}
              className={`w-12 h-12 rounded-full mb-3 transition-all ${
                drumMuted
                  ? "bg-red-500/20 text-red-500"
                  : "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]"
              }`}
            >
              🥁
            </button>
            <div className="font-Lora text-sm text-gray-400 mb-2">Drums</div>
            <input
              type="range"
              min="0"
              max="100"
              value={drumVolume}
              onChange={(e) => handleVolumeChange("drums", parseInt(e.target.value))}
              className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#1BD79E]"
              style={{ writingMode: "vertical-lr", height: "100px", width: "8px", margin: "0 auto" }}
            />
            <div className="font-Lora text-xs text-gray-500 mt-2">{drumVolume}%</div>
          </div>
          
          {/* Bass */}
          <div className="text-center">
            <button
              onClick={() => handleMuteToggle("bass")}
              className={`w-12 h-12 rounded-full mb-3 transition-all ${
                bassMuted
                  ? "bg-red-500/20 text-red-500"
                  : "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]"
              }`}
            >
              🎸
            </button>
            <div className="font-Lora text-sm text-gray-400 mb-2">Bass</div>
            <input
              type="range"
              min="0"
              max="100"
              value={bassVolume}
              onChange={(e) => handleVolumeChange("bass", parseInt(e.target.value))}
              className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#1BD79E]"
              style={{ writingMode: "vertical-lr", height: "100px", width: "8px", margin: "0 auto" }}
            />
            <div className="font-Lora text-xs text-gray-500 mt-2">{bassVolume}%</div>
          </div>
          
          {/* Rhythm */}
          <div className="text-center">
            <button
              onClick={() => handleMuteToggle("rhythm")}
              className={`w-12 h-12 rounded-full mb-3 transition-all ${
                rhythmMuted
                  ? "bg-red-500/20 text-red-500"
                  : "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]"
              }`}
            >
              🎹
            </button>
            <div className="font-Lora text-sm text-gray-400 mb-2">Keys</div>
            <input
              type="range"
              min="0"
              max="100"
              value={rhythmVolume}
              onChange={(e) => handleVolumeChange("rhythm", parseInt(e.target.value))}
              className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#1BD79E]"
              style={{ writingMode: "vertical-lr", height: "100px", width: "8px", margin: "0 auto" }}
            />
            <div className="font-Lora text-xs text-gray-500 mt-2">{rhythmVolume}%</div>
          </div>
        </div>
        
        <p className="text-center text-gray-600 text-xs font-Lora mt-4">
          Click instrument icon to mute/unmute
        </p>
      </div>
      
      {/* Tips */}
      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm font-Lora">
          💡 Pro tip: Practice your chord changes along with the beat. Start slow and increase BPM as you improve!
        </p>
      </div>
    </div>
  );
}

