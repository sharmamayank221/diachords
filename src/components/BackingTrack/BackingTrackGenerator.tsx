import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { createBackingTrack, disposeBackingTrack, Genre, BackingTrack } from "@/utils/backingTrackEngine";
import {
  buildJamShareUrl,
  loadJamSession,
  majorScaleNotes,
  pentatonicScaleNotes,
  playCountIn,
  saveJamSession,
} from "@/utils/jamPracticeHelpers";

// ── Data ──────────────────────────────────────────────────────────────────────

const GENRES: { id: Genre; name: string; description: string; color: string; icon: React.ReactNode }[] = [
  { id: "rock",    name: "Rock",    description: "Driving 4/4 beat",       color: "#ef4444", icon: <RockIcon /> },
  { id: "blues",   name: "Blues",   description: "Shuffle, walking bass",   color: "#f59e0b", icon: <BluesIcon /> },
  { id: "jazz",    name: "Jazz",    description: "Swing, off-beat comping", color: "#8b5cf6", icon: <JazzIcon /> },
  { id: "pop",     name: "Pop",     description: "Modern, steady beat",     color: "#ec4899", icon: <PopIcon /> },
  { id: "funk",    name: "Funk",    description: "Syncopated, groovy",      color: "#f97316", icon: <FunkIcon /> },
  { id: "reggae",  name: "Reggae",  description: "Off-beat skank",          color: "#22c55e", icon: <ReggaeIcon /> },
  { id: "country", name: "Country", description: "Train beat, twangy",      color: "#eab308", icon: <CountryIcon /> },
];

const KEYS = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

const PRESET_PROGRESSIONS = [
  { name: "I–V–vi–IV",    label: "Pop",    chords: ["C","G","Am","F"] },
  { name: "I–IV–V",       label: "Rock",   chords: ["C","F","G","G"] },
  { name: "ii–V–I",       label: "Jazz",   chords: ["Dm","G","C","C"] },
  { name: "I–vi–IV–V",    label: "50s",    chords: ["C","Am","F","G"] },
  { name: "vi–IV–I–V",    label: "Sad",    chords: ["Am","F","C","G"] },
  { name: "I–IV",         label: "2 Chord",chords: ["C","F","C","F"] },
  { name: "12-Bar Blues", label: "Blues",  chords: ["C","C","C","C","F","F","C","C","G","F","C","G"] },
  { name: "i–VII–VI–VII", label: "Minor",  chords: ["Am","G","F","G"] },
];

const INSTRUMENTS: { key: "drums" | "bass" | "rhythm"; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "drums",  label: "Drums",  color: "#1BD79E", icon: <DrumsIcon /> },
  { key: "bass",   label: "Bass",   color: "#38DBE5", icon: <BassIcon /> },
  { key: "rhythm", label: "Keys",   color: "#8b5cf6", icon: <KeysIcon /> },
];

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function RockIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>; }
function BluesIcon()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M8 3c0 7.18 6 10 6 17"/><path d="M10 3c0 5.5-4 8-4 15"/><path d="M14 3c0 5 4 7 4 14"/></svg>; }
function JazzIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="2" y="8" width="4" height="13"/><rect x="9" y="5" width="4" height="16"/><rect x="16" y="2" width="4" height="19"/></svg>; }
function PopIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>; }
function FunkIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function ReggaeIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>; }
function CountryIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M3 17l4-8 4 4 4-7 4 11"/><path d="M3 17h18"/></svg>; }
function DrumsIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><ellipse cx="12" cy="8" rx="10" ry="4"/><path d="M2 8v8c0 2.21 4.48 4 10 4s10-1.79 10-4V8"/></svg>; }
function BassIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>; }
function KeysIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="2" y="8" width="20" height="12" rx="1"/><path d="M6 8V5"/><path d="M10 8V5"/><path d="M14 8V5"/><path d="M18 8V5"/></svg>; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function transposeChord(chord: string, fromKey: string, toKey: string): string {
  const fromIdx = KEYS.indexOf(fromKey);
  const toIdx   = KEYS.indexOf(toKey);
  if (fromIdx === -1 || toIdx === -1) return chord;
  const semitones = (toIdx - fromIdx + 12) % 12;
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;
  const flatToSharp: Record<string, string> = { Db:"C#", Gb:"F#" };
  let rootIdx = KEYS.indexOf(flatToSharp[match[1]] ?? match[1]);
  if (rootIdx === -1) rootIdx = 0;
  return KEYS[(rootIdx + semitones) % 12] + match[2];
}

