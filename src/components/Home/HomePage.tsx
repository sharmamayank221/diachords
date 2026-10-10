import React from "react";
import Link from "next/link";
import Head from "next/head";
import ChordDiagram from "@/components/Chord/ChordDiagram";
import { OPEN_SEARCH_EVENT } from "@/components/SearchBar";
import { findChord, type ChordSearchItem } from "@/helpers/chordSearch";
import { getChordStringNotes } from "@/helpers/chordNotes";
import { initAudio } from "@/utils/audioUtils";
import { playProgression, strum } from "@/utils/strum";

const HERO_CHORDS = ["G", "C", "D", "Em", "Am", "F"];
const TOOLS = [
  {
    href: "/tuner",
    title: "Guitar tuner",
    desc: "Play a string and watch the needle. Uses your microphone, nothing to install.",
    cta: "Tune up",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
        <path d="M4 16a8 8 0 1 1 16 0" />
        <path d="M12 16l4-6" />
        <circle cx="12" cy="16" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/metronome",
    title: "Metronome",
    desc: "Subdivisions, 6/8 and 12/8, tap tempo, count-in and a speed trainer that ramps up as you play.",
    cta: "Keep time",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 3h6l4 18H5L9 3z" />
        <path d="M12 15l5-8" />
        <path d="M7.5 15h9" />
      </svg>
    ),
  },
];

const POPULAR_CHORDS = ["C", "G", "D", "A", "E", "F", "Am", "Em", "Dm", "G7", "C7", "Cmaj7"];

const JAM_PRESETS = [
  {
    title: "Pop in C",
    subtitle: "90 BPM · the four-chord song",
    chords: ["C", "G", "Am", "F"],
    href: "/practice?tab=jam&key=C&genre=pop&preset=0&bpm=90",
  },
  {
    title: "Blues in G",
    subtitle: "100 BPM · 12-bar shuffle",
    chords: ["G", "C", "D"],
    href: "/practice?tab=jam&key=G&genre=blues&preset=6&bpm=100",
  },
  {
    title: "Jazz in C",
    subtitle: "80 BPM · ii–V–I",
    chords: ["Dm", "G", "C"],
    href: "/practice?tab=jam&key=C&genre=jazz&preset=2&bpm=80",
  },
];

function chordMidi(chord?: ChordSearchItem): number[] {
  const p = chord?.positions[0];
  if (!p) return [];
  return getChordStringNotes(p.frets, p.baseFret, chord?.key)
    .map((n) => n.midi)
    .filter((m): m is number => m !== null);
}

// Chord of the day rotates through the hero chords
const dayIndex = new Date().getDate() % HERO_CHORDS.length;

const PlayIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
  </svg>
);
const StopIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

