import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/Navigation/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import chordsData from "@/chrods.json";

interface Favorite {
  id: string;
  chord_id: string;
  chord_key: string;
  chord_suffix: string;
  created_at: string;
}

const SUFFIX_LABELS: Record<string, string> = {
  major: "Major", minor: "Minor", "7": "Dominant", maj7: "Major 7th",
  m7: "Minor 7th", dim: "Diminished", aug: "Augmented",
  sus2: "Suspended", sus4: "Suspended", add9: "Extended",
  "6": "Major 6th", m6: "Minor 6th", "9": "Extended",
};

const FILTER_TYPES = ["All", "Major", "Minor", "7th", "Suspended"] as const;
type Filter = typeof FILTER_TYPES[number];

function matchesFilter(suffix: string, filter: Filter) {
  if (filter === "All") return true;
  if (filter === "Major") return suffix === "major" || suffix === "maj7";
  if (filter === "Minor") return suffix === "minor" || suffix === "m7" || suffix === "m6";
  if (filter === "7th") return suffix === "7" || suffix === "maj7" || suffix === "m7" || suffix === "9";
  if (filter === "Suspended") return suffix === "sus2" || suffix === "sus4";
  return true;
}

// Build chord lookup map: chord_id -> first position data
const chordMap: Record<string, { frets: number[]; fingers: number[]; baseFret: number }> = {};
Object.values((chordsData as any).chords).forEach((chords: any) => {
  chords.forEach((ch: any) => {
    const id = (ch.key + ch.suffix).toLowerCase().replace("/", "");
    if (ch.positions?.[0]) chordMap[id] = ch.positions[0];
  });
});