// ── Component ─────────────────────────────────────────────────────────────────

const VALID_GENRES = new Set<Genre>(["rock", "blues", "jazz", "pop", "funk", "reggae", "country"]);
const PLAYBACK_SPEEDS = [0.75, 1, 1.25] as const;
const LOOP_OPTIONS = [
  { value: 0, label: "∞" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 4, label: "4×" },
  { value: 8, label: "8×" },
];

export interface BackingTrackGeneratorProps {
  practiceKey?: string;
  onPracticeKeyChange?: (key: string) => void;
  practiceScaleId?: string;
  onSuggestScale?: (genre: Genre) => void;
  onOpenScales?: () => void;
}

export default function BackingTrackGenerator({
  practiceKey,
  onPracticeKeyChange,
  practiceScaleId,
  onSuggestScale,
  onOpenScales,
}: BackingTrackGeneratorProps = {} as BackingTrackGeneratorProps) {
  const router = useRouter();
  const studioMode = practiceKey !== undefined;
  const [selectedGenre, setSelectedGenre]   = useState<Genre>("rock");
  const [selectedKey, setSelectedKey]       = useState("C");
  const [bpm, setBpm]                       = useState(100);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [currentBeat, setCurrentBeat]       = useState(0);
  const [currentChordIndex, setCurrentChordIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed]   = useState(1);
  const [loopLimit, setLoopLimit]           = useState(0);
  const [countIn, setCountIn]               = useState(true);
  const [customChordsText, setCustomChordsText] = useState("");
  const [shareCopied, setShareCopied]       = useState(false);
  const [loopsDone, setLoopsDone]           = useState(0);

  const [volumes, setVolumes] = useState({ drums: 80, bass: 70, rhythm: 50 });
  const [muted, setMuted]     = useState({ drums: false, bass: false, rhythm: false });

  const trackRef = useRef<BackingTrack | null>(null);
  const beatRef  = useRef<NodeJS.Timeout | null>(null);
  const lastChordIdxRef = useRef(-1);
  const loopsCompletedRef = useRef(0);
  const sessionHydratedRef = useRef(false);

  useEffect(() => { return () => { disposeBackingTrack(); }; }, []);

  useEffect(() => {
    if (!router.isReady || sessionHydratedRef.current) return;
    sessionHydratedRef.current = true;

    const saved = loadJamSession();
    if (saved) {
      if (KEYS.includes(saved.key)) setSelectedKey(saved.key);
      if (VALID_GENRES.has(saved.genre as Genre)) setSelectedGenre(saved.genre as Genre);
      if (saved.bpm >= 60 && saved.bpm <= 180) setBpm(saved.bpm);
      if (saved.preset >= 0 && saved.preset < PRESET_PROGRESSIONS.length) setSelectedPreset(saved.preset);
      if (saved.playbackSpeed) setPlaybackSpeed(saved.playbackSpeed);
      if (saved.loopLimit !== undefined) setLoopLimit(saved.loopLimit);
      if (saved.countIn !== undefined) setCountIn(saved.countIn);
      if (saved.customChords) setCustomChordsText(saved.customChords);
    }

    const { key, genre, bpm: bpmParam, preset, speed, loops, countin, chords } = router.query;
    if (typeof key === "string" && KEYS.includes(key)) setSelectedKey(key);
    if (typeof genre === "string" && VALID_GENRES.has(genre as Genre)) {
      setSelectedGenre(genre as Genre);
    }
    if (typeof bpmParam === "string") {
      const n = parseInt(bpmParam, 10);
      if (!Number.isNaN(n) && n >= 60 && n <= 180) setBpm(n);
    }
    if (typeof preset === "string") {
      const idx = parseInt(preset, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < PRESET_PROGRESSIONS.length) {
        setSelectedPreset(idx);
      }
    }
    if (typeof speed === "string") {
      const s = parseFloat(speed);
      if (PLAYBACK_SPEEDS.includes(s as typeof PLAYBACK_SPEEDS[number])) setPlaybackSpeed(s);
    }
    if (typeof loops === "string") {
      const n = parseInt(loops, 10);
      if (!Number.isNaN(n) && n >= 0) setLoopLimit(n);
    }
    if (countin === "1") setCountIn(true);
    if (typeof chords === "string") setCustomChordsText(chords);
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!studioMode || !practiceKey) return;
    if (KEYS.includes(practiceKey)) setSelectedKey(practiceKey);
  }, [studioMode, practiceKey]);

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

  const setJamKey = (key: string) => {
    setSelectedKey(key);
    onPracticeKeyChange?.(key);
  };

  const effectiveBpm = Math.round(bpm * playbackSpeed);

  const chords = useMemo(() => {
    const custom = customChordsText.trim();
    if (custom) {
      return custom.split(/[,→|/]+/).map(s => s.trim()).filter(Boolean);
    }
    return PRESET_PROGRESSIONS[selectedPreset].chords.map(c => transposeChord(c, "C", selectedKey));
  }, [customChordsText, selectedPreset, selectedKey]);

  const pentatonic = useMemo(() => pentatonicScaleNotes(selectedKey), [selectedKey]);
  const majorScale = useMemo(() => majorScaleNotes(selectedKey), [selectedKey]);

  const stopSession = useCallback(() => {
    if (trackRef.current) {
      try { trackRef.current.stop(); } catch { /* ignore */ }
      trackRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentChordIndex(-1);
    lastChordIdxRef.current = -1;
    loopsCompletedRef.current = 0;
    setLoopsDone(0);
  }, []);

  useEffect(() => {
    if (beatRef.current) clearInterval(beatRef.current);
    if (isPlaying) {
      beatRef.current = setInterval(
        () => setCurrentBeat(p => (p + 1) % 4),
        (60 / effectiveBpm) * 1000,
      );
    }
    return () => { if (beatRef.current) clearInterval(beatRef.current); };
  }, [isPlaying, effectiveBpm]);

  const handlePlay = async () => {
    if (isPlaying && trackRef.current) {
      stopSession();
      return;
    }
    if (!chords.length) return;

    if (countIn) {
      await playCountIn(effectiveBpm);
    }

    const track = await createBackingTrack({
      key: selectedKey,
      bpm: effectiveBpm,
      genre: selectedGenre,
      chordProgression: chords,
      measures: chords.length,
      onChordChange: (idx) => {
        setCurrentChordIndex(idx);
        const len = chords.length;
        if (loopLimit > 0 && lastChordIdxRef.current === len - 1 && idx === 0) {
          loopsCompletedRef.current += 1;
          setLoopsDone(loopsCompletedRef.current);
          if (loopsCompletedRef.current >= loopLimit) {
            stopSession();
            return;
          }
        }
        lastChordIdxRef.current = idx;
      },
    });
    trackRef.current = track;
    track.setVolume("drums",  muted.drums  ? 0 : volumes.drums);
    track.setVolume("bass",   muted.bass   ? 0 : volumes.bass);
    track.setVolume("rhythm", muted.rhythm ? 0 : volumes.rhythm);
    track.start();
    setIsPlaying(true);
    lastChordIdxRef.current = 0;
    loopsCompletedRef.current = 0;
    setLoopsDone(0);
  };

  const handleBpmChange = (v: number) => {
    setBpm(v);
    trackRef.current?.setBpm(Math.round(v * playbackSpeed));
  };

  const handlePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) trackRef.current?.setBpm(Math.round(bpm * speed));
  };

  const applySoloGuitarPreset = () => {
    setMuted({ drums: false, bass: false, rhythm: true });
    setVolumes({ drums: 88, bass: 78, rhythm: 45 });
    trackRef.current?.setVolume("drums", 88);
    trackRef.current?.setVolume("bass", 78);
    trackRef.current?.setVolume("rhythm", 0);
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
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleVolumeChange = (inst: "drums" | "bass" | "rhythm", v: number) => {
    setVolumes(p => ({ ...p, [inst]: v }));
    if (!muted[inst]) trackRef.current?.setVolume(inst, v);
  };

  const handleMute = (inst: "drums" | "bass" | "rhythm") => {
    const next = !muted[inst];
    setMuted(p => ({ ...p, [inst]: next }));
    trackRef.current?.setVolume(inst, next ? 0 : volumes[inst]);
  };

  const activeGenre = GENRES.find(g => g.id === selectedGenre)!;
  const bpmPercent  = ((bpm - 60) / (180 - 60)) * 100;

  // ── Shared sub-blocks ─────────────────────────────────────────────────────

  const GenreGrid = (
    <div className="flex gap-2 flex-wrap">
      {GENRES.map(g => {
        const active = g.id === selectedGenre;
        return (
          <button key={g.id} onClick={() => setSelectedGenre(g.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-Space-Grotesk font-bold text-[13px] transition-all active:scale-95"
            style={{
              background: active ? `${g.color}18` : "#131313",
              color: active ? g.color : "#52525b",
              border: active ? `1px solid ${g.color}40` : "1px solid rgba(255,255,255,0.05)",
              boxShadow: active ? `0 0 12px ${g.color}20` : "none",
            }}>
            <span style={{ color: active ? g.color : "#52525b" }}>{g.icon}</span>
            {g.name}
          </button>
        );
      })}
    </div>
  );

  const KeyBpmRow = (
    <div className="flex gap-4 items-end">
      {/* Key selector */}
      <div className="flex flex-col gap-2 min-w-[100px]">
        <label className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">KEY</label>
        <select value={selectedKey} onChange={e => setJamKey(e.target.value)}
          disabled={studioMode}
          className="bg-[#131313] border border-white/5 text-white font-Space-Grotesk font-bold text-[16px] rounded-xl px-4 py-3 focus:outline-none appearance-none cursor-pointer disabled:opacity-60"
          title={studioMode ? "Change key in Practice studio bar above" : undefined}
        >
          {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {/* BPM */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <label className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">TEMPO</label>
          <span className="font-Space-Grotesk font-bold text-[#1BD79E] text-[15px]">{bpm} BPM</span>
        </div>
        <input type="range" min="60" max="180" value={bpm}
          onChange={e => handleBpmChange(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #1BD79E 0%, #1BD79E ${bpmPercent}%, #1a1a1a ${bpmPercent}%, #1a1a1a 100%)` }}
        />
        <div className="flex justify-between font-Inter text-[10px] text-[#3f3f46]">
          <span>60</span><span>120</span><span>180</span>
        </div>
        {playbackSpeed !== 1 && (
          <p className="font-Inter text-[10px] text-[#52525b]">
            Playing at {effectiveBpm} BPM ({Math.round(playbackSpeed * 100)}% speed)
          </p>
        )}
      </div>
    </div>
  );

  const PracticeTools = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px] w-full sm:w-auto">Speed</span>
        {PLAYBACK_SPEEDS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => handlePlaybackSpeed(s)}
            className="px-3 py-1.5 rounded-lg font-Space-Grotesk font-bold text-[12px] transition-all"
            style={{
              background: playbackSpeed === s ? "rgba(27,215,158,0.15)" : "#131313",
              color: playbackSpeed === s ? "#1BD79E" : "#52525b",
              border: playbackSpeed === s ? "1px solid rgba(27,215,158,0.35)" : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {Math.round(s * 100)}%
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px] w-full sm:w-auto">Loop</span>
        {LOOP_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLoopLimit(opt.value)}
            className="px-3 py-1.5 rounded-lg font-Space-Grotesk font-bold text-[12px] transition-all"
            style={{
              background: loopLimit === opt.value ? "rgba(56,219,229,0.12)" : "#131313",
              color: loopLimit === opt.value ? "#38DBE5" : "#52525b",
              border: loopLimit === opt.value ? "1px solid rgba(56,219,229,0.35)" : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {opt.label}
          </button>
        ))}
        {isPlaying && loopLimit > 0 && (
          <span className="font-Inter text-[11px] text-[#52525b] ml-1">
            {loopsDone}/{loopLimit} loops
          </span>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={countIn}
          onChange={e => setCountIn(e.target.checked)}
          className="w-4 h-4 rounded accent-[#1BD79E]"
        />
        <span className="font-Manrope text-[13px] text-[#adaaaa]">4-beat count-in before playback</span>
      </label>

      <div className="flex flex-col gap-2">
        <label className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">
          Custom progression (optional)
        </label>
        <input
          type="text"
          value={customChordsText}
          onChange={e => setCustomChordsText(e.target.value)}
          placeholder="e.g. Am, F, C, G or Dm|G|C"
          className="bg-[#131313] border border-white/5 text-white font-Manrope text-[13px] rounded-xl px-4 py-3 focus:outline-none focus:border-[#1BD79E]/40 placeholder:text-[#3f3f46]"
        />
        {customChordsText.trim() && (
          <p className="font-Inter text-[10px] text-[#52525b]">Preset picker ignored while custom chords are set.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131313] p-4 flex flex-col gap-2">
        <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">Scale hints ({selectedKey})</p>
        <p className="font-Manrope text-[12px] text-[#adaaaa]">
          <span className="text-[#1BD79E] font-semibold">Pentatonic:</span> {pentatonic.join(" · ")}
        </p>
        <p className="font-Manrope text-[12px] text-[#52525b]">
          <span className="text-white/70 font-semibold">Major:</span> {majorScale.join(" · ")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {onOpenScales && (
          <button
            type="button"
            onClick={onOpenScales}
            className="px-4 py-2.5 rounded-xl font-Space-Grotesk font-bold text-[12px] text-[#38DBE5] bg-[#131313] border border-[#38DBE5]/30 hover:border-[#38DBE5]/50 transition-all"
          >
            Open scale fretboard
          </button>
        )}
        {onSuggestScale && (
          <button
            type="button"
            onClick={() => onSuggestScale(selectedGenre)}
            className="px-4 py-2.5 rounded-xl font-Space-Grotesk font-bold text-[12px] text-white bg-[#131313] border border-white/10 hover:border-[#1BD79E]/40 transition-all"
          >
            Suggested scale for {selectedGenre}
          </button>
        )}
        <button
          type="button"
          onClick={applySoloGuitarPreset}
          className="px-4 py-2.5 rounded-xl font-Space-Grotesk font-bold text-[12px] text-white bg-[#131313] border border-white/10 hover:border-[#8b5cf6]/40 transition-all"
        >
          Solo guitar preset
        </button>
        <button
          type="button"
          onClick={copyShareLink}
          className="px-4 py-2.5 rounded-xl font-Space-Grotesk font-bold text-[12px] transition-all"
          style={{
            background: shareCopied ? "rgba(27,215,158,0.2)" : "#131313",
            color: shareCopied ? "#1BD79E" : "white",
            border: shareCopied ? "1px solid rgba(27,215,158,0.4)" : "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {shareCopied ? "Link copied!" : "Copy share link"}
        </button>
      </div>
    </div>
  );

  const ProgressionPicker = (
    <div className="grid grid-cols-2 gap-2">
      {PRESET_PROGRESSIONS.map((prog, idx) => {
        const preview = prog.chords.slice(0, 4).map(c => transposeChord(c, "C", selectedKey));
        const active  = selectedPreset === idx;
        return (
          <button key={idx} onClick={() => { setSelectedPreset(idx); setCustomChordsText(""); }}
            className="flex flex-col gap-1 p-3.5 rounded-xl text-left transition-all active:scale-95"
            style={{
              background: active ? "rgba(27,215,158,0.08)" : "#131313",
              border: active ? "1px solid rgba(27,215,158,0.3)" : "1px solid rgba(255,255,255,0.05)",
            }}>
            <div className="flex items-center justify-between">
              <span className="font-Space-Grotesk font-bold text-[13px]"
                style={{ color: active ? "#1BD79E" : "white" }}>
                {prog.name}
              </span>
              <span className="font-Inter text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: active ? "rgba(27,215,158,0.15)" : "#1a1a1a",
                  color: active ? "#1BD79E" : "#52525b",
                }}>
                {prog.label}
              </span>
            </div>
            <span className="font-Manrope text-[11px] text-[#52525b]">
              {preview.join(" → ")}{prog.chords.length > 4 ? " …" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );

  const ActiveChordDisplay = (
    <div className="flex flex-col items-center gap-6">
      {/* Big active chord */}
      <div className="relative flex items-center justify-center w-36 h-36 rounded-full"
        style={{ background: isPlaying ? "rgba(27,215,158,0.05)" : "#0b0b0b", border: isPlaying ? "1px solid rgba(27,215,158,0.2)" : "1px solid #1a1a1a" }}>
        <span className="font-Space-Grotesk font-bold transition-all duration-300 leading-none"
          style={{
            fontSize: isPlaying && currentChordIndex >= 0 ? (chords[currentChordIndex]?.length > 2 ? 36 : 48) : 32,
            color: isPlaying && currentChordIndex >= 0 ? "#1BD79E" : "#2a2a2a",
            filter: isPlaying && currentChordIndex >= 0 ? "drop-shadow(0 0 16px rgba(27,215,158,0.5))" : "none",
          }}>
          {isPlaying && currentChordIndex >= 0 ? chords[currentChordIndex] : "—"}
        </span>
        {isPlaying && (
          <div className="absolute -inset-1 rounded-full border border-[#1BD79E]/20 animate-ping" />
        )}
      </div>

      {/* Beat dots */}
      <div className="flex items-center gap-3">
        {[0,1,2,3].map(b => (
          <div key={b} className="w-2.5 h-2.5 rounded-full transition-all duration-75"
            style={{
              background: isPlaying && currentBeat === b ? "#1BD79E" : "#1a1a1a",
              transform: isPlaying && currentBeat === b ? "scale(1.5)" : "scale(1)",
              boxShadow: isPlaying && currentBeat === b ? "0 0 8px #1BD79E" : "none",
            }} />
        ))}
      </div>

      {/* Progression bar */}
      <div className="flex items-center gap-2 flex-wrap justify-center max-w-xs">
        {chords.map((chord, idx) => {
          const active = isPlaying && currentChordIndex === idx;
          return (
            <div key={idx}
              className="px-3 py-1.5 rounded-xl font-Space-Grotesk font-bold text-[14px] transition-all duration-150"
              style={{
                background: active ? "#1BD79E" : "#131313",
                color: active ? "black" : "#52525b",
                border: active ? "none" : "1px solid rgba(255,255,255,0.05)",
                transform: active ? "scale(1.1)" : "scale(1)",
                boxShadow: active ? "0 0 12px rgba(27,215,158,0.4)" : "none",
              }}>
              {chord}
            </div>
          );
        })}
      </div>
    </div>
  );

  const PlayButton = (
    <button onClick={handlePlay}
      className="w-full py-4 rounded-2xl font-Space-Grotesk font-bold text-[16px] transition-all active:scale-98 hover:scale-[1.02] flex items-center justify-center gap-3"
      style={{
        background: isPlaying ? "rgba(239,68,68,0.12)" : "linear-gradient(135deg, #1BD79E 0%, #15c48e 100%)",
        color: isPlaying ? "#ef4444" : "black",
        border: isPlaying ? "1px solid rgba(239,68,68,0.3)" : "none",
        boxShadow: isPlaying ? "none" : "0 4px 24px rgba(27,215,158,0.3)",
      }}>
      {isPlaying ? (
        <>
          <span className="w-3 h-3 rounded-sm bg-red-400" />
          Stop Session
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start Jam Session
        </>
      )}
    </button>
  );

  const Mixer = (
    <div className="flex flex-col gap-3">
      {INSTRUMENTS.map(({ key, label, color, icon }) => {
        const vol  = volumes[key];
        const isMuted = muted[key];
        const pct  = vol;
        return (
          <div key={key} className="flex items-center gap-4 bg-[#0b0b0b] border border-[#1a1a1a] rounded-2xl px-5 py-4">
            {/* Mute button */}
            <button onClick={() => handleMute(key)}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
              style={{
                background: isMuted ? "rgba(239,68,68,0.12)" : `${color}18`,
                color: isMuted ? "#ef4444" : color,
                border: isMuted ? "1px solid rgba(239,68,68,0.3)" : `1px solid ${color}30`,
              }}>
              {icon}
            </button>

            {/* Label */}
            <span className="font-Manrope font-semibold text-[13px] w-12 shrink-0"
              style={{ color: isMuted ? "#3f3f46" : "white" }}>
              {label}
            </span>

            {/* Volume slider */}
            <div className="flex-1 flex flex-col gap-1">
              <input type="range" min="0" max="100" value={vol}
                onChange={e => handleVolumeChange(key, parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: isMuted
                    ? "#1a1a1a"
                    : `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #1a1a1a ${pct}%, #1a1a1a 100%)`,
                }}
              />
            </div>

            {/* Volume number */}
            <span className="font-Inter text-[11px] w-8 text-right shrink-0"
              style={{ color: isMuted ? "#3f3f46" : "#52525b" }}>
              {isMuted ? "M" : `${vol}`}
            </span>
          </div>
        );
      })}
    </div>
  );

  // ── MOBILE VIEW ───────────────────────────────────────────────────────────

  const MobileView = (
    <div className="max-w-[430px] mx-auto px-5 py-5 flex flex-col gap-5">

      {/* Genre */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-0.5" style={{ background: activeGenre.color }} />
          <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">GENRE</p>
        </div>
        {GenreGrid}
        <p className="font-Manrope text-[12px] text-[#52525b] px-1">{activeGenre.description}</p>
      </div>

      {/* Key + BPM */}
      <div className="bg-[#0b0b0b] rounded-2xl border border-[#1a1a1a] p-5 flex flex-col gap-5">
        {KeyBpmRow}
        {PracticeTools}
      </div>

      {/* Active chord + play */}
      <div className="bg-[#0b0b0b] rounded-2xl border border-[#1a1a1a] p-6 flex flex-col items-center gap-4">
        {ActiveChordDisplay}
        {PlayButton}
      </div>

      {/* Progression picker */}
      <div className="flex flex-col gap-3">
        <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">CHORD PROGRESSION</p>
        {ProgressionPicker}
      </div>

      {/* Mixer */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-0.5 bg-[#1BD79E]" />
          <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">MIXER</p>
        </div>
        {Mixer}
      </div>

      {/* Tip */}
      <div className="rounded-2xl p-4 border border-white/5 flex items-start gap-3"
        style={{ background: "rgba(27,215,158,0.03)" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>
        <p className="font-Manrope text-[12px] text-[#52525b] leading-relaxed">
          Practice your chord changes to the backing track. Start slow and increase BPM as you get comfortable.
        </p>
      </div>
    </div>
  );

  // ── DESKTOP VIEW ──────────────────────────────────────────────────────────

  const DesktopView = (
    <div className="px-8 pt-6 pb-16">

      {/* Hero */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-Space-Grotesk font-bold text-[64px] leading-none tracking-[-2px] text-white">
            {studioMode ? "Backing track" : "Jam Session"}
          </h2>
          <p className="font-Inter text-[#adaaaa] text-[13px] tracking-[1.4px] uppercase mt-2">
            {studioMode ? "PART OF PRACTICE STUDIO" : "AI BACKING TRACKS FOR GUITAR PRACTICE"}
          </p>
        </div>
        {PlayButton}
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* ── LEFT col (5) ── session setup */}
        <div className="col-span-5 flex flex-col gap-6">

          {/* Genre card */}
          <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5" style={{ background: activeGenre.color }} />
                <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">Genre</h3>
              </div>
              <span className="font-Manrope text-[12px] text-[#52525b]">{activeGenre.description}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GENRES.map(g => {
                const active = g.id === selectedGenre;
                return (
                  <button key={g.id} onClick={() => setSelectedGenre(g.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95"
                    style={{
                      background: active ? `${g.color}12` : "#131313",
                      border: active ? `1px solid ${g.color}40` : "1px solid rgba(255,255,255,0.05)",
                    }}>
                    <span style={{ color: active ? g.color : "#52525b" }}>{g.icon}</span>
                    <div className="text-left">
                      <p className="font-Space-Grotesk font-bold text-[13px]" style={{ color: active ? g.color : "white" }}>{g.name}</p>
                      <p className="font-Inter text-[10px] text-[#3f3f46] truncate">{g.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key + BPM card */}
          <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-[#38DBE5]" />
              <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">Session Settings</h3>
            </div>
            {KeyBpmRow}
            {PracticeTools}
          </div>

          {/* Mixer card */}
          <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-[#8b5cf6]" />
              <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">Mixer</h3>
              <span className="font-Inter text-[10px] text-[#3f3f46] ml-auto">Tap icon to mute</span>
            </div>
            {Mixer}
          </div>
        </div>

        {/* ── RIGHT col (7) ── chord + play */}
        <div className="col-span-7 flex flex-col gap-6">

          {/* Active chord visualizer */}
          <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-8 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 self-start">
              <div className="w-5 h-0.5 bg-[#1BD79E]" />
              <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">
                {isPlaying ? "Now Playing" : "Ready to Jam"}
              </h3>
              {isPlaying && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1BD79E] animate-pulse" />
                  <span className="font-Inter text-[11px] text-[#1BD79E]">LIVE</span>
                </div>
              )}
            </div>

            {/* Large chord + beat */}
            <div className="flex items-center gap-16">
              {/* Left info */}
              <div className="flex flex-col gap-2 min-w-[80px]">
                <div className="flex flex-col">
                  <span className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">KEY</span>
                  <span className="font-Space-Grotesk font-bold text-white text-[28px]">{selectedKey}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">BPM</span>
                  <span className="font-Space-Grotesk font-bold text-white text-[28px]">
                    {isPlaying ? effectiveBpm : bpm}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">GENRE</span>
                  <span className="font-Space-Grotesk font-bold text-[14px]" style={{ color: activeGenre.color }}>{activeGenre.name}</span>
                </div>
              </div>

              {/* Big chord */}
              <div className="relative flex items-center justify-center w-44 h-44 rounded-full shrink-0"
                style={{
                  background: isPlaying ? "rgba(27,215,158,0.05)" : "#0b0b0b",
                  border: isPlaying ? "1px solid rgba(27,215,158,0.2)" : "1px solid #1a1a1a",
                }}>
                <span className="font-Space-Grotesk font-bold leading-none transition-all duration-300"
                  style={{
                    fontSize: isPlaying && currentChordIndex >= 0 ? (chords[currentChordIndex]?.length > 2 ? 42 : 56) : 36,
                    color: isPlaying && currentChordIndex >= 0 ? "#1BD79E" : "#2a2a2a",
                    filter: isPlaying && currentChordIndex >= 0 ? "drop-shadow(0 0 20px rgba(27,215,158,0.6))" : "none",
                  }}>
                  {isPlaying && currentChordIndex >= 0 ? chords[currentChordIndex] : "—"}
                </span>
                {isPlaying && (
                  <>
                    <div className="absolute -inset-2 rounded-full border border-[#1BD79E]/10 animate-ping" />
                    <div className="absolute -inset-5 rounded-full border border-[#1BD79E]/5" />
                  </>
                )}
              </div>

              {/* Beat dots */}
              <div className="flex flex-col gap-4">
                {[0,1,2,3].map(b => (
                  <div key={b} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full transition-all duration-75"
                      style={{
                        background: isPlaying && currentBeat === b ? "#1BD79E" : "#1a1a1a",
                        transform: isPlaying && currentBeat === b ? "scale(1.6)" : "scale(1)",
                        boxShadow: isPlaying && currentBeat === b ? "0 0 10px #1BD79E" : "none",
                      }} />
                    <span className="font-Inter text-[10px] text-[#2a2a2a]">{b + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progression bar */}
            <div className="w-full flex items-center gap-2 flex-wrap">
              {chords.map((chord, idx) => {
                const active = isPlaying && currentChordIndex === idx;
                return (
                  <div key={idx}
                    className="flex-1 min-w-[48px] py-3 rounded-xl font-Space-Grotesk font-bold text-[16px] text-center transition-all duration-150"
                    style={{
                      background: active ? "#1BD79E" : "#131313",
                      color: active ? "black" : "#52525b",
                      border: active ? "none" : "1px solid rgba(255,255,255,0.05)",
                      transform: active ? "scale(1.05)" : "scale(1)",
                      boxShadow: active ? "0 0 16px rgba(27,215,158,0.4)" : "none",
                    }}>
                    {chord}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progression picker */}
          <div className="bg-[#0b0b0b] rounded-3xl border border-[#1a1a1a] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-[#f59e0b]" />
              <h3 className="font-Space-Grotesk font-bold text-white text-[15px]">Chord Progression</h3>
            </div>
            {ProgressionPicker}
          </div>

          {/* Tips */}
          <div className="rounded-3xl p-6 border border-white/5 grid grid-cols-2 gap-4"
            style={{ background: "rgba(27,215,158,0.03)" }}>
            {[
              ["Follow the chord names", "The highlighted chord in the bar shows what to play next."],
              ["Match the genre feel", "Rock = full strums, Jazz = arpeggios, Blues = bends."],
              ["Use the mixer", "Mute rhythm to play it yourself, or mute bass to focus on it."],
              ["Increase BPM gradually", "Start at 70-80% of target speed, then build up."],
            ].map(([title, desc]) => (
              <div key={title} className="flex flex-col gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1BD79E]" />
                <p className="font-Manrope font-semibold text-[13px] text-white">{title}</p>
                <p className="font-Manrope text-[12px] text-[#52525b] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
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
