import React from "react";
import Link from "next/link";
import Head from "next/head";

const DAILY_FOCUS = [
  {
    chord: "C Major",
    href: "/chords/cmajor",
    desc: "The most common open chord — a perfect place to start jamming in the key of C.",
    level: "Beginner",
    jamHref: "key=C&genre=pop&preset=0&bpm=90",
  },
  {
    chord: "G Major",
    href: "/chords/gmajor",
    desc: "Essential for country, rock, and folk. Pair it with a blues or rock backing track.",
    level: "Beginner",
    jamHref: "key=G&genre=rock&preset=1&bpm=100",
  },
  {
    chord: "Am",
    href: "/chords/aminor",
    desc: "The relative minor of C — great for emotional progressions and slow jams.",
    level: "Intermediate",
    jamHref: "key=A&genre=pop&preset=4&bpm=85",
  },
  {
    chord: "Cmaj7",
    href: "/chords/cmaj7",
    desc: "Jazz and neo-soul staple. Try the ii–V–I preset in C.",
    level: "Advanced",
    jamHref: "key=C&genre=jazz&preset=2&bpm=80",
  },
];

const JAM_PRESETS = [
  {
    title: "Pop in C",
    subtitle: "I–V–vi–IV · 90 BPM",
    href: "/practice?tab=jam&key=C&genre=pop&preset=0&bpm=90",
    color: "#ec4899",
  },
  {
    title: "Blues in G",
    subtitle: "12-bar · 100 BPM",
    href: "/practice?tab=jam&key=G&genre=blues&preset=6&bpm=100",
    color: "#f59e0b",
  },
  {
    title: "Jazz in C",
    subtitle: "ii–V–I · 80 BPM",
    href: "/practice?tab=jam&key=C&genre=jazz&preset=2&bpm=80",
    color: "#8b5cf6",
  },
];

const focus = DAILY_FOCUS[new Date().getDate() % DAILY_FOCUS.length];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>ChordsofGuitar — Guitar Chords, Scales &amp; AI Backing Tracks</title>
        <meta
          name="description"
          content="Practice guitar with AI backing tracks, interactive chord diagrams, and scale tools. Start jamming in seconds."
        />
      </Head>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 font-Lora text-white">

        {/* Hero — jam first */}
        <section className="mb-10 md:mb-14">
          <p className="text-[#1BD79E] text-sm md:text-base font-semibold uppercase tracking-widest mb-3">
            Practice studio · Backing tracks · Scales
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
            Jam the progression, solo the scale —{" "}
            <span className="text-[#1BD79E]">same key, one session</span>
          </h1>
          <p className="text-[#adaaaa] text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
            AI drums and bass plus an interactive fretboard and pitch check. Switch tabs without losing your key or tempo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/practice"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-[#064] text-lg transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)" }}
            >
              Open practice studio
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </Link>
            <Link
              href={`/practice?tab=jam&${focus.jamHref.split("?")[1] ?? ""}`}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-bold text-white text-lg border border-white/10 bg-[#131313] hover:border-[#1BD79E]/40 transition-colors"
            >
              Quick jam: {focus.chord}
            </Link>
          </div>
        </section>

        {/* Preset cards */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Popular jam presets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {JAM_PRESETS.map(p => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-xl p-5 flex flex-col gap-2 transition-transform hover:scale-[1.02] bg-[#131313] border border-white/5"
                style={{ borderTopColor: p.color, borderTopWidth: 2 }}
              >
                <span className="font-bold text-lg">{p.title}</span>
                <span className="text-sm text-[#71717a]">{p.subtitle}</span>
                <span className="text-[#1BD79E] text-sm font-semibold mt-2">Start →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Daily focus + chord library */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-xl p-6 md:p-8 bg-[#131313] flex flex-col justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold mb-4"
                style={{ background: "rgba(27,215,158,0.12)", color: "#1BD79E" }}>
                Chord of the day
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-3">{focus.chord}</h2>
              <p className="text-[#adaaaa] text-sm leading-relaxed">{focus.desc}</p>
              <p className="text-[#52525b] text-xs mt-2 uppercase tracking-wide">{focus.level}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={focus.href}
                className="text-center px-5 py-3 rounded-full font-bold text-[#064] text-sm"
                style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)" }}>
                View chord diagram
              </Link>
              <Link href={`/practice?tab=jam&${focus.jamHref}`}
                className="text-center px-5 py-3 rounded-full font-bold text-[#1BD79E] text-sm border border-[#1BD79E]/30 bg-[#1BD79E]/5">
                Jam in this key
              </Link>
            </div>
          </div>

          <div className="rounded-xl p-6 md:p-8 bg-[#131313] flex flex-col gap-4">
            <h2 className="text-xl font-bold">Explore</h2>
            <p className="text-[#adaaaa] text-sm leading-relaxed">
              Search any chord in the header, open the library, or jump straight into a backing track.
            </p>
            <ul className="flex flex-col gap-3 mt-auto">
              {[
                { href: "/practice", label: "Practice studio", hint: "Backing tracks + scale fretboard" },
                { href: "/practice?tab=scales", label: "Scale explorer", hint: "Patterns, pitch detection, soloing" },
                { href: "/chords/cmajor", label: "Chord library", hint: "Diagrams, audio & voicings" },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href}
                    className="flex items-center justify-between p-4 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] transition-colors group">
                    <div>
                      <span className="font-semibold block">{item.label}</span>
                      <span className="text-xs text-[#52525b]">{item.hint}</span>
                    </div>
                    <span className="text-[#1BD79E] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="text-center text-[#52525b] text-xs">
          Use the search bar above to find any chord — then jam over it in the same key.
        </p>
      </div>
    </>
  );
}
