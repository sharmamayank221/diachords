import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { A } from "@/types/chord.types";
import { initAudio, playNote } from "@/utils/audioUtils";
import TutorialSection from "@/components/ChordDetail/TutorialSection";

const Guitar = dynamic(() => import("@/components/Guitar"), { ssr: false });

// Interval display per suffix
const SUFFIX_INTERVALS: Record<string, string> = {
  major: "1 - 3 - 5",
  minor: "1 - b3 - 5",
  "7": "1 - 3 - 5 - b7",
  maj7: "1 - 3 - 5 - 7",
  m7: "1 - b3 - 5 - b7",
  dim: "1 - b3 - b5",
  aug: "1 - 3 - #5",
  sus2: "1 - 2 - 5",
  sus4: "1 - 4 - 5",
  add9: "1 - 3 - 5 - 9",
  "6": "1 - 3 - 5 - 6",
  m6: "1 - b3 - 5 - 6",
  "9": "1 - 3 - 5 - b7 - 9",
  m9: "1 - b3 - 5 - b7 - 9",
  "5": "1 - 5",
  "11": "1 - 3 - 5 - b7 - 9 - 11",
  "13": "1 - 3 - 5 - b7 - 9 - 13",
  dim7: "1 - b3 - b5 - bb7",
  m7b5: "1 - b3 - b5 - b7",
  mmaj7: "1 - b3 - 5 - 7",
  maj9: "1 - 3 - 5 - 7 - 9",
};

// Genre/voicing label per suffix
const SUFFIX_GENRE: Record<string, string> = {
  major: "Classic open voicing",
  minor: "Minor pentatonic feel",
  "7": "Blues / Dominant sound",
  maj7: "Jazz / Neo-Soul voicing",
  m7: "Jazz / Funk voicing",
  dim: "Tension / Passing chord",
  aug: "Augmented tension",
  sus2: "Open / Ambient voicing",
  sus4: "Suspended / Modal feel",
  add9: "Pop / Contemporary sound",
  "6": "Sweet / Jazz voicing",
  m6: "Bossa Nova / Jazz voicing",
  "9": "Funk / R&B voicing",
  m9: "Neo-Soul / Jazz voicing",
  "5": "Rock / Power chord",
  dim7: "Diminished tension",
  m7b5: "Half-dim / Jazz voicing",
  mmaj7: "Melodic minor voicing",
  maj9: "Lush / Jazz voicing",
};

// Difficulty based on barre + fret spread
function getDifficulty(positions: A["positions"], posIndex: number): number {
  const pos = positions?.[posIndex];
  if (!pos) return 1;
  const barres = pos.barres?.length ?? 0;
  const frets = pos.frets?.filter((f) => f > 0) ?? [];
  const spread = frets.length > 0 ? Math.max(...frets) - Math.min(...frets) : 0;
  if (barres >= 1 || spread >= 3) return 3;
  if (spread >= 2 || frets.length >= 4) return 2;
  return 1;
}

// Nav icons as inline SVGs
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#14ffb1" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ChordsIcon({ active }: { active: boolean }) {
  return (
    <svg width="12" height="18" viewBox="0 0 12 22" fill="none" stroke={active ? "#14ffb1" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="1" x2="6" y2="21" />
      <line x1="1" y1="6" x2="11" y2="6" />
      <line x1="1" y1="16" x2="11" y2="16" />
    </svg>
  );
}

function TunerIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#14ffb1" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="12" x2="15" y2="15" />
    </svg>
  );
}

function PracticeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="16" viewBox="0 0 24 20" fill="none" stroke={active ? "#14ffb1" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="22" height="18" rx="3" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="13" x2="16" y2="13" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#006644" stroke="none">
      <circle cx="12" cy="12" r="10" fill="none" stroke="#006644" strokeWidth="2" />
      <polygon points="10,8 17,12 10,16" fill="#006644" />
    </svg>
  );
}

interface ChordDetailViewProps {
  chordData: A;
}