function RealFretboard({ chordId }: { chordId: string }) {
  const pos = chordMap[chordId];
  if (!pos) return null;

  const { frets, fingers, baseFret } = pos;
  const STRINGS = 6;
  const FRETS = 4;
  const activeFrets = frets.filter(f => f > 0);
  const maxFret = Math.max(...activeFrets, baseFret + FRETS - 1);
  const minFret = baseFret;

  const W = 160, H = 120;
  const padLeft = 20, padRight = 12, padTop = 20, padBottom = 8;
  const gridW = W - padLeft - padRight;
  const gridH = H - padTop - padBottom;
  const stringSpacing = gridW / (STRINGS - 1);
  const fretSpacing = gridH / FRETS;

  return (
    <div className="w-full flex justify-center items-center rounded-xl py-2"
      style={{ background: "#000", border: "1px solid rgba(255,255,255,0.05)" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Nut or baseFret indicator */}
        <line x1={padLeft} y1={padTop} x2={padLeft + gridW} y2={padTop}
          stroke={baseFret === 1 ? "#767575" : "#484847"} strokeWidth={baseFret === 1 ? 3 : 1} />

        {/* Fret lines */}
        {Array.from({ length: FRETS }).map((_, i) => (
          <line key={i}
            x1={padLeft} y1={padTop + (i + 1) * fretSpacing}
            x2={padLeft + gridW} y2={padTop + (i + 1) * fretSpacing}
            stroke="#484847" strokeWidth={0.8} />
        ))}

        {/* String lines */}
        {Array.from({ length: STRINGS }).map((_, i) => (
          <line key={i}
            x1={padLeft + i * stringSpacing} y1={padTop}
            x2={padLeft + i * stringSpacing} y2={padTop + gridH}
            stroke="#484847" strokeWidth={0.8} />
        ))}

        {/* baseFret label */}
        {baseFret > 1 && (
          <text x={padLeft - 6} y={padTop + fretSpacing * 0.7}
            fill="#767575" fontSize={8} textAnchor="end" fontFamily="Inter">
            {baseFret}fr
          </text>
        )}

        {/* Mute / Open markers */}
        {frets.map((fret, i) => {
          const cx = padLeft + i * stringSpacing;
          if (fret === -1) return (
            <text key={i} x={cx} y={padTop - 6} fill="#767575" fontSize={9} textAnchor="middle" fontFamily="Inter">×</text>
          );
          if (fret === 0) return (
            <circle key={i} cx={cx} cy={padTop - 6} r={4} fill="none" stroke="#767575" strokeWidth={1} />
          );
          return null;
        })}

        {/* Finger dots */}
        {frets.map((fret, i) => {
          if (fret <= 0) return null;
          const relFret = fret - minFret + 1;
          if (relFret < 1 || relFret > FRETS) return null;
          const cx = padLeft + i * stringSpacing;
          const cy = padTop + (relFret - 0.5) * fretSpacing;
          const finger = fingers[i];
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={7} fill="#1BD79E"
                style={{ filter: "drop-shadow(0 0 4px rgba(27,215,158,0.7))" }} />
              {finger > 0 && (
                <text x={cx} y={cy + 3.5} fill="#006644" fontSize={8}
                  textAnchor="middle" fontFamily="Inter" fontWeight="bold">
                  {finger}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChordCard({ fav, onRemove }: { fav: Favorite; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);
  const label = SUFFIX_LABELS[fav.chord_suffix] ?? fav.chord_suffix;
  const displayName = fav.chord_suffix === "major" ? fav.chord_key
    : fav.chord_suffix === "minor" ? `${fav.chord_key}m`
    : fav.chord_suffix === "7" ? `${fav.chord_key}7`
    : `${fav.chord_key}${fav.chord_suffix}`;

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    await supabase.from("user_favorites").delete().eq("id", fav.id);
    onRemove(fav.id);
  }

  return (
    <Link href={`/chords/${fav.chord_id}`}
      className="group relative flex flex-col p-6 rounded-xl border border-transparent hover:border-white/10 transition-all duration-300"
      style={{ background: "#131313" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-Space-Grotesk font-bold text-white text-[40px] leading-none">{displayName}</h3>
          <span className="font-Inter text-[10px] text-[#adaaaa] uppercase tracking-widest mt-1 block">{label}</span>
        </div>
        <button
          onClick={handleRemove}
          disabled={removing}
          title="Remove from library"
          className="text-[#1BD79E] hover:text-red-400 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1BD79E">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Fretboard */}
      <RealFretboard chordId={fav.chord_id} />

      {/* Hover footer */}
      <div className="mt-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-widest">Standard Tuning</span>
        <span className="font-Space-Grotesk font-bold text-[#1BD79E] text-[11px] uppercase tracking-tight">View Details →</span>
      </div>
    </Link>
  );
}

export default function LibraryPage() {
  const { user, isLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    if (!user) { setFetching(false); return; }
    supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setFavorites(data ?? []);
        setFetching(false);
      });
  }, [user]);

  function handleRemove(id: string) {
    setFavorites(prev => prev.filter(f => f.id !== id));
  }

  const filtered = favorites.filter(f => matchesFilter(f.chord_suffix, filter));

  return (
    <div className="px-8 lg:px-12 py-10 max-w-[1600px]">

      {/* Editorial Header */}
      <div className="mb-10">
        <h1 className="font-Space-Grotesk font-bold text-white leading-none tracking-tighter"
          style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
          CHORD<br /><span style={{ color: "#1BD79E" }}>LIBRARY</span>
        </h1>

        {/* Filter chips */}
        {user && !fetching && favorites.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {FILTER_TYPES.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-5 py-2 rounded-full font-Space-Grotesk font-bold text-[13px] transition-all"
                style={filter === f
                  ? { background: "#1BD79E", color: "#006644" }
                  : { background: "#1a1a1a", color: "#adaaaa" }
                }
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Not logged in */}
      {!isLoading && !user && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(27,215,158,0.1)", border: "1px solid rgba(27,215,158,0.2)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h2 className="font-Space-Grotesk font-bold text-white text-[28px] mb-2">Sign in to see your library</h2>
          <p className="font-Manrope text-[#52525b] text-[14px]">Save chords from any chord page to build your personal library.</p>
        </div>
      )}

      {/* Loading skeleton */}
      {(isLoading || fetching) && user && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-[320px] rounded-xl animate-pulse" style={{ background: "#131313" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!fetching && user && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.05)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.75" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h2 className="font-Space-Grotesk font-bold text-white text-[28px] mb-2">No saved chords yet</h2>
          <p className="font-Manrope text-[#52525b] text-[14px] mb-8">Hit &quot;Save Chord&quot; on any chord page to add it here.</p>
          <Link href="/chords/cmajor"
            className="px-6 py-3 rounded-full font-Space-Grotesk font-bold text-[13px] transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)", color: "#006644" }}
          >
            Browse Chords
          </Link>
        </div>
      )}

      {/* Chord Grid */}
      {!fetching && favorites.length > 0 && (
        <>
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-Manrope text-[#52525b] text-[14px]">No saved chords match this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filtered.map(fav => (
                <ChordCard key={fav.id} fav={fav} onRemove={handleRemove} />
              ))}

              {/* Theory Spotlight card — spans 2 cols */}
              <div className="sm:col-span-2 relative p-8 rounded-xl overflow-hidden"
                style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full font-Space-Grotesk font-bold text-[10px] uppercase tracking-widest"
                  style={{ background: "rgba(27,215,158,0.15)", color: "#1BD79E" }}>
                  Theory Spotlight
                </div>
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <h3 className="font-Space-Grotesk font-bold text-white text-[32px] leading-tight mb-2">The CAGED System</h3>
                    <p className="font-Manrope text-[#adaaaa] text-[13px] max-w-xs leading-relaxed">
                      Master the entire fretboard by connecting five basic open chord shapes: C, A, G, E, and D.
                    </p>
                  </div>
                  <div className="mt-8 flex gap-3 flex-wrap">
                    <Link href="/chords/cmajor"
                      className="px-6 py-2.5 rounded-full font-Space-Grotesk font-bold text-[13px]"
                      style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)", color: "#006644" }}>
                      Explore Guide
                    </Link>
                    <Link href="/scales"
                      className="px-6 py-2.5 rounded-full font-Space-Grotesk font-bold text-[13px]"
                      style={{ background: "#262626", color: "#1BD79E" }}>
                      Scale Explorer
                    </Link>
                  </div>
                </div>
                {/* Decorative */}
                <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none select-none"
                  style={{ fontSize: 160, lineHeight: 1, color: "#1BD79E", fontFamily: "Space Grotesk" }}>
                  ♪
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-20 flex flex-col md:flex-row justify-between items-center pt-10 pb-8 gap-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-5">
              <div>
                <h4 className="font-Space-Grotesk font-bold text-white text-[18px]">Can&apos;t find a chord?</h4>
                <p className="font-Manrope text-[#52525b] text-[13px] mt-0.5">Browse the full chord library to discover more.</p>
              </div>
              <Link href="/chords/cmajor"
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{ background: "#1a1a1a", color: "#1BD79E" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Link>
            </div>
            <div className="flex gap-2">
              {["Privacy", "Terms", "Cookie Policy"].map(l => (
                <button key={l} className="px-4 py-2 font-Inter text-[12px] text-[#3f3f46] hover:text-[#adaaaa] transition-colors">{l}</button>
              ))}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

LibraryPage.getLayout = (page: React.ReactElement) => (
  <AppShell mobileTitle="My Library">{page}</AppShell>
);