function HeroChordCard() {
  const [selected, setSelected] = React.useState(HERO_CHORDS[dayIndex]);
  const [ringing, setRinging] = React.useState<number[]>([]);
  const chord = React.useMemo(() => findChord(selected), [selected]);
  const position = chord?.positions[0];

  React.useEffect(() => {
    initAudio();
  }, []);

  const play = (name = selected) => {
    const c = findChord(name);
    const p = c?.positions[0];
    if (!c || !p) return;
    const strings = getChordStringNotes(p.frets, p.baseFret, c.key).filter((n) => n.midi !== null);
    strum(
      strings.map((n) => n.midi as number),
      45,
      (i) => {
        setRinging((r) => [...r, strings[i].stringNumber]);
        setTimeout(() => setRinging((r) => r.filter((s) => s !== strings[i].stringNumber)), 350);
      }
    );
  };

  return (
    <div className="rounded-3xl bg-[#111] border border-white/5 p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-Inter text-[11px] font-semibold uppercase tracking-wider text-[#1BD79E]">
            {selected === HERO_CHORDS[dayIndex] ? "Chord of the day" : "Try a chord"}
          </p>
          <h2 className="font-Lora text-4xl md:text-5xl text-white mt-1">{chord?.display}</h2>
          <p className="font-Inter text-sm text-gray-400 mt-1">{chord?.fullName}</p>
        </div>
        <button
          onClick={() => play()}
          aria-label={`Strum ${chord?.display}`}
          className="h-14 w-14 shrink-0 rounded-full bg-[#1BD79E] text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1BD79E] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <PlayIcon className="h-6 w-6 ml-0.5" />
        </button>
      </div>

      <div className="flex justify-center py-4">
        <ChordDiagram position={position} size={210} highlightStrings={ringing} title={`${chord?.display} chord diagram`} />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Pick a chord">
        {HERO_CHORDS.map((name) => {
          const active = name === selected;
          return (
            <button
              key={name}
              onClick={() => {
                setSelected(name);
                play(name);
              }}
              aria-pressed={active}
              className={`h-9 min-w-[44px] px-3 rounded-full font-Lora text-[15px] transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                active ? "bg-[#1BD79E] text-black" : "bg-[#1f1f1f] text-white hover:bg-[#2a2a2a]"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {chord && (
        <Link
          href={chord.href}
          className="mt-5 inline-flex items-center gap-1.5 font-Inter text-sm font-semibold text-[#1BD79E] hover:underline underline-offset-4"
        >
          All {chord.positions.length} shapes of {chord.display} →
        </Link>
      )}
    </div>
  );
}

function PresetCard({ preset }: { preset: (typeof JAM_PRESETS)[number] }) {
  const [activeChord, setActiveChord] = React.useState(-1);
  const cancelRef = React.useRef<(() => void) | null>(null);
  const chords = React.useMemo(() => preset.chords.map((c) => findChord(c)), [preset.chords]);

  React.useEffect(() => () => cancelRef.current?.(), []);

  const toggle = () => {
    if (activeChord >= 0) {
      cancelRef.current?.();
      setActiveChord(-1);
      return;
    }
    cancelRef.current = playProgression(chords.map(chordMidi), 750, setActiveChord);
  };

  const playing = activeChord >= 0;

  return (
    <div className="rounded-2xl bg-[#111] border border-white/5 p-5 flex flex-col gap-4 hover:border-[#1BD79E]/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-Lora text-xl text-white">{preset.title}</h3>
          <p className="font-Inter text-xs text-gray-400 mt-1">{preset.subtitle}</p>
        </div>
        <button
          onClick={toggle}
          aria-label={playing ? `Stop ${preset.title} preview` : `Preview ${preset.title}`}
          className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
            playing ? "bg-[#1BD79E] text-black" : "border border-[#1BD79E]/50 text-[#1BD79E] hover:bg-[#1BD79E]/10"
          }`}
        >
          {playing ? <StopIcon /> : <PlayIcon className="h-4 w-4 ml-0.5" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {chords.map((c, i) =>
          c ? (
            <Link
              key={`${c.href}-${i}`}
              href={c.href}
              className={`h-9 min-w-[44px] px-3 rounded-full flex items-center justify-center font-Lora text-[15px] transition-all ${
                activeChord === i ? "bg-[#1BD79E] text-black scale-105" : "bg-[#1f1f1f] text-white hover:bg-[#2a2a2a]"
              }`}
            >
              {c.display}
            </Link>
          ) : null
        )}
      </div>

      <Link
        href={preset.href}
        className="mt-auto inline-flex items-center gap-1.5 font-Inter text-sm font-semibold text-[#1BD79E] hover:underline underline-offset-4"
      >
        Jam with drums &amp; bass →
      </Link>
    </div>
  );
}

export default function HomePage() {
  const popular = React.useMemo(
    () => POPULAR_CHORDS.map((c) => findChord(c)).filter((c): c is ChordSearchItem => !!c),
    []
  );

  return (
    <>
      <Head>
        <title>ChordsofGuitar — Guitar Chords, Scales &amp; Backing Tracks</title>
        <meta
          name="description"
          content="Learn any guitar chord with interactive diagrams and audio, then jam along with AI drums and bass in the same key."
        />
      </Head>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-14 pb-16 text-white">
        {/* ── Hero ── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center mb-16 md:mb-24">
          <div>
            <h1 className="font-Lora text-4xl sm:text-5xl md:text-[3.5rem] font-bold leading-[1.08] tracking-tight" style={{ textWrap: "balance" } as React.CSSProperties}>
              Learn any chord.
              <br />
              <span className="text-[#1BD79E]">Then jam with a band.</span>
            </h1>
            <p className="font-Inter text-gray-400 text-base md:text-lg max-w-xl mt-5 leading-relaxed">
              550+ chords you can see and hear, scale patterns for soloing, and backing tracks that
              play along in your key.
            </p>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
              className="mt-8 w-full max-w-xl h-14 rounded-full bg-[#1a1a1a] border border-white/10 hover:border-[#1BD79E]/50 pl-5 pr-3 flex items-center gap-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <span className="flex-1 font-Lora text-base md:text-lg text-gray-500">Find a chord — Am, G7, F#m7…</span>
              <kbd className="hidden sm:flex h-7 min-w-[28px] items-center justify-center rounded-md border border-[#444] px-2 font-Inter text-xs text-gray-400">
                /
              </kbd>
            </button>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/chords"
                className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-[#1BD79E] text-black font-Inter font-semibold transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-[#1BD79E] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Browse all chords
              </Link>
              <Link
                href="/practice"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-white/15 text-white font-Inter font-semibold hover:border-[#1BD79E]/60 transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
              >
                <PlayIcon className="h-3.5 w-3.5" />
                Start a backing track
              </Link>
            </div>
            <p className="mt-5 font-Inter text-sm text-gray-500">
              Free tools:{" "}
              <Link href="/tuner" className="text-gray-300 hover:text-[#1BD79E] underline-offset-4 hover:underline">Guitar tuner</Link>
              {" · "}
              <Link href="/metronome" className="text-gray-300 hover:text-[#1BD79E] underline-offset-4 hover:underline">Metronome</Link>
            </p>
          </div>

          <HeroChordCard />
        </section>

        {/* ── Popular chords ── */}
        <section className="mb-16 md:mb-24" aria-labelledby="popular-heading">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h2 id="popular-heading" className="font-Lora text-2xl md:text-3xl">Popular chords</h2>
              <p className="font-Inter text-sm text-gray-400 mt-1">The shapes behind most songs you know.</p>
            </div>
            <Link href="/chords" className="shrink-0 font-Inter text-sm font-semibold text-[#1BD79E] hover:underline underline-offset-4">
              All chords →
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {popular.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group rounded-2xl bg-[#111] border border-white/5 hover:border-[#1BD79E]/40 p-3 pb-4 flex flex-col items-center transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
              >
                <ChordDiagram position={c.positions[0]} size={92} showFingers={false} title={`${c.display} chord`} />
                <span className="font-Lora text-lg text-white group-hover:text-[#1BD79E] transition-colors mt-1">{c.display}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Practice tools ── */}
        <section className="mb-16 md:mb-24" aria-labelledby="tools-heading">
          <div className="mb-5">
            <h2 id="tools-heading" className="font-Lora text-2xl md:text-3xl">Tune up &amp; keep time</h2>
            <p className="font-Inter text-sm text-gray-400 mt-1">Free practice tools that work right in your browser.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-2xl bg-[#111] border border-white/5 hover:border-[#1BD79E]/40 p-5 md:p-6 flex items-start gap-4 transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
              >
                <span className="h-12 w-12 shrink-0 rounded-xl bg-[#1BD79E]/10 text-[#1BD79E] flex items-center justify-center">
                  {tool.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-Lora text-xl text-white">{tool.title}</span>
                  <span className="block font-Inter text-sm text-gray-400 mt-1 leading-relaxed">{tool.desc}</span>
                  <span className="inline-block mt-3 font-Inter text-sm font-semibold text-[#1BD79E] group-hover:underline underline-offset-4">
                    {tool.cta} →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Jam presets ── */}
        <section aria-labelledby="jam-heading">
          <div className="mb-5">
            <h2 id="jam-heading" className="font-Lora text-2xl md:text-3xl">Play along</h2>
            <p className="font-Inter text-sm text-gray-400 mt-1">
              Hear the progression, learn the chords, then jam with drums and bass.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {JAM_PRESETS.map((p) => (
              <PresetCard key={p.href} preset={p} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
