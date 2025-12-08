import React, { useState, useEffect, useCallback } from "react";
import * as Tone from "tone";

// Interval definitions
const INTERVALS = [
  { name: "Minor 2nd", semitones: 1, short: "m2" },
  { name: "Major 2nd", semitones: 2, short: "M2" },
  { name: "Minor 3rd", semitones: 3, short: "m3" },
  { name: "Major 3rd", semitones: 4, short: "M3" },
  { name: "Perfect 4th", semitones: 5, short: "P4" },
  { name: "Tritone", semitones: 6, short: "TT" },
  { name: "Perfect 5th", semitones: 7, short: "P5" },
  { name: "Minor 6th", semitones: 8, short: "m6" },
  { name: "Major 6th", semitones: 9, short: "M6" },
  { name: "Minor 7th", semitones: 10, short: "m7" },
  { name: "Major 7th", semitones: 11, short: "M7" },
  { name: "Octave", semitones: 12, short: "P8" },
];

// Chord types
const CHORD_TYPES = [
  { name: "Major", intervals: [0, 4, 7], symbol: "" },
  { name: "Minor", intervals: [0, 3, 7], symbol: "m" },
  { name: "Diminished", intervals: [0, 3, 6], symbol: "dim" },
  { name: "Augmented", intervals: [0, 4, 8], symbol: "aug" },
  { name: "Major 7th", intervals: [0, 4, 7, 11], symbol: "maj7" },
  { name: "Minor 7th", intervals: [0, 3, 7, 10], symbol: "m7" },
  { name: "Dominant 7th", intervals: [0, 4, 7, 10], symbol: "7" },
];

// Scale types
const SCALE_TYPES = [
  { name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11, 12], short: "Maj", mood: "Happy, bright" },
  { name: "Natural Minor", intervals: [0, 2, 3, 5, 7, 8, 10, 12], short: "Min", mood: "Sad, dark" },
  { name: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10, 12], short: "m Pent", mood: "Bluesy, rock" },
  { name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9, 12], short: "M Pent", mood: "Country, folk" },
  { name: "Blues", intervals: [0, 3, 5, 6, 7, 10, 12], short: "Blues", mood: "Soulful, gritty" },
  { name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10, 12], short: "Dor", mood: "Jazzy minor" },
  { name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10, 12], short: "Mix", mood: "Bluesy major" },
  { name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11, 12], short: "H Min", mood: "Exotic, tense" },
];

// Difficulty levels
const DIFFICULTY_LEVELS = {
  beginner: {
    intervals: [2, 4, 5, 7], // M2, M3, P4, P5
    chords: [0, 1], // Major, Minor
    scales: [0, 1], // Major, Natural Minor
  },
  intermediate: {
    intervals: [1, 2, 3, 4, 5, 7, 12], // m2, M2, m3, M3, P4, P5, P8
    chords: [0, 1, 2, 3], // Major, Minor, Dim, Aug
    scales: [0, 1, 2, 3, 4], // Major, Minor, Pentatonics, Blues
  },
  advanced: {
    intervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // All
    chords: [0, 1, 2, 3, 4, 5, 6], // All
    scales: [0, 1, 2, 3, 4, 5, 6, 7], // All
  },
};

type Mode = "intervals" | "chords" | "scales";
type Difficulty = "beginner" | "intermediate" | "advanced";

