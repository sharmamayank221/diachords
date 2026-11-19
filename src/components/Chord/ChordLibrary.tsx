import React from "react";
import Link from "next/link";
import SEO from "@/components/SEO";
import ChordDiagram from "@/components/Chord/ChordDiagram";
import { CATEGORY_ORDER, CHORD_INDEX, type ChordCategory } from "@/helpers/chordSearch";

export const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const FILTERS: ("All" | ChordCategory)[] = ["All", ...CATEGORY_ORDER];

// Alternate spellings, so "Db guitar chords" also matches the C# page
const ENHARMONIC: Record<string, string> = { "C#": "Db", Eb: "D#", "F#": "Gb", Ab: "G#", Bb: "A#" };

// URL-safe form of a key ("C#" → "csharp")
export const keySlug = (k: string) => k.toLowerCase().replace("#", "sharp");
export const keyFromSlug = (s?: string | string[]) => KEYS.find((k) => keySlug(k) === String(s ?? "").toLowerCase());

// C lives at /chords; every other key has its own pre-rendered page
export const keyPath = (k: string) => (k === "C" ? "/chords" : `/chords/key/${keySlug(k)}`);

export default function ChordLibrary({ chordKey }: { chordKey: string }) {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("All");

  const availableFilters = React.useMemo(() => {
    const inKey = CHORD_INDEX.filter((c) => c.key === chordKey);
    return FILTERS.filter((f) => f === "All" || inKey.some((c) => c.category === f));
  }, [chordKey]);

  // switching to a key without e.g. slash chords falls back to All
  React.useEffect(() => {
    if (!availableFilters.includes(filter)) setFilter("All");
  }, [availableFilters, filter]);

  const allInKey = React.useMemo(
    () =>
      CHORD_INDEX.filter((c) => c.key === chordKey).sort(
        (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.order - b.order
      ),
    [chordKey]
  );
  const chords = filter === "All" ? allInKey : allInKey.filter((c) => c.category === filter);

  const alt = ENHARMONIC[chordKey];
  const keyName = alt ? `${chordKey} (${alt})` : chordKey;
  const examples = allInKey.slice(0, 4).map((c) => c.display);

  return (
    <>
      <SEO
        title={`${keyName} Guitar Chords — Every ${chordKey} Chord Shape`}
        description={`All ${allInKey.length} ${keyName} guitar chords with diagrams and audio: ${examples.join(", ")}, 7ths, sus, extended and slash chords.`}
        canonical={keyPath(chordKey)}
        keywords={[`${chordKey} guitar chords`, `${chordKey} chord chart`, ...(alt ? [`${alt} guitar chords`] : [])]}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-16 text-white">
        <h1 className="font-Lora text-4xl md:text-5xl">{keyName} guitar chords</h1>
        <p className="font-Inter text-gray-400 mt-2">
          Every {keyName} chord on guitar, from {examples.slice(0, 2).join(" and ")} to extended and slash chords. Tap any
          chord to see every shape and hear it.
        </p>

        {/* Key picker: real links so crawlers can reach every key page */}
        <nav className="mt-8 flex gap-1.5 overflow-x-auto no-scrollbar pb-1" aria-label="Key">
          {KEYS.map((k) => {
            const active = k === chordKey;
            return (
              <Link
                key={k}
                href={keyPath(k)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                title={`${k} guitar chords`}
                className={`shrink-0 h-11 min-w-[48px] px-3 rounded-xl font-Lora text-lg flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                  active ? "bg-[#1BD79E] text-black" : "bg-[#151515] text-white hover:bg-[#222]"
                }`}
              >
                {k}
              </Link>
            );
          })}
        </nav>

        {/* Type filter */}
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Chord type">
          {availableFilters.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={`shrink-0 h-8 px-3.5 rounded-full font-Inter text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                  active ? "bg-white/10 text-white border border-white/20" : "text-gray-400 border border-transparent hover:text-white"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        <h2 className="mt-6 mb-3 font-Inter text-xs uppercase tracking-wider text-gray-500">
          {chords.length} {chordKey} chords
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {chords.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              title={c.fullName}
              className="group rounded-2xl bg-[#111] border border-white/5 hover:border-[#1BD79E]/40 p-3 pb-4 flex flex-col items-center transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            >
              <ChordDiagram position={c.positions[0]} size={100} showFingers={false} title={`${c.display} chord`} />
              <span className="font-Lora text-lg text-white group-hover:text-[#1BD79E] transition-colors mt-1">
                {c.display}
              </span>
              <span className="font-Inter text-[11px] text-gray-500">
                {c.positions.length} shape{c.positions.length === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
