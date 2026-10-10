import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ChordDiagram from "@/components/Chord/ChordDiagram";
import { CATEGORY_ORDER, CHORD_INDEX, type ChordCategory } from "@/helpers/chordSearch";

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const FILTERS: ("All" | ChordCategory)[] = ["All", ...CATEGORY_ORDER];

// URL-safe form of a key for ?key= ("C#" → "csharp")
const keyParam = (k: string) => k.toLowerCase().replace("#", "sharp");
const keyFromParam = (p?: string | string[]) =>
  KEYS.find((k) => keyParam(k) === String(p ?? "").toLowerCase()) ?? "C";

export default function ChordLibrary() {
  const router = useRouter();
  const selectedKey = keyFromParam(router.query.key);
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("All");

  const availableFilters = React.useMemo(() => {
    const inKey = CHORD_INDEX.filter((c) => c.key === selectedKey);
    return FILTERS.filter((f) => f === "All" || inKey.some((c) => c.category === f));
  }, [selectedKey]);

  // switching to a key without e.g. slash chords falls back to All
  React.useEffect(() => {
    if (!availableFilters.includes(filter)) setFilter("All");
  }, [availableFilters, filter]);

  const chords = React.useMemo(
    () =>
      CHORD_INDEX.filter((c) => c.key === selectedKey)
        .filter((c) => filter === "All" || c.category === filter)
        .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.order - b.order),
    [selectedKey, filter]
  );

  const selectKey = (k: string) =>
    router.replace({ pathname: "/chords", query: k === "C" ? {} : { key: keyParam(k) } }, undefined, { shallow: true, scroll: false });

  return (
    <>
      <Head>
        <title>{`${selectedKey} Guitar Chords — Chord Library | ChordsofGuitar`}</title>
        <meta
          name="description"
          content={`Every ${selectedKey} guitar chord with diagrams and audio: major, minor, 7ths, sus, extended and slash chords.`}
        />
      </Head>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-16 text-white">
        <h1 className="font-Lora text-4xl md:text-5xl">Chord library</h1>
        <p className="font-Inter text-gray-400 mt-2">
          Pick a key, then tap any chord to see every shape and hear it.
        </p>

        {/* Key picker */}
        <div className="mt-8 flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Key">
          {KEYS.map((k) => {
            const active = k === selectedKey;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={active}
                onClick={() => selectKey(k)}
                className={`shrink-0 h-11 min-w-[48px] px-3 rounded-xl font-Lora text-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                  active ? "bg-[#1BD79E] text-black" : "bg-[#151515] text-white hover:bg-[#222]"
                }`}
              >
                {k}
              </button>
            );
          })}
        </div>

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

        <p className="mt-6 mb-3 font-Inter text-xs uppercase tracking-wider text-gray-500">
          {chords.length} {selectedKey} chords
        </p>

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
