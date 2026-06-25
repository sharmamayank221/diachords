import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { A, Position } from "@/types/chord.types";
import { initAudio, playNote } from "@/utils/audioUtils";
import TutorialSection from "@/components/ChordDetail/TutorialSection";
import { useAuth } from "@/hooks/useAuth";
import UserMenu from "@/components/Auth/UserMenu";
import LoginModal from "@/components/Auth/LoginModal";
import { useFavorites } from "@/hooks/useFavorites";

const Guitar = dynamic(() => import("@/components/Guitar"), { ssr: false });

// ── Music theory helpers ──────────────────────────────────────────────────────

const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_IDX: Record<string, number> = {
  C: 0, "C#": 1, Csharp: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Fsharp: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

function getScaleNotes(key: string, suffix: string): string[] {
  const idx = NOTE_IDX[key] ?? 0;
  const isMinor = suffix.startsWith("m") && !suffix.startsWith("maj");
  const steps = isMinor ? MINOR_STEPS : MAJOR_STEPS;
  return steps.map((s) => CHROMATIC[(idx + s) % 12]);
}

function getRelative(key: string, suffix: string): { name: string; type: string } {
  const idx = NOTE_IDX[key] ?? 0;
  const isMinor = suffix.startsWith("m") && !suffix.startsWith("maj");
  if (isMinor) {
    return { name: CHROMATIC[(idx + 3) % 12], type: "Major" };
  }
  return { name: CHROMATIC[(idx + 9) % 12], type: "Minor" };
}

const INTERVAL_LABELS: Record<string, { formula: string; name: string }> = {
  major:  { formula: "1 - 3 - 5",       name: "Major Triad" },
  minor:  { formula: "1 - b3 - 5",      name: "Minor Triad" },
  "7":    { formula: "1 - 3 - 5 - b7",  name: "Dominant 7th" },
  maj7:   { formula: "1 - 3 - 5 - 7",   name: "Major 7th" },
  m7:     { formula: "1 - b3 - 5 - b7", name: "Minor 7th" },
  dim:    { formula: "1 - b3 - b5",     name: "Diminished" },
  aug:    { formula: "1 - 3 - #5",      name: "Augmented" },
  sus2:   { formula: "1 - 2 - 5",       name: "Suspended 2nd" },
  sus4:   { formula: "1 - 4 - 5",       name: "Suspended 4th" },
  add9:   { formula: "1 - 3 - 5 - 9",   name: "Add 9" },
  "6":    { formula: "1 - 3 - 5 - 6",   name: "Major 6th" },
  m6:     { formula: "1 - b3 - 5 - 6",  name: "Minor 6th" },
  "9":    { formula: "1 - 3 - 5 - b7 - 9", name: "Dominant 9th" },
  m9:     { formula: "1 - b3 - 5 - b7 - 9", name: "Minor 9th" },
  "5":    { formula: "1 - 5",            name: "Power Chord" },
  dim7:   { formula: "1 - b3 - b5 - bb7", name: "Diminished 7th" },
  m7b5:   { formula: "1 - b3 - b5 - b7", name: "Half Diminished" },
  mmaj7:  { formula: "1 - b3 - 5 - 7",  name: "Minor Major 7th" },
  maj9:   { formula: "1 - 3 - 5 - 7 - 9", name: "Major 9th" },
};

const SCALE_NAMES: Record<string, string> = {
  major: "Ionian (Major Scale)", minor: "Aeolian (Minor Scale)", "7": "Mixolydian",
  maj7: "Ionian (Major Scale)", m7: "Dorian", dim: "Locrian", aug: "Whole Tone",
  sus2: "Suspended", sus4: "Suspended", add9: "Ionian (Major Scale)",
  "6": "Major Pentatonic", m6: "Melodic Minor", "9": "Mixolydian",
  m9: "Dorian", "5": "Pentatonic", dim7: "Diminished", m7b5: "Locrian",
};

const SCALE_FORMULAS: Record<string, string> = {
  major:  "W – W – H – W – W – W – H",
  minor:  "W – H – W – W – H – W – W",
  "7":    "W – W – H – W – W – H – W",
  maj7:   "W – W – H – W – W – W – H",
  m7:     "W – H – W – W – H – W – W",
  dim:    "W – H – W – H",
  aug:    "W – W – W – W",
  sus2:   "W – W – W – W – H – W",
  sus4:   "W – W – W – H – W – W",
  add9:   "W – W – H – W – W – W – H",
  "6":    "W – W – H – W – W – W – H",
  m6:     "W – H – W – W – H – W – W",
  "9":    "W – W – H – W – W – H – W",
  m9:     "W – H – W – W – H – W – W",
  "5":    "W – W – W – W – H – W",
  dim7:   "W – H – W – H – W – H – W – H",
  m7b5:   "H – W – W – H – W – W – W",
  mmaj7:  "W – H – W – W – W – W – H",
  maj9:   "W – W – H – W – W – W – H",
};

const GENRE_TAGS: Record<string, string> = {
  major: "Classic / Folk", minor: "Blues / Rock", "7": "Blues / Dominant",
  maj7: "Jazz / Neo-Soul", m7: "Jazz / Funk", dim: "Classical / Jazz",
  aug: "Jazz / Cinematic", sus2: "Ambient / Pop", sus4: "Rock / Pop",
  add9: "Pop / Contemporary", "6": "Jazz / Swing", m6: "Bossa Nova",
  "9": "R&B / Funk", m9: "Neo-Soul", "5": "Rock / Metal",
};

const TUNING_LABEL: Record<string, string> = {
  major: "STANDARD TUNING (EADGBE)", minor: "STANDARD TUNING (EADGBE)",
  "7": "STANDARD TUNING (EADGBE)", maj7: "STANDARD TUNING (EADGBE)",
};

// ── Fingering guide ───────────────────────────────────────────────────────────

const STRING_NAMES = ["E (low)", "A", "D", "G", "B", "E (high)"];
const FINGER_NAMES = ["", "Index", "Middle", "Ring", "Pinky"];

interface FingerInstruction {
  finger: number;
  name: string;
  fret: number;
  string: string;
}

function buildFingeringGuide(position?: Position): FingerInstruction[] {
  if (!position) return [];
  const seen = new Set<number>();
  const instructions: FingerInstruction[] = [];
  position.fingers.forEach((finger, i) => {
    if (finger > 0 && !seen.has(finger) && position.frets[i] >= 0) {
      seen.add(finger);
      instructions.push({
        finger,
        name: FINGER_NAMES[finger] ?? `Finger ${finger}`,
        fret: position.frets[i] + (position.baseFret - 1),
        string: STRING_NAMES[i],
      });
    }
  });
  return instructions.sort((a, b) => a.finger - b.finger).slice(0, 4);
}

function getChordBadge(position?: Position): string {
  if (!position) return "OPEN CHORD";
  if (position.barres?.length > 0) return "BARRE CHORD";
  if (position.baseFret === 1 && position.frets.some((f) => f === 0)) return "OPEN CHORD";
  return "MOVEABLE CHORD";
}

function getDifficulty(positions: A["positions"], posIdx: number): number {
  const pos = positions?.[posIdx];
  if (!pos) return 1;
  const barres = pos.barres?.length ?? 0;
  const frets = pos.frets.filter((f) => f > 0);
  const spread = frets.length > 0 ? Math.max(...frets) - Math.min(...frets) : 0;
  if (barres >= 1 || spread >= 3) return 3;
  if (spread >= 2 || frets.length >= 4) return 2;
  return 1;
}

// ── Nav icons (SVG) ───────────────────────────────────────────────────────────

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#14ffb1" : "#71717a"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function PracticeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#14ffb1" : "#71717a"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
function TunerIcon2({ active }: { active: boolean }) {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke={active ? "#14ffb1" : "#71717a"} strokeWidth="1.75" strokeLinecap="round">
      <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="3" x2="21" y2="3" /><line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}
function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke={active ? "#14ffb1" : "#71717a"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 9 5 5 9 7 13 3 19 3" /><line x1="1" y1="11" x2="19" y2="11" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function SupportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function ArrowRightSmall() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 14" fill="none" stroke="#adaaaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l6 6-6 6" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ChordDetailDesktopProps {
  chordData: A;
}

export default function ChordDetailDesktop({ chordData }: ChordDetailDesktopProps) {
  const router = useRouter();
  const [position, setPosition] = React.useState(0);
  const [midiNotes, setMidiNotes] = React.useState<number[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loginOpen, setLoginOpen] = React.useState(false);
  const { user, isLoading } = useAuth();
  const chordId = (router.query.id as string) ?? "";
  const { isFavorited, toggle: toggleFavorite, loading: favLoading } = useFavorites(chordId, chordData?.key ?? "", chordData?.suffix ?? "");

  const isChordPage = router.pathname.startsWith("/chords");

  React.useEffect(() => { initAudio(); }, []);

  React.useEffect(() => {
    const fretsToUse = chordData?.positions?.[position]?.frets;
    if (fretsToUse) {
      const notes = fretsToUse
        .map((fret: number, i: number) => {
          if (fret === -1) return -1;
          return [40, 45, 50, 55, 59, 64][i] + fret;
        })
        .filter((n: number) => n !== -1);
      setMidiNotes(notes);
    }
  }, [chordData, position]);

  const handleStrumAll = () => {
    midiNotes.forEach((note, i) => setTimeout(() => playNote(note), i * 80));
  };

  const currentPos = chordData?.positions?.[position];
  const suffix = chordData?.suffix ?? "major";
  const key = chordData?.key ?? "C";
  const intervalInfo = INTERVAL_LABELS[suffix] ?? { formula: "1 - 3 - 5", name: "Triad" };
  const scaleNotes = getScaleNotes(key, suffix);
  const scaleName = SCALE_NAMES[suffix] ?? "Major";
  const relative = getRelative(key, suffix);
  const badge = getChordBadge(currentPos);
  const fingeringGuide = buildFingeringGuide(currentPos);
  const difficulty = getDifficulty(chordData?.positions ?? [], position);
  const maxVariations = Math.min(chordData?.positions?.length ?? 1, 5);
  const genre = GENRE_TAGS[suffix] ?? "Guitar voicing";

  const navItems = [
    { href: "/chords/cmajor", label: "Chord Library",  icon: <LibraryIcon active={isChordPage} />,  active: isChordPage },
    { href: "/chord-recognition", label: "Practice", icon: <PracticeIcon active={false} />, active: false },
    { href: "/tuner",          label: "Tuner",    icon: <TunerIcon2 active={false} />,   active: false },
    { href: "/ear-training",   label: "Progress", icon: <ProgressIcon active={false} />, active: false },
  ];

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-[#0e0e0e] border-r border-white/5 flex flex-col z-40">
        {/* Branding */}
        <div className="px-8 pt-8 pb-2">
          <h1 className="font-Space-Grotesk font-bold text-xl text-[#14ffb1] tracking-tight leading-8">ChordsofGuitar</h1>
          <p className="font-Inter text-[12px] text-[#adaaaa] tracking-[1.2px] uppercase mt-0.5">MASTER LEVEL</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 mt-2 flex flex-col gap-1">
          {navItems.map(({ href, label, icon, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-[rgba(39,39,42,0.2)] border-r-2 border-[#14ffb1]"
                  : "hover:bg-white/5"
              }`}
            >
              {icon}
              <span className={`font-Manrope text-base ${active ? "font-bold text-[#14ffb1]" : "font-medium text-[#71717a]"}`}>
                {label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Start Daily Drill CTA */}
        <div className="px-4 pb-4">
          <div className="bg-[rgba(32,32,31,0.3)] rounded-xl p-6">
            <button
              className="w-full py-3 rounded-full font-Manrope font-bold text-[14px] text-[#006644] transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(166deg, #aeffd4 0%, #10feb0 100%)" }}
            >
              Start Daily Drill
            </button>
          </div>
        </div>

        {/* Bottom links */}
        <div className="border-t border-white/5 px-4 py-6 flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-lg">
            <SettingsIcon />
            <span className="font-Inter text-[14px] text-[#71717a]">Settings</span>
          </Link>
          <Link href="/" className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-lg">
            <SupportIcon />
            <span className="font-Inter text-[14px] text-[#71717a]">Support</span>
          </Link>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">

        {/* ── TOP NAV ── */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-8 border-b border-white/5"
          style={{ backdropFilter: "blur(12px)", background: "rgba(14,14,14,0.8)" }}
        >
          <div className="flex items-center gap-8">
            {/* Search */}
              <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    router.push(`/search?q=${encodeURIComponent(e.target.value.trim())}`, undefined, { shallow: false });
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Search chords, scales…"
                className="bg-black text-white font-Manrope text-[14px] pl-9 pr-4 py-[7px] rounded-full w-64 focus:outline-none focus:ring-1 focus:ring-[#14ffb1]/20"
              />
            </div>
            {/* Top nav links */}
            <nav className="flex items-center gap-6">
              {([
                { label: "Theory", href: "/learn" },
                { label: "Chords", href: "/chords/cmajor" },
              ] as { label: string; href: string }[]).map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className={`font-Manrope text-[14px] pb-1 ${
                    label === "Chords"
                      ? "font-semibold text-[#14ffb1] border-b-2 border-[#14ffb1]"
                      : "font-medium text-[#a1a1aa] hover:text-white transition-colors"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {!isLoading && (
              user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1BD79E]/10 border border-[#1BD79E]/30 hover:bg-[#1BD79E]/20 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span className="font-Manrope text-[13px] text-[#1BD79E] font-medium">Sign in</span>
                </button>
              )
            )}
          </div>
        </header>
        {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}

        {/* ── SCROLLABLE CONTENT ── */}
        <main className="flex-1 px-8 pt-8 pb-24 max-w-[1600px] w-full">

          {/* ── HERO HEADER ── */}
          <div className="flex items-end justify-between mb-8">
            <div className="flex flex-col gap-4">
              <h2 className="font-Space-Grotesk font-bold text-[96px] leading-none tracking-[-4.8px] text-white">
                {key} <span className="text-white">{suffix === "major" ? "Major" : suffix === "minor" ? "Minor" : suffix}</span>
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#20201f] rounded-full px-4 py-1">
                  <div className="w-2 h-2 rounded-full bg-[#82e9ff]" />
                  <span className="font-Inter text-[12px] text-[#82e9ff]">{badge}</span>
                </div>
                <span className="font-Inter text-[14px] text-[#adaaaa] tracking-[1.4px] uppercase">
                  {TUNING_LABEL[suffix] ?? "STANDARD TUNING (EADGBE)"}
                </span>
                <span className="font-Manrope text-[14px] text-[#adaaaa]">{genre}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleStrumAll}
                className="flex items-center gap-2 bg-[#262626] hover:bg-[#2e2e2e] transition-colors px-6 py-3 rounded-full"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#aeffd4"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                <span className="font-Manrope font-bold text-[16px] text-[#aeffd4]">Strum Audio</span>
              </button>
              <button
                onClick={() => user ? toggleFavorite() : setLoginOpen(true)}
                disabled={favLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-Manrope font-bold text-[16px] transition-all disabled:opacity-50"
                style={isFavorited
                  ? { background: "#1a1a1a", border: "1px solid #1BD79E", color: "#1BD79E" }
                  : { background: "linear-gradient(167deg, #aeffd4 0%, #10feb0 100%)", color: "#006644" }
                }
              >
                {isFavorited ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#1BD79E"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006644" strokeWidth="2.5" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Save Chord
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── VARIATION TABS ── */}
          {maxVariations > 1 && (
            <div className="flex items-center gap-3 mb-8">
              <span className="font-Inter text-[12px] text-[#adaaaa] uppercase tracking-wide">Variation:</span>
              <div className="bg-black rounded-full p-1 flex gap-0">
                {Array.from({ length: maxVariations }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPosition(i)}
                    className={`relative px-5 py-1.5 rounded-full text-[12px] font-Inter transition-all ${
                      i === position ? "font-bold text-[#006644]" : "text-[#adaaaa] hover:text-white"
                    }`}
                  >
                    {i === position && (
                      <span className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)" }} />
                    )}
                    <span className="relative z-10">{String(i + 1).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── MAIN ASYMMETRIC GRID ── */}
          <div className="grid grid-cols-12 gap-8">

            {/* Fretboard + Tutorial — col 1-8 */}
            <div className="col-span-8 flex flex-col gap-6">
              <div className="bg-black rounded-2xl overflow-hidden p-4">
                <Guitar data={chordData} positionOverride={position} onPositionChange={setPosition} />
              </div>

              {/* Video Tutorial below fretboard */}
              <div className="bg-[#0d0d0d] rounded-2xl p-6" style={{ borderTop: "2px solid rgba(27,215,158,0.1)" }}>
                <TutorialSection chordKey={key} chordSuffix={suffix} />
              </div>
            </div>

            {/* Right sidebar — col 9-12 */}
            <div className="col-span-4 flex flex-col gap-6">

              {/* Fingering Guide — merged */}
              <div className="bg-[#20201f] rounded-2xl p-7 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(27,215,158,0.12)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                      <path d="M6 14v0a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-2.5" />
                    </svg>
                  </div>
                  <h3 className="font-Space-Grotesk font-bold text-white text-[18px]">Fingering Guide</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {fingeringGuide.length > 0 ? fingeringGuide.map((fi) => (
                    <div key={fi.finger} className="flex gap-3 items-start bg-[#1a1a1a] rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(27,215,158,0.15)" }}>
                        <span className="font-Space-Grotesk font-bold text-[14px]" style={{ color: "#1BD79E" }}>{fi.finger}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-Manrope font-bold text-white text-[14px]">{fi.name} Finger</p>
                          <span className="font-Inter text-[11px] px-2 py-0.5 rounded-full"
                            style={{ background: "#262626", color: "#71717a" }}>
                            Fret {fi.fret} · {fi.string}
                          </span>
                        </div>
                        <p className="font-Manrope text-[#adaaaa] text-[12px] leading-relaxed">
                          Keep the joint arched for clarity and avoid muting adjacent strings.
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="font-Manrope text-[#52525b] text-[14px]">Open chord — no fingers required.</p>
                  )}
                </div>

                {/* Quote callout */}
                <div className="rounded-xl px-4 py-3 border-l-2"
                  style={{ background: "#0d0d0d", borderColor: "rgba(174,255,212,0.3)" }}>
                  <p className="font-Manrope text-[#adaaaa] text-[12px] leading-relaxed">
                    &quot;Keep your thumb behind the neck for better reach and avoid muting adjacent strings.&quot;
                  </p>
                </div>
              </div>

              {/* Practice Tip (glassmorphism) */}
              <div className="rounded-2xl p-8 border border-white/5 flex flex-col gap-4"
                style={{ background: "rgba(38,38,38,0.4)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-3">
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                    <rect x="1" y="1" width="18" height="14" rx="2" stroke="#82e9ff" strokeWidth="1.5" />
                    <line x1="5" y1="5" x2="15" y2="5" stroke="#82e9ff" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="5" y1="8" x2="12" y2="8" stroke="#82e9ff" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="font-Space-Grotesk font-bold text-[#82e9ff] text-[14px] tracking-[0.35px]">PRACTICE TIP</span>
                </div>
                <p className="font-Manrope text-[#adaaaa] text-[14px] leading-relaxed">
                  Transition between <strong className="text-white">{key} {suffix}</strong> and its relative {relative.type} at 60 BPM to build muscle memory for common progressions.
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-Inter text-[12px] text-[#adaaaa] uppercase tracking-wide">Difficulty</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((d) => (
                      <div key={d} className="h-1.5 w-4 rounded-full" style={{ background: d <= difficulty ? "#aeffd4" : "#262626" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── THEORY & SCALES — full width ── col 1-12 */}
            <div className="col-span-12 pt-4">
              <div className="bg-[#131313] rounded-2xl p-6 flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1BD79E]/10 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <h3 className="font-Space-Grotesk font-bold text-white text-[18px]">Theory &amp; Scales</h3>
                </div>

                {/* Three columns: Intervals · Formula · Suggested Scale */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#1a1a1a] rounded-xl p-4 flex flex-col gap-2">
                    <span className="font-Inter text-[11px] text-[#52525b] uppercase tracking-[1.2px]">Intervals</span>
                    <span className="font-Space-Grotesk font-bold text-white text-[22px] leading-tight">
                      {intervalInfo.formula}
                    </span>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-4 flex flex-col gap-2">
                    <span className="font-Inter text-[11px] text-[#52525b] uppercase tracking-[1.2px]">Formula</span>
                    <span className="font-Manrope font-semibold text-white text-[13px] leading-relaxed">
                      {SCALE_FORMULAS[suffix] ?? "W – W – H – W – W – W – H"}
                    </span>
                  </div>

                  {/* Suggested Scale — now third column */}
                  <div className="bg-[#1a1a1a] rounded-xl px-5 py-4 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-Inter text-[11px] text-[#52525b] uppercase tracking-[1.2px]">Suggested Scale</span>
                    <span className="font-Space-Grotesk font-bold text-[18px]" style={{ color: "#1BD79E" }}>
                      {key} {scaleName}
                    </span>
                  </div>
                  <a
                    href={`/scales?scale=${encodeURIComponent(scaleName.split(" ")[0].toLowerCase())}&root=${encodeURIComponent(key)}`}
                    className="w-8 h-8 rounded-lg bg-[#262626] hover:bg-[#2e2e2e] transition-colors flex items-center justify-center flex-shrink-0"
                    title="Open in Scales"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
                </div>{/* end grid-cols-3 */}
              </div>{/* end Theory & Scales card */}
            </div>{/* end col-span-12 */}

          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="ml-0 border-t border-white/5 bg-black px-12 py-12">
          <div className="flex items-center justify-between max-w-[1600px]">
            <div className="flex gap-12">
              <div className="flex flex-col gap-4">
                <span className="font-Inter text-[12px] text-[#52525b] uppercase tracking-[1.2px]">QUICK LINKS</span>
                <div className="flex flex-col gap-2">
                  {["Chord Library", "Scale Dictionary", "Technique Drills"].map((l) => (
                    <span key={l} className="font-Manrope text-[#a1a1aa] text-[14px] cursor-pointer hover:text-white">{l}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <span className="font-Inter text-[12px] text-[#52525b] uppercase tracking-[1.2px]">RESOURCES</span>
                <div className="flex flex-col gap-2">
                  {["Theory Guide", "Ear Training", "Masterclasses"].map((l) => (
                    <span key={l} className="font-Manrope text-[#a1a1aa] text-[14px] cursor-pointer hover:text-white">{l}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-Space-Grotesk font-bold text-[24px] text-[#27272a] tracking-[-1.2px]">CHORDSOFGUITAR.COM</span>
              <span className="font-Inter text-[10px] text-[#52525b] tracking-[2px] uppercase">© 2024 PRECISION DIGITAL INSTRUMENTS</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
