import React, { useState, useEffect, useCallback } from "react";
import * as Tone from "tone";

// ── Data ──────────────────────────────────────────────────────────────────────

const INTERVALS = [
  { name: "Minor 2nd",   semitones: 1,  short: "m2", hint: "Jaws theme" },
  { name: "Major 2nd",   semitones: 2,  short: "M2", hint: "Happy Birthday" },
  { name: "Minor 3rd",   semitones: 3,  short: "m3", hint: "Smoke on the Water" },
  { name: "Major 3rd",   semitones: 4,  short: "M3", hint: "Oh When The Saints" },
  { name: "Perfect 4th", semitones: 5,  short: "P4", hint: "Wedding March" },
  { name: "Tritone",     semitones: 6,  short: "TT", hint: "The Simpsons" },
  { name: "Perfect 5th", semitones: 7,  short: "P5", hint: "Star Wars" },
  { name: "Minor 6th",   semitones: 8,  short: "m6", hint: "The Entertainer" },
  { name: "Major 6th",   semitones: 9,  short: "M6", hint: "My Bonnie" },
  { name: "Minor 7th",   semitones: 10, short: "m7", hint: "Somewhere" },
  { name: "Major 7th",   semitones: 11, short: "M7", hint: "Take On Me" },
  { name: "Octave",      semitones: 12, short: "P8", hint: "Over the Rainbow" },
];

const CHORD_TYPES = [
  { name: "Major",       intervals: [0, 4, 7],        symbol: "",    mood: "Happy, bright" },
  { name: "Minor",       intervals: [0, 3, 7],        symbol: "m",   mood: "Sad, dark" },
  { name: "Diminished",  intervals: [0, 3, 6],        symbol: "dim", mood: "Tense, scary" },
  { name: "Augmented",   intervals: [0, 4, 8],        symbol: "aug", mood: "Dreamy, unresolved" },
  { name: "Major 7th",   intervals: [0, 4, 7, 11],   symbol: "maj7",mood: "Jazzy, sophisticated" },
  { name: "Minor 7th",   intervals: [0, 3, 7, 10],   symbol: "m7",  mood: "Smooth, mellow" },
  { name: "Dominant 7th",intervals: [0, 4, 7, 10],   symbol: "7",   mood: "Bluesy, tense" },
];

const SCALE_TYPES = [
  { name: "Major",           intervals: [0,2,4,5,7,9,11,12],   short: "Major",   mood: "Happy, bright" },
  { name: "Natural Minor",   intervals: [0,2,3,5,7,8,10,12],   short: "Nat Min", mood: "Sad, dark" },
  { name: "Minor Pentatonic",intervals: [0,3,5,7,10,12],        short: "m Pent",  mood: "Bluesy, rock" },
  { name: "Major Pentatonic",intervals: [0,2,4,7,9,12],         short: "M Pent",  mood: "Country, folk" },
  { name: "Blues",           intervals: [0,3,5,6,7,10,12],      short: "Blues",   mood: "Soulful, gritty" },
  { name: "Dorian",          intervals: [0,2,3,5,7,9,10,12],    short: "Dorian",  mood: "Jazzy minor" },
  { name: "Mixolydian",      intervals: [0,2,4,5,7,9,10,12],    short: "Mixo",    mood: "Bluesy major" },
  { name: "Harmonic Minor",  intervals: [0,2,3,5,7,8,11,12],    short: "H Min",   mood: "Exotic, tense" },
];

const DIFFICULTY_LEVELS = {
  beginner:     { intervals: [2,4,5,7],       chords: [0,1],       scales: [0,1] },
  intermediate: { intervals: [1,2,3,4,5,7,12],chords: [0,1,2,3],   scales: [0,1,2,3,4] },
  advanced:     { intervals: [1,2,3,4,5,6,7,8,9,10,11,12], chords: [0,1,2,3,4,5,6], scales: [0,1,2,3,4,5,6,7] },
};