export default function EarTraining() {
  const [mode, setMode] = useState<Mode>("intervals");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [currentQuestion, setCurrentQuestion] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rootNote, setRootNote] = useState(60); // Middle C
  const [sampler, setSampler] = useState<Tone.Sampler | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize sampler
  useEffect(() => {
    const newSampler = new Tone.Sampler({
      urls: {
        A2: "A2.mp3",
        A3: "A3.mp3",
        A4: "A4.mp3",
        C3: "C3.mp3",
        C4: "C4.mp3",
        C5: "C5.mp3",
        E3: "E3.mp3",
        E4: "E4.mp3",
        G3: "G3.mp3",
        G4: "G4.mp3",
      },
      baseUrl: "/guitar-acoustic/",
      onload: () => {
        setSampler(newSampler);
      },
    }).toDestination();

    return () => {
      newSampler.dispose();
    };
  }, []);

  // Get available interval options
  const getIntervalOptions = useCallback(() => {
    const level = DIFFICULTY_LEVELS[difficulty];
    return level.intervals.map((semitones) =>
      INTERVALS.find((i) => i.semitones === semitones)!
    );
  }, [difficulty]);

  // Get available chord options
  const getChordOptions = useCallback(() => {
    const level = DIFFICULTY_LEVELS[difficulty];
    return level.chords.map((idx) => CHORD_TYPES[idx]);
  }, [difficulty]);

  // Get available scale options
  const getScaleOptions = useCallback(() => {
    const level = DIFFICULTY_LEVELS[difficulty];
    return level.scales.map((idx) => SCALE_TYPES[idx]);
  }, [difficulty]);

  // Generate new question
  const generateQuestion = useCallback(() => {
    // Random root note between C3 and G4 (48-67)
    const newRoot = Math.floor(Math.random() * 12) + 48;
    setRootNote(newRoot);
    
    if (mode === "intervals") {
      const options = getIntervalOptions();
      const randomIndex = Math.floor(Math.random() * options.length);
      setCurrentQuestion(options[randomIndex].semitones);
    } else if (mode === "chords") {
      const options = getChordOptions();
      const randomIndex = Math.floor(Math.random() * options.length);
      setCurrentQuestion(randomIndex);
    } else {
      const options = getScaleOptions();
      const randomIndex = Math.floor(Math.random() * options.length);
      setCurrentQuestion(randomIndex);
    }
    
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowAnswer(false);
  }, [getIntervalOptions, getChordOptions, getScaleOptions, mode]);

  // Play interval
  const playInterval = async () => {
    if (!sampler || currentQuestion === null || isPlaying) return;
    
    await Tone.start();
    setIsPlaying(true);

    const now = Tone.now();
    const rootFreq = Tone.Frequency(rootNote, "midi").toFrequency();
    const secondFreq = Tone.Frequency(rootNote + currentQuestion, "midi").toFrequency();

    // Play root note
    sampler.triggerAttackRelease(rootFreq, "2n", now);
    // Play second note after delay
    sampler.triggerAttackRelease(secondFreq, "2n", now + 0.8);

    setTimeout(() => setIsPlaying(false), 1600);
  };

  // Play chord
  const playChord = async () => {
    if (!sampler || currentQuestion === null || isPlaying) return;
    
    await Tone.start();
    setIsPlaying(true);

    const chord = CHORD_TYPES[currentQuestion];
    const now = Tone.now();

    // Play all notes of the chord with slight strum delay
    chord.intervals.forEach((interval, idx) => {
      const freq = Tone.Frequency(rootNote + interval, "midi").toFrequency();
      sampler.triggerAttackRelease(freq, "2n", now + idx * 0.05);
    });

    setTimeout(() => setIsPlaying(false), 1500);
  };

  // Play scale
  const playScale = async () => {
    if (!sampler || currentQuestion === null || isPlaying) return;
    
    await Tone.start();
    setIsPlaying(true);

    const scale = SCALE_TYPES[currentQuestion];
    const now = Tone.now();
    const noteLength = 0.3; // Time between notes

    // Play scale ascending
    scale.intervals.forEach((interval, idx) => {
      const freq = Tone.Frequency(rootNote + interval, "midi").toFrequency();
      sampler.triggerAttackRelease(freq, "8n", now + idx * noteLength);
    });

    const totalTime = scale.intervals.length * noteLength * 1000 + 500;
    setTimeout(() => setIsPlaying(false), totalTime);
  };

  // Play current question
  const playQuestion = () => {
    if (mode === "intervals") {
      playInterval();
    } else if (mode === "chords") {
      playChord();
    } else {
      playScale();
    }
  };

  // Check answer
  const checkAnswer = (answerIndex: number) => {
    if (isCorrect !== null) return; // Already answered

    setSelectedAnswer(answerIndex);
    
    let correct = false;
    if (mode === "intervals") {
      const options = getIntervalOptions();
      correct = options[answerIndex].semitones === currentQuestion;
    } else {
      // Both chords and scales use index-based checking
      correct = answerIndex === currentQuestion;
    }

    setIsCorrect(correct);
    setShowAnswer(true);
    setScore((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));

    if (correct) {
      setStreak((prev) => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        return newStreak;
      });
    } else {
      setStreak(0);
    }
  };

  // Next question
  const nextQuestion = () => {
    generateQuestion();
  };

  // Start training
  const startTraining = () => {
    setScore({ correct: 0, total: 0 });
    setStreak(0);
    generateQuestion();
  };

  // Reset stats
  const resetStats = () => {
    setScore({ correct: 0, total: 0 });
    setStreak(0);
    setBestStreak(0);
    setCurrentQuestion(null);
  };

  // Calculate accuracy
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-Lora text-4xl md:text-5xl mb-2 bg-gradient-to-r from-[#1BD79E] to-[#38DBE5] bg-clip-text text-transparent">
          Ear Training
        </h1>
        <p className="font-Lora text-gray-400 text-lg">
          Develop your musical ear
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Mode Selection */}
        <div className="flex justify-center gap-2 md:gap-4 mb-6 flex-wrap">
          <button
            onClick={() => {
              setMode("intervals");
              setCurrentQuestion(null);
            }}
            className={`px-4 md:px-6 py-3 rounded-xl font-Lora text-base md:text-lg transition-all ${
              mode === "intervals"
                ? "bg-[#1BD79E] text-black"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a] border border-[#333]"
            }`}
          >
            🎵 Intervals
          </button>
          <button
            onClick={() => {
              setMode("chords");
              setCurrentQuestion(null);
            }}
            className={`px-4 md:px-6 py-3 rounded-xl font-Lora text-base md:text-lg transition-all ${
              mode === "chords"
                ? "bg-[#1BD79E] text-black"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a] border border-[#333]"
            }`}
          >
            🎹 Chords
          </button>
          <button
            onClick={() => {
              setMode("scales");
              setCurrentQuestion(null);
            }}
            className={`px-4 md:px-6 py-3 rounded-xl font-Lora text-base md:text-lg transition-all ${
              mode === "scales"
                ? "bg-[#1BD79E] text-black"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a] border border-[#333]"
            }`}
          >
            🎼 Scales
          </button>
        </div>

        {/* Difficulty Selection */}
        <div className="flex justify-center gap-2 mb-8">
          {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((level) => (
            <button
              key={level}
              onClick={() => {
                setDifficulty(level);
                setCurrentQuestion(null);
              }}
              className={`px-4 py-2 rounded-lg font-Lora text-sm capitalize transition-all ${
                difficulty === level
                  ? "bg-[#38DBE5] text-black"
                  : "bg-[#1a1a1a] text-gray-500 hover:bg-[#2a2a2a]"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white font-Lora">{score.correct}</div>
            <div className="text-xs text-gray-500 font-Lora">Correct</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white font-Lora">{score.total}</div>
            <div className="text-xs text-gray-500 font-Lora">Total</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1BD79E] font-Lora">{accuracy}%</div>
            <div className="text-xs text-gray-500 font-Lora">Accuracy</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#38DBE5] font-Lora">{streak}🔥</div>
            <div className="text-xs text-gray-500 font-Lora">Streak</div>
          </div>
        </div>

        {/* Main Training Area */}
        {currentQuestion === null ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🎧</div>
            <h2 className="font-Lora text-2xl text-white mb-4">
              {mode === "intervals" ? "Interval Training" : mode === "chords" ? "Chord Recognition" : "Scale Recognition"}
            </h2>
            <p className="font-Lora text-gray-400 mb-6">
              {mode === "intervals"
                ? "Listen to two notes and identify the interval between them."
                : mode === "chords"
                ? "Listen to a chord and identify its type."
                : "Listen to a scale and identify which type it is."}
            </p>
            <p className="font-Lora text-gray-500 text-sm mb-6">
              Difficulty: <span className="text-[#38DBE5] capitalize">{difficulty}</span>
              {" • "}
              {mode === "intervals" 
                ? getIntervalOptions().length 
                : mode === "chords" 
                ? getChordOptions().length 
                : getScaleOptions().length} options
            </p>
            <button
              onClick={startTraining}
              disabled={!sampler}
              className="px-8 py-4 bg-[#1BD79E] text-black rounded-xl font-Lora text-xl font-semibold hover:bg-[#15c48e] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sampler ? "Start Training" : "Loading sounds..."}
            </button>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            {/* Play Button */}
            <div className="text-center mb-8">
              <button
                onClick={playQuestion}
                disabled={isPlaying}
                className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl transition-all transform hover:scale-105 ${
                  isPlaying
                    ? "bg-[#38DBE5] animate-pulse"
                    : "bg-[#1BD79E] hover:bg-[#15c48e]"
                } text-black shadow-lg`}
              >
                {isPlaying ? "🔊" : "▶"}
              </button>
              <p className="font-Lora text-gray-500 text-sm mt-3">
                {isPlaying ? "Playing..." : "Click to play"}
              </p>
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {mode === "intervals" && getIntervalOptions().map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrectAnswer = option.semitones === currentQuestion;
                
                let buttonClass = "bg-[#1a1a1a] text-white border border-[#333] hover:bg-[#2a2a2a]";
                
                if (showAnswer) {
                  if (isCorrectAnswer) {
                    buttonClass = "bg-[#1BD79E] text-black border-[#1BD79E]";
                  } else if (isSelected && !isCorrect) {
                    buttonClass = "bg-red-500 text-white border-red-500";
                  }
                } else if (isSelected) {
                  buttonClass = "bg-[#38DBE5] text-black border-[#38DBE5]";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => checkAnswer(idx)}
                    disabled={showAnswer}
                    className={`p-4 rounded-xl font-Lora transition-all ${buttonClass}`}
                  >
                    <div className="text-lg font-semibold">{option.short}</div>
                    <div className="text-xs opacity-70">{option.name}</div>
                  </button>
                );
              })}
              {mode === "chords" && getChordOptions().map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrectAnswer = idx === currentQuestion;
                
                let buttonClass = "bg-[#1a1a1a] text-white border border-[#333] hover:bg-[#2a2a2a]";
                
                if (showAnswer) {
                  if (isCorrectAnswer) {
                    buttonClass = "bg-[#1BD79E] text-black border-[#1BD79E]";
                  } else if (isSelected && !isCorrect) {
                    buttonClass = "bg-red-500 text-white border-red-500";
                  }
                } else if (isSelected) {
                  buttonClass = "bg-[#38DBE5] text-black border-[#38DBE5]";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => checkAnswer(idx)}
                    disabled={showAnswer}
                    className={`p-4 rounded-xl font-Lora transition-all ${buttonClass}`}
                  >
                    <div className="text-lg font-semibold">{option.name}</div>
                    <div className="text-xs opacity-70">{option.symbol || "maj"}</div>
                  </button>
                );
              })}
              {mode === "scales" && getScaleOptions().map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrectAnswer = idx === currentQuestion;
                
                let buttonClass = "bg-[#1a1a1a] text-white border border-[#333] hover:bg-[#2a2a2a]";
                
                if (showAnswer) {
                  if (isCorrectAnswer) {
                    buttonClass = "bg-[#1BD79E] text-black border-[#1BD79E]";
                  } else if (isSelected && !isCorrect) {
                    buttonClass = "bg-red-500 text-white border-red-500";
                  }
                } else if (isSelected) {
                  buttonClass = "bg-[#38DBE5] text-black border-[#38DBE5]";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => checkAnswer(idx)}
                    disabled={showAnswer}
                    className={`p-4 rounded-xl font-Lora transition-all ${buttonClass}`}
                  >
                    <div className="text-lg font-semibold">{option.short}</div>
                    <div className="text-xs opacity-70">{option.mood}</div>
                  </button>
                );
              })}
            </div>

            {/* Result & Next */}
            {showAnswer && (
              <div className="text-center">
                <div className={`text-2xl font-Lora font-bold mb-4 ${isCorrect ? "text-[#1BD79E]" : "text-red-500"}`}>
                  {isCorrect ? "✓ Correct!" : "✗ Wrong!"}
                </div>
                <button
                  onClick={nextQuestion}
                  className="px-8 py-3 bg-[#38DBE5] text-black rounded-xl font-Lora font-semibold hover:bg-[#2bc8d5] transition-all"
                >
                  Next Question →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-8 bg-[#111] border border-[#222] rounded-2xl p-6">
          <h3 className="font-Lora text-[#1BD79E] text-lg mb-4">
            💡 Tips for {mode === "intervals" ? "Intervals" : mode === "chords" ? "Chords" : "Scales"}
          </h3>
          {mode === "intervals" && (
            <ul className="font-Lora text-gray-400 text-sm space-y-2">
              <li>• <span className="text-white">Minor 2nd</span> - Jaws theme (tense, close)</li>
              <li>• <span className="text-white">Major 3rd</span> - Oh When The Saints</li>
              <li>• <span className="text-white">Perfect 4th</span> - Wedding March intro</li>
              <li>• <span className="text-white">Perfect 5th</span> - Star Wars theme</li>
              <li>• <span className="text-white">Octave</span> - Over the Rainbow intro</li>
            </ul>
          )}
          {mode === "chords" && (
            <ul className="font-Lora text-gray-400 text-sm space-y-2">
              <li>• <span className="text-white">Major</span> - Happy, bright, stable</li>
              <li>• <span className="text-white">Minor</span> - Sad, dark, melancholic</li>
              <li>• <span className="text-white">Diminished</span> - Tense, unstable, scary</li>
              <li>• <span className="text-white">Augmented</span> - Dreamy, mysterious</li>
              <li>• <span className="text-white">7th chords</span> - Jazzy, rich, complex</li>
            </ul>
          )}
          {mode === "scales" && (
            <ul className="font-Lora text-gray-400 text-sm space-y-2">
              <li>• <span className="text-white">Major</span> - Happy, uplifting (Do Re Mi)</li>
              <li>• <span className="text-white">Natural Minor</span> - Sad, emotional</li>
              <li>• <span className="text-white">Minor Pentatonic</span> - Blues/rock soloing</li>
              <li>• <span className="text-white">Blues</span> - Has the blue note (b5)</li>
              <li>• <span className="text-white">Dorian</span> - Minor but brighter (raised 6th)</li>
              <li>• <span className="text-white">Mixolydian</span> - Major but bluesy (flat 7th)</li>
            </ul>
          )}
        </div>

        {/* Best Streak */}
        {bestStreak > 0 && (
          <div className="mt-4 text-center">
            <span className="font-Lora text-gray-500 text-sm">
              Best streak: <span className="text-[#1BD79E]">{bestStreak}🔥</span>
            </span>
          </div>
        )}

        {/* Reset Button */}
        {score.total > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={resetStats}
              className="font-Lora text-gray-500 text-sm hover:text-gray-300 underline"
            >
              Reset Stats
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