export default function ChordDetailView({ chordData }: ChordDetailViewProps) {
  const router = useRouter();
  const totalVariations = chordData?.positions?.length ?? 1;
  const maxVariations = Math.min(totalVariations, 5);

  const [position, setPosition] = React.useState(0);
  const [midiNotes, setMidiNotes] = React.useState<number[]>([]);

  const isChordPage = router.pathname.startsWith("/chords");

  React.useEffect(() => {
    initAudio();
  }, []);

  React.useEffect(() => {
    const fretsToUse = chordData?.positions?.[position]?.frets;
    if (fretsToUse) {
      const notes = fretsToUse
        .map((fret: number, index: number) => {
          if (fret === -1) return -1;
          const baseNote = [40, 45, 50, 55, 59, 64][index];
          return baseNote + fret;
        })
        .filter((note: number) => note !== -1);
      setMidiNotes(notes);
    }
  }, [chordData, position]);

  const handleStrumAll = () => {
    midiNotes.forEach((note, i) => {
      setTimeout(() => playNote(note), i * 80);
    });
  };

  const difficulty = getDifficulty(chordData?.positions ?? [], position);
  const intervals = SUFFIX_INTERVALS[chordData?.suffix] ?? "1 - 3 - 5";
  const genre = SUFFIX_GENRE[chordData?.suffix] ?? "Guitar voicing";

  // Split suffix for styled display (e.g. "maj" + "7")
  const suffix = chordData?.suffix ?? "";
  const suffixMatch = suffix.match(/^([a-zA-Z]*)(\d*.*)$/);
  const suffixText = suffixMatch?.[1] ?? suffix;
  const suffixNum = suffixMatch?.[2] ?? "";

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col items-center">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">

        {/* ── TOP HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0e0e0e] sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link href="/chords/cmajor">
              <div className="w-10 h-10 rounded-full bg-[#20201f] border border-[rgba(72,72,71,0.2)] flex items-center justify-center overflow-hidden">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14ffb1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </Link>
            <span className="font-Space-Grotesk font-bold text-[#14ffb1] text-2xl tracking-tight">
              Chord Detail
            </span>
          </div>
          <Link href="/search" className="opacity-60 hover:opacity-100 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto pb-[100px]">
          <div className="px-6 pt-6 flex flex-col gap-8">

            {/* ── CHORD TITLE HERO ── */}
            <div className="flex flex-col items-center gap-2">
              <p className="font-Inter text-[10px] tracking-[2px] uppercase text-[#adaaaa]">
                CURRENT SELECTION
              </p>
              <h1 className="font-Space-Grotesk font-bold text-[64px] leading-none tracking-[-3px] text-white text-center">
                {chordData?.key}
                {suffixText && (
                  <span className="text-white"> {suffixText}</span>
                )}
                {suffixNum && (
                  <span className="text-[#aeffd4]">{suffixNum}</span>
                )}
              </h1>
              <p className="font-Manrope text-[14px] text-[#adaaaa] text-center">
                {genre}
              </p>
            </div>

            {/* ── VARIATION SEGMENTED CONTROL ── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-Inter font-medium text-[12px] tracking-wide text-[#adaaaa] uppercase">
                  Variations
                </span>
                <span className="font-Inter font-bold text-[12px] text-[#aeffd4]">
                  v.{String(position + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="bg-black rounded-full p-1 flex items-center">
                {Array.from({ length: maxVariations }).map((_, i) => {
                  const isActive = i === position;
                  return (
                    <button
                      key={i}
                      onClick={() => setPosition(i)}
                      className={`flex-1 py-2 rounded-full text-[12px] font-Inter transition-all duration-200 relative ${
                        isActive ? "font-bold text-[#006644]" : "text-[#adaaaa]"
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute inset-0 rounded-full"
                          style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)" }}
                        />
                      )}
                      <span className="relative z-10">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── FRETBOARD (existing Guitar component) ── */}
            <div className="-mx-6 bg-[#131313] overflow-hidden">
              <div className="px-3 py-4">
                <Guitar data={chordData} positionOverride={position} onPositionChange={setPosition} />
              </div>
            </div>

            {/* ── QUICK INFO BENTO GRID ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#131313] rounded-xl p-4 flex flex-col gap-1">
                <span className="font-Inter text-[10px] uppercase tracking-wide text-[#adaaaa]">
                  Intervals
                </span>
                <span className="font-Space-Grotesk font-bold text-white text-[18px] leading-tight">
                  {intervals}
                </span>
              </div>
              <div className="bg-[#131313] rounded-xl p-4 flex flex-col gap-2">
                <span className="font-Inter text-[10px] uppercase tracking-wide text-[#adaaaa]">
                  Difficulty
                </span>
                <div className="flex gap-1 items-center">
                  {[1, 2, 3].map((d) => (
                    <div
                      key={d}
                      className="h-[6px] w-4 rounded-full"
                      style={{ background: d <= difficulty ? "#aeffd4" : "#262626" }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── STRUM ALL STRINGS BUTTON ── */}
            <button
              onClick={handleStrumAll}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-full font-Space-Grotesk font-bold text-[#064] text-[18px] tracking-wide transition-opacity active:opacity-80"
              style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)" }}
            >
              <PlayIcon />
              STRUM ALL STRINGS
            </button>

            {/* ── VIDEO TUTORIAL ── */}
            <div className="bg-[#131313] rounded-2xl p-5">
              <TutorialSection chordKey={chordData?.key ?? "C"} chordSuffix={chordData?.suffix ?? "major"} />
            </div>

          </div>
        </div>

        {/* ── BOTTOM NAV ── */}
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30"
          style={{ backdropFilter: "blur(12px)", background: "rgba(14,14,14,0.85)", boxShadow: "0px -24px 24px rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center justify-around h-20 px-6">
            {[
              { href: "/", label: "HOME", icon: <HomeIcon active={false} /> },
              { href: "/chords/cmajor", label: "CHORDS", icon: <ChordsIcon active={isChordPage} /> },
              { href: "/tuner", label: "TUNER", icon: <TunerIcon active={false} /> },
              { href: "/ear-training", label: "PRACTICE", icon: <PracticeIcon active={false} /> },
            ].map(({ href, label, icon }) => {
              const isActive = label === "CHORDS" ? isChordPage : false;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`flex flex-col items-center gap-1 transition-opacity ${isActive ? "opacity-100" : "opacity-40"}`}
                >
                  {icon}
                  <span
                    className="font-Inter font-medium text-[10px] tracking-[1px] uppercase"
                    style={{ color: isActive ? "#14ffb1" : "white" }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