type Mode = "intervals" | "chords" | "scales";
type Difficulty = "beginner" | "intermediate" | "advanced";

// ── Mode meta ─────────────────────────────────────────────────────────────────

const MODE_META: Record<Mode, { label: string; tagline: string }> = {
  intervals: { label: "Intervals",  tagline: "Identify the gap between two notes" },
  chords:    { label: "Chords",     tagline: "Recognize chord quality by sound" },
  scales:    { label: "Scales",     tagline: "Name the scale from ascending notes" },
};

const DIFF_COLOR: Record<Difficulty, string> = {
  beginner:     "#aeffd4",
  intermediate: "#82e9ff",
  advanced:     "#f59e0b",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

function RepeatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EarTraining() {
  const [mode, setMode]                 = useState<Mode>("intervals");
  const [difficulty, setDifficulty]     = useState<Difficulty>("beginner");
  const [currentQuestion, setCurrentQ]  = useState<number | null>(null);
  const [selectedAnswer, setSelected]   = useState<number | null>(null);
  const [isCorrect, setIsCorrect]       = useState<boolean | null>(null);
  const [score, setScore]               = useState({ correct: 0, total: 0 });
  const [streak, setStreak]             = useState(0);
  const [bestStreak, setBestStreak]     = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [rootNote, setRootNote]         = useState(60);
  const [sampler, setSampler]           = useState<Tone.Sampler | null>(null);
  const [showAnswer, setShowAnswer]     = useState(false);
  const [sessionStarted, setStarted]    = useState(false);

  useEffect(() => {
    const s = new Tone.Sampler({
      urls: { A2:"A2.mp3", A3:"A3.mp3", A4:"A4.mp3", C3:"C3.mp3", C4:"C4.mp3", C5:"C5.mp3", E3:"E3.mp3", E4:"E4.mp3", G3:"G3.mp3", G4:"G4.mp3" },
      baseUrl: "/guitar-acoustic/",
      onload: () => setSampler(s),
    }).toDestination();
    return () => { s.dispose(); };
  }, []);

  const getIntervalOptions = useCallback(
    () => DIFFICULTY_LEVELS[difficulty].intervals.map(st => INTERVALS.find(i => i.semitones === st)!),
    [difficulty]
  );
  const getChordOptions = useCallback(
    () => DIFFICULTY_LEVELS[difficulty].chords.map(i => CHORD_TYPES[i]),
    [difficulty]
  );
  const getScaleOptions = useCallback(
    () => DIFFICULTY_LEVELS[difficulty].scales.map(i => SCALE_TYPES[i]),
    [difficulty]
  );

  const generateQuestion = useCallback(() => {
    const newRoot = Math.floor(Math.random() * 12) + 48;
    setRootNote(newRoot);
    if (mode === "intervals") {
      const opts = getIntervalOptions();
      setCurrentQ(opts[Math.floor(Math.random() * opts.length)].semitones);
    } else if (mode === "chords") {
      const opts = getChordOptions();
      setCurrentQ(Math.floor(Math.random() * opts.length));
    } else {
      const opts = getScaleOptions();
      setCurrentQ(Math.floor(Math.random() * opts.length));
    }
    setSelected(null); setIsCorrect(null); setShowAnswer(false);
  }, [getIntervalOptions, getChordOptions, getScaleOptions, mode]);

  const playInterval = async () => {
    if (!sampler || currentQuestion === null || isPlaying) return;
    await Tone.start(); setIsPlaying(true);
    const now = Tone.now();
    sampler.triggerAttackRelease(Tone.Frequency(rootNote, "midi").toFrequency(), "2n", now);
    sampler.triggerAttackRelease(Tone.Frequency(rootNote + currentQuestion, "midi").toFrequency(), "2n", now + 0.8);
    setTimeout(() => setIsPlaying(false), 1600);
  };

  const playChord = async () => {
    if (!sampler || currentQuestion === null || isPlaying) return;
    await Tone.start(); setIsPlaying(true);
    const chord = CHORD_TYPES[currentQuestion];
    const now = Tone.now();
    chord.intervals.forEach((interval, idx) => {
      sampler.triggerAttackRelease(Tone.Frequency(rootNote + interval, "midi").toFrequency(), "2n", now + idx * 0.05);
    });
    setTimeout(() => setIsPlaying(false), 1500);
  };

  const playScale = async () => {
    if (!sampler || currentQuestion === null || isPlaying) return;
    await Tone.start(); setIsPlaying(true);
    const scale = SCALE_TYPES[currentQuestion];
    const now = Tone.now();
    scale.intervals.forEach((interval, idx) => {
      sampler.triggerAttackRelease(Tone.Frequency(rootNote + interval, "midi").toFrequency(), "8n", now + idx * 0.3);
    });
    setTimeout(() => setIsPlaying(false), scale.intervals.length * 300 + 500);
  };

  const playQuestion = () => {
    if (mode === "intervals") playInterval();
    else if (mode === "chords") playChord();
    else playScale();
  };

  const checkAnswer = (answerIndex: number) => {
    if (isCorrect !== null) return;
    setSelected(answerIndex);
    let correct = false;
    if (mode === "intervals") {
      correct = getIntervalOptions()[answerIndex].semitones === currentQuestion;
    } else {
      correct = answerIndex === currentQuestion;
    }
    setIsCorrect(correct); setShowAnswer(true);
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    if (correct) {
      setStreak(prev => { const n = prev + 1; if (n > bestStreak) setBestStreak(n); return n; });
    } else {
      setStreak(0);
    }
  };

  const startSession = () => {
    setScore({ correct: 0, total: 0 }); setStreak(0); setStarted(true);
    generateQuestion();
  };

  const resetSession = () => {
    setStarted(false); setCurrentQ(null); setScore({ correct: 0, total: 0 });
    setStreak(0); setBestStreak(0);
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const optionCount = mode === "intervals"
    ? getIntervalOptions().length
    : mode === "chords" ? getChordOptions().length
    : getScaleOptions().length;

  // ── ANSWER BUTTON STATE ─────────────────────────────────────────────────────

  const getOptionState = (idx: number, isCorrectIdx: boolean): "default" | "correct" | "wrong" | "highlight" => {
    if (!showAnswer && selectedAnswer === idx) return "highlight";
    if (showAnswer && isCorrectIdx) return "correct";
    if (showAnswer && selectedAnswer === idx && !isCorrect) return "wrong";
    return "default";
  };

  const optionStyle = (state: ReturnType<typeof getOptionState>) => {
    const base = "flex flex-col items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer";
    if (state === "correct")   return `${base} bg-[rgba(174,255,212,0.1)] border-[#aeffd4]`;
    if (state === "wrong")     return `${base} bg-[rgba(239,68,68,0.1)] border-red-500`;
    if (state === "highlight") return `${base} bg-[rgba(130,233,255,0.1)] border-[#82e9ff]`;
    return `${base} bg-[#131313] border-white/5 hover:border-white/20`;
  };

  const optionLabelColor = (state: ReturnType<typeof getOptionState>) => {
    if (state === "correct") return "text-[#aeffd4]";
    if (state === "wrong")   return "text-red-400";
    if (state === "highlight") return "text-[#82e9ff]";
    return "text-white";
  };

  // ── SHARED OPTION RENDERERS ──────────────────────────────────────────────────

  const renderOptions = () => {
    if (mode === "intervals") {
      return getIntervalOptions().map((opt, idx) => {
        const state = getOptionState(idx, opt.semitones === currentQuestion);
        return (
          <button key={idx} onClick={() => checkAnswer(idx)} disabled={showAnswer}
            className={optionStyle(state)}>
            <span className={`font-Space-Grotesk font-bold text-[22px] leading-tight ${optionLabelColor(state)}`}>{opt.short}</span>
            <div>
              <p className="font-Manrope text-[13px] text-[#adaaaa]">{opt.name}</p>
              <p className="font-Inter text-[11px] text-[#555]">{opt.hint}</p>
            </div>
          </button>
        );
      });
    }
    if (mode === "chords") {
      return getChordOptions().map((opt, idx) => {
        const state = getOptionState(idx, idx === currentQuestion);
        return (
          <button key={idx} onClick={() => checkAnswer(idx)} disabled={showAnswer}
            className={optionStyle(state)}>
            <span className={`font-Space-Grotesk font-bold text-[22px] leading-tight ${optionLabelColor(state)}`}>{opt.symbol || "maj"}</span>
            <div>
              <p className="font-Manrope text-[13px] text-[#adaaaa]">{opt.name}</p>
              <p className="font-Inter text-[11px] text-[#555]">{opt.mood}</p>
            </div>
          </button>
        );
      });
    }
    return getScaleOptions().map((opt, idx) => {
      const state = getOptionState(idx, idx === currentQuestion);
      return (
        <button key={idx} onClick={() => checkAnswer(idx)} disabled={showAnswer}
          className={optionStyle(state)}>
          <span className={`font-Space-Grotesk font-bold text-[18px] leading-tight ${optionLabelColor(state)}`}>{opt.short}</span>
          <div>
            <p className="font-Manrope text-[13px] text-[#adaaaa]">{opt.name}</p>
            <p className="font-Inter text-[11px] text-[#555]">{opt.mood}</p>
          </div>
        </button>
      );
    });
  };

  // ── TIPS ────────────────────────────────────────────────────────────────────

  const TIPS: Record<Mode, { label: string; desc: string }[]> = {
    intervals: [
      { label: "Minor 2nd", desc: "Jaws theme — tense, chromatic" },
      { label: "Major 3rd", desc: "Oh When The Saints — bright leap" },
      { label: "Perfect 4th", desc: "Wedding March — noble, stable" },
      { label: "Perfect 5th", desc: "Star Wars — heroic, open" },
      { label: "Octave", desc: "Over the Rainbow — wide, soaring" },
    ],
    chords: [
      { label: "Major", desc: "Happy, bright, resolved" },
      { label: "Minor", desc: "Sad, dark, melancholic" },
      { label: "Diminished", desc: "Tense, unstable, scary" },
      { label: "Augmented", desc: "Dreamy, mysterious, unresolved" },
      { label: "7th chords", desc: "Jazzy, rich — the extra note floats" },
    ],
    scales: [
      { label: "Major", desc: "Do Re Mi — happy, uplifting" },
      { label: "Natural Minor", desc: "Sad, emotional, dark" },
      { label: "Minor Pentatonic", desc: "Blues/rock — 5-note powerhouse" },
      { label: "Blues", desc: "b5 blue note adds grit" },
      { label: "Dorian", desc: "Minor but with a raised 6th — jazzy" },
    ],
  };

  // ── STATS CARDS ─────────────────────────────────────────────────────────────

  const StatsRow = () => (
    <div className="grid grid-cols-4 gap-3">
      {[
        { val: score.correct, label: "Correct", color: "#aeffd4" },
        { val: score.total,   label: "Total",   color: "white" },
        { val: `${accuracy}%`,label: "Accuracy",color: "#aeffd4" },
        { val: streak,        label: "Streak",  color: "#f59e0b" },
      ].map(({ val, label, color }) => (
        <div key={label} className="bg-[#131313] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-1">
          <span className="font-Space-Grotesk font-bold text-[22px]" style={{ color }}>{val}</span>
          <span className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );

  // ── PLAY BUTTON ──────────────────────────────────────────────────────────────

  const PlayButton = ({ large = false }: { large?: boolean }) => (
    <div className={`flex items-center gap-4 ${large ? "justify-center" : ""}`}>
      <button
        onClick={playQuestion}
        disabled={isPlaying || currentQuestion === null}
        className={`flex items-center justify-center rounded-full transition-all ${large ? "w-20 h-20" : "w-14 h-14"}`}
        style={{
          background: isPlaying ? "rgba(174,255,212,0.15)" : "linear-gradient(135deg,#aeffd4 0%,#10feb0 100%)",
          color: isPlaying ? "#10feb0" : "#005c3d",
          boxShadow: isPlaying ? "0 0 24px rgba(16,254,176,0.3)" : "none",
        }}
      >
        {isPlaying ? (
          <span className="w-3 h-3 rounded-full bg-[#10feb0] animate-ping" />
        ) : (
          <PlayIcon size={large ? 28 : 20} />
        )}
      </button>
      <button
        onClick={playQuestion}
        disabled={isPlaying || currentQuestion === null}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1a1a1a] border border-white/10 text-[#adaaaa] hover:text-white transition-colors"
      >
        <RepeatIcon />
      </button>
      {isPlaying && <span className="font-Inter text-[13px] text-[#10feb0]">Playing…</span>}
    </div>
  );

  // ── SESSION SETUP CARD ───────────────────────────────────────────────────────

  const SetupCard = (
    <div className="bg-[#131313] rounded-2xl p-8 flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="font-Inter text-[11px] text-[#adaaaa] tracking-[2px] uppercase mb-1">CURRENT SESSION</p>
        <h3 className="font-Space-Grotesk font-bold text-[32px] leading-tight text-white">
          {MODE_META[mode].label} Training
        </h3>
        <p className="font-Manrope text-[14px] text-[#adaaaa] mt-1">{MODE_META[mode].tagline}</p>
      </div>

      {/* Settings rows */}
      <div className="flex flex-col gap-0 border border-white/5 rounded-xl overflow-hidden">
        {[
          { label: "Mode",       val: MODE_META[mode].label },
          { label: "Difficulty", val: difficulty.charAt(0).toUpperCase() + difficulty.slice(1) },
          { label: "Options",    val: `${optionCount} choices` },
        ].map(({ label, val }, i) => (
          <div key={i} className={`flex items-center justify-between px-5 py-4 ${i < 2 ? "border-b border-white/5" : ""}`}>
            <span className="font-Manrope text-[13px] text-[#adaaaa]">{label}</span>
            <span className="font-Space-Grotesk font-bold text-[14px] text-white">{val}</span>
          </div>
        ))}
      </div>

      {/* Start CTA */}
      <button
        onClick={startSession}
        disabled={!sampler}
        className="w-full py-5 rounded-full font-Space-Grotesk font-bold text-[17px] transition-all"
        style={{
          background: sampler ? "linear-gradient(135deg,#aeffd4 0%,#10feb0 100%)" : "rgba(174,255,212,0.1)",
          color: sampler ? "#005c3d" : "#555",
        }}
      >
        {sampler ? "Start Session" : "Loading sounds…"}
      </button>
    </div>
  );

  // ── ACTIVE QUESTION CARD ─────────────────────────────────────────────────────

  const QuestionCard = currentQuestion !== null ? (
    <div className="flex flex-col gap-5">
      {/* Play area */}
      <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-4">
        <p className="font-Inter text-[11px] text-[#adaaaa] tracking-[2px] uppercase">LISTEN CAREFULLY</p>
        <PlayButton />
      </div>

      {/* Options grid */}
      <div className={`grid gap-3 ${optionCount <= 4 ? "grid-cols-2" : optionCount <= 6 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-3"}`}>
        {renderOptions()}
      </div>

      {/* Result + Next */}
      {showAnswer && (
        <div className={`flex items-center justify-between p-5 rounded-2xl border ${isCorrect ? "bg-[rgba(174,255,212,0.08)] border-[#aeffd4]/30" : "bg-[rgba(239,68,68,0.08)] border-red-500/30"}`}>
          <div className="flex items-center gap-3">
            <span className={`font-Space-Grotesk font-bold text-[20px] ${isCorrect ? "text-[#aeffd4]" : "text-red-400"}`}>
              {isCorrect ? "Correct" : "Wrong"}
            </span>
            {isCorrect && streak > 1 && (
              <span className="font-Inter text-[12px] text-[#f59e0b]">{streak} streak</span>
            )}
          </div>
          <button
            onClick={generateQuestion}
            className="px-6 py-3 rounded-full font-Space-Grotesk font-bold text-[14px] bg-[#1a1a1a] border border-white/10 text-white hover:border-white/30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  ) : null;

  // ── MODE TABS ────────────────────────────────────────────────────────────────

  const ModeTabs = (
    <div className="flex gap-1 bg-[#131313] rounded-full p-1">
      {(["intervals","chords","scales"] as Mode[]).map(m => (
        <button key={m}
          onClick={() => { setMode(m); setCurrentQ(null); setStarted(false); }}
          className="flex-1 py-2.5 px-4 rounded-full font-Space-Grotesk font-bold text-[13px] transition-all"
          style={{
            background: mode === m ? "#1a1a1a" : "transparent",
            color: mode === m ? "white" : "#71717a",
            boxShadow: mode === m ? "0 0 0 1px rgba(255,255,255,0.1)" : "none",
          }}>
          {MODE_META[m].label}
        </button>
      ))}
    </div>
  );

  // ── DIFFICULTY TABS ──────────────────────────────────────────────────────────

  const DifficultyTabs = (
    <div className="flex items-center gap-2 flex-wrap">
      {(["beginner","intermediate","advanced"] as Difficulty[]).map(d => (
        <button key={d}
          onClick={() => { setDifficulty(d); setCurrentQ(null); setStarted(false); }}
          className="px-4 py-2 rounded-full font-Inter text-[12px] font-medium capitalize transition-all border"
          style={{
            background: difficulty === d ? `${DIFF_COLOR[d]}15` : "transparent",
            color: difficulty === d ? DIFF_COLOR[d] : "#71717a",
            borderColor: difficulty === d ? `${DIFF_COLOR[d]}50` : "rgba(255,255,255,0.06)",
          }}>
          {d}
        </button>
      ))}
    </div>
  );

  // ── TIPS CARD ────────────────────────────────────────────────────────────────

  const TipsCard = (
    <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-6 h-0.5 bg-[#aeffd4]" />
        <h3 className="font-Space-Grotesk font-bold text-white text-[16px]">
          Tips — {MODE_META[mode].label}
        </h3>
      </div>
      {TIPS[mode].map(({ label, desc }, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#aeffd4] mt-1.5 shrink-0" />
          <div>
            <span className="font-Manrope font-semibold text-[13px] text-white">{label}</span>
            <span className="font-Manrope text-[13px] text-[#adaaaa]"> — {desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // ── MOBILE VIEW ───────────────────────────────────────────────────────────────

  const MobileView = (
    <div className="max-w-[430px] mx-auto px-5 py-6 flex flex-col gap-5">
      {ModeTabs}
      {DifficultyTabs}
      {score.total > 0 && <StatsRow />}
      {!sessionStarted ? SetupCard : QuestionCard}
      {TipsCard}
      {sessionStarted && score.total > 0 && (
        <button onClick={resetSession}
          className="font-Inter text-[13px] text-[#555] hover:text-[#adaaaa] transition-colors text-center pb-4">
          Reset session
        </button>
      )}
    </div>
  );

  // ── DESKTOP VIEW ──────────────────────────────────────────────────────────────

  const DesktopView = (
    <div className="px-8 pt-6 pb-16">
          {/* Hero */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-Space-Grotesk font-bold text-[72px] leading-none tracking-[-3px] text-white">Ear Training</h2>
              <p className="font-Inter text-[#adaaaa] text-[14px] tracking-[1.4px] uppercase mt-2">DEVELOP YOUR MUSICAL EAR</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {DifficultyTabs}
              {score.total > 0 && bestStreak > 0 && (
                <span className="font-Inter text-[12px] text-[#f59e0b]">Best streak: {bestStreak}</span>
              )}
            </div>
          </div>

          {/* Mode tabs + Stats */}
          <div className="flex items-center justify-between mb-8 gap-6">
            <div className="flex-1 max-w-md">{ModeTabs}</div>
            {score.total > 0 && (
              <div className="flex items-center gap-6">
                {[{v:score.correct,l:"Correct",c:"#aeffd4"},{v:`${accuracy}%`,l:"Accuracy",c:"#aeffd4"},{v:streak,l:"Streak",c:"#f59e0b"}].map(({v,l,c},i)=>(
                  <div key={i} className="text-center">
                    <div className="font-Space-Grotesk font-bold text-[22px]" style={{color:c}}>{v}</div>
                    <div className="font-Inter text-[11px] text-[#adaaaa] uppercase tracking-wider">{l}</div>
                  </div>
                ))}
                <button onClick={resetSession} className="font-Inter text-[12px] text-[#555] hover:text-[#adaaaa] transition-colors">Reset</button>
              </div>
            )}
          </div>

          {/* Two column grid */}
          <div className="grid grid-cols-12 gap-8">

            {/* Left — main training */}
            <div className="col-span-7 flex flex-col gap-6">
              {!sessionStarted ? SetupCard : (
                <>
                  {/* Play button + Question number */}
                  <div className="bg-[#131313] rounded-2xl p-8 flex items-center justify-between">
                    <div>
                      <p className="font-Inter text-[11px] text-[#adaaaa] tracking-[2px] uppercase mb-3">CURRENT SESSION</p>
                      <p className="font-Manrope text-[14px] text-[#adaaaa]">
                        {MODE_META[mode].tagline}
                      </p>
                      <p className="font-Space-Grotesk font-bold text-[28px] text-white mt-1">
                        Question {score.total + (showAnswer ? 0 : 1)}
                      </p>
                    </div>
                    <PlayButton large />
                  </div>

                  {/* Options */}
                  <div className={`grid gap-3 ${optionCount <= 4 ? "grid-cols-2" : optionCount <= 6 ? "grid-cols-3" : "grid-cols-3"}`}>
                    {renderOptions()}
                  </div>

                  {/* Result */}
                  {showAnswer && (
                    <div className={`flex items-center justify-between p-5 rounded-2xl border ${isCorrect ? "bg-[rgba(174,255,212,0.08)] border-[#aeffd4]/30" : "bg-[rgba(239,68,68,0.08)] border-red-500/30"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`font-Space-Grotesk font-bold text-[24px] ${isCorrect ? "text-[#aeffd4]" : "text-red-400"}`}>
                          {isCorrect ? "Correct" : "Wrong"}
                        </span>
                        {isCorrect && streak > 1 && (
                          <span className="font-Space-Grotesk font-bold text-[14px] text-[#f59e0b]">{streak} streak</span>
                        )}
                      </div>
                      <button onClick={generateQuestion}
                        className="px-8 py-3 rounded-full font-Space-Grotesk font-bold text-[15px] bg-[#1a1a1a] border border-white/10 text-white hover:border-white/30 transition-colors">
                        Next Question →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right — info */}
            <div className="col-span-5 flex flex-col gap-6">
              {score.total > 0 && <StatsRow />}

              {TipsCard}

              {/* How ear training works */}
              <div className="rounded-2xl p-6 border border-white/5 flex flex-col gap-3"
                style={{ background:"rgba(38,38,38,0.4)", backdropFilter:"blur(20px)" }}>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#82e9ff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>
                  <span className="font-Space-Grotesk font-bold text-[#82e9ff] text-[13px] tracking-wider">HOW IT WORKS</span>
                </div>
                <p className="font-Manrope text-[#adaaaa] text-[13px] leading-relaxed">
                  Listen to the audio clip, then choose the correct answer. Sounds are played using real guitar samples. Your accuracy and streak are tracked across the session.
                </p>
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
