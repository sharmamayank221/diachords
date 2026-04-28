import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import data from "@/chrods.json";
import { SCALES } from "@/data/scales";
import type { A } from "@/types/chord.types";

// ── Static data ───────────────────────────────────────────────────────────────

const TOOL_ITEMS = [
  { label: "Chord Library",   href: "/chords/cmajor",       desc: "Browse 2,000+ guitar chords",          tag: "Tool" },
  { label: "Scale Explorer",  href: "/scales",              desc: "Interactive fretboard + pitch detection",tag: "Tool" },
  { label: "Ear Training",    href: "/ear-training",        desc: "Interval, chord & scale recognition",   tag: "Tool" },
  { label: "Chord Detect",    href: "/chord-recognition",   desc: "Real-time chord recognition from mic",  tag: "Tool" },
  { label: "Guitar Tuner",    href: "/tuner",               desc: "Chromatic pitch detection",             tag: "Tool" },
  { label: "Metronome",       href: "/metronome",           desc: "Keep perfect time while you play",      tag: "Tool" },
  { label: "Jam Session",     href: "/jam",                 desc: "AI backing tracks for practice",        tag: "Tool" },
];

const TRENDING = ["C major","Am","G pentatonic","D minor","E blues","Cadd9","Major scale","Bm7"];

const SCALE_NOTES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

// Format a chord's display name — add space before long English-word suffixes
function formatChordName(key: string, suffix: string): string {
  if (!suffix) return key;
  const longSuffixes = ["major", "minor", "augmented", "diminished", "suspended", "dominant"];
  if (longSuffixes.some(ls => suffix.toLowerCase().startsWith(ls))) return `${key} ${suffix}`;
  return `${key}${suffix}`;
}

// Build flat chord list once at module level
interface ChordEntry { chord: A; fullName: string; displayName: string; id: string }
const ALL_CHORDS: ChordEntry[] = (() => {
  const list: ChordEntry[] = [];
  for (const key of Object.keys(data.chords)) {
    for (const chord of (data.chords as Record<string, A[]>)[key]) {
      const suffix = chord.suffix ?? "";
      const fullName = `${chord.key}${suffix}`;
      const displayName = formatChordName(chord.key, suffix);
      const id = (chord.key + suffix).toLowerCase().replace(/\//g, "");
      list.push({ chord: chord as A, fullName, displayName, id });
    }
  }
  return list;
})();

// Build flat scale list
interface ScaleEntry { key: string; name: string; desc: string }
const ALL_SCALES: ScaleEntry[] = Object.entries(SCALES).map(([key, s]) => ({
  key,
  name: s.name,
  desc: s.description,
}));

// ── Fuzzy match ───────────────────────────────────────────────────────────────

function score(query: string, target: string): number {
  // Normalize both sides — remove spaces so "C major" matches "Cmajor"
  const q = query.toLowerCase().replace(/\s+/g, "").trim();
  const t = target.toLowerCase().replace(/\s+/g, "");
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;
  // Sequential character fuzzy match (e.g. "amj" → "Amaj7")
  let qi = 0, consecutive = 0, maxConsecutive = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { qi++; consecutive++; maxConsecutive = Math.max(maxConsecutive, consecutive); }
    else { consecutive = 0; }
  }
  if (qi === q.length) return 50 + (maxConsecutive / q.length) * 18;
  return 0;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const SearchIcon = ({ size = 20, color = "#52525b" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ChordIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <line x1="7" y1="4" x2="7" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/>
  </svg>
);

const ScaleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 20V10M12 20V4M6 20v-6"/>
  </svg>
);

const ToolIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState((router.query.q as string) ?? "");
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("cog_recent_searches") ?? "[]");
      setRecent(Array.isArray(stored) ? stored.slice(0, 8) : []);
    } catch { setRecent([]); }
  }, []);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Sync ?q= query param
  useEffect(() => {
    const q = router.query.q as string | undefined;
    if (q && q !== query) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.q]);

  const saveRecent = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecent(prev => {
      const next = [trimmed, ...prev.filter(r => r !== trimmed)].slice(0, 8);
      try { localStorage.setItem("cog_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem("cog_recent_searches"); } catch {}
  };

  // ── Search results ──────────────────────────────────────────────────────────

  const chordResults = useMemo(() => {
    if (!query.trim()) return [];
    return ALL_CHORDS
      .map(e => ({ ...e, score: score(query, e.fullName) }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
  }, [query]);

  const scaleResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return ALL_SCALES
      .filter(s => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.key.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  const toolResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return TOOL_ITEMS.filter(t =>
      t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    );
  }, [query]);

  const hasResults = chordResults.length + scaleResults.length + toolResults.length > 0;
  const showEmpty  = query.trim().length > 0 && !hasResults;

  // Group chord results by key
  const chordGroups = useMemo(() => {
    const groups: Record<string, ChordEntry[]> = {};
    for (const r of chordResults) {
      if (!groups[r.chord.key]) groups[r.chord.key] = [];
      groups[r.chord.key].push(r);
    }
    return groups;
  }, [chordResults]);

  const handleSearchSubmit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`, undefined, { shallow: true });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearchSubmit(query);
    if (e.key === "Escape") { setQuery(""); inputRef.current?.blur(); }
  };

  const handleChordClick = (chord: A) => {
    const path = `/chords/${encodeURIComponent(chord.key.toLowerCase())}${chord.suffix ?? ""}`;
    saveRecent(query || chord.key);
    router.push(path);
  };

  const handleSuggestion = (q: string) => {
    setQuery(q);
    handleSearchSubmit(q);
    inputRef.current?.focus();
  };

  // ── Shared blocks ───────────────────────────────────────────────────────────

  const SearchInput = (large = false) => (
    <div className="relative flex items-center">
      <div className="absolute left-4 pointer-events-none">
        <SearchIcon size={large ? 22 : 18} color={focused ? "#1BD79E" : "#52525b"} />
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search chords, scales, or tools…"
        className="w-full font-Manrope font-medium text-white placeholder-[#3f3f46] bg-[#0b0b0b] focus:outline-none transition-all"
        style={{
          fontSize: large ? "18px" : "15px",
          height: large ? "60px" : "50px",
          paddingLeft: large ? "52px" : "44px",
          paddingRight: query ? (large ? "52px" : "44px") : "16px",
          borderRadius: "16px",
          border: focused ? "1px solid rgba(27,215,158,0.4)" : "1px solid rgba(255,255,255,0.07)",
          boxShadow: focused ? "0 0 0 3px rgba(27,215,158,0.06)" : "none",
        }}
        autoComplete="off"
        spellCheck="false"
      />
      {query && (
        <button
          className="absolute right-4 text-[#52525b] hover:text-white transition-colors"
          onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
          <XIcon />
        </button>
      )}
    </div>
  );

  const RecentSearches = recent.length > 0 ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon />
          <p className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-[2px]">RECENT</p>
        </div>
        <button onClick={clearRecent} className="font-Inter text-[11px] text-[#3f3f46] hover:text-[#adaaaa] transition-colors">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map(r => (
          <button key={r} onClick={() => handleSuggestion(r)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131313] border border-white/5 font-Manrope text-[13px] text-[#adaaaa] hover:border-[#1BD79E]/30 hover:text-white transition-all">
            <ClockIcon />
            {r}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const TrendingSearches = (
    <div className="flex flex-col gap-3">
      <p className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-[2px]">TRENDING</p>
      <div className="flex flex-wrap gap-2">
        {TRENDING.map(t => (
          <button key={t} onClick={() => handleSuggestion(t)}
            className="px-3 py-1.5 rounded-full bg-[#131313] border border-white/5 font-Manrope text-[13px] text-[#52525b] hover:border-[#1BD79E]/30 hover:text-[#1BD79E] transition-all">
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Chord results block ─────────────────────────────────────────────────────

  const ChordResults = chordResults.length > 0 ? (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[#1BD79E]"><ChordIcon /></span>
        <p className="font-Space-Grotesk font-bold text-white text-[15px]">Chords</p>
        <span className="font-Inter text-[11px] text-[#3f3f46] ml-auto">{chordResults.length} found</span>
      </div>
      {Object.entries(chordGroups).map(([key, entries]) => (
        <div key={key} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#1BD79E]/15 border border-[#1BD79E]/30 flex items-center justify-center">
              <span className="font-Space-Grotesk font-bold text-[#1BD79E] text-[11px]">{key}</span>
            </div>
            <div className="h-px flex-1 bg-[#1a1a1a]" />
          </div>
          <div className="flex flex-wrap gap-2">
            {entries.map(e => (
              <button key={e.id} onClick={() => handleChordClick(e.chord)}
                className="px-3 py-2 rounded-xl font-Space-Grotesk font-bold text-[14px] bg-[#131313] border border-white/5 text-white hover:bg-[#1BD79E]/10 hover:border-[#1BD79E]/30 hover:text-[#1BD79E] transition-all">
                {e.displayName}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : null;

  // ── Scale results block ─────────────────────────────────────────────────────

  const ScaleResults = scaleResults.length > 0 ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[#38DBE5]"><ScaleIcon /></span>
        <p className="font-Space-Grotesk font-bold text-white text-[15px]">Scales</p>
        <span className="font-Inter text-[11px] text-[#3f3f46] ml-auto">{scaleResults.length} found</span>
      </div>
      {scaleResults.map(s => {
        const scaleIntervals = SCALES[s.key]?.intervals ?? [];
        const scaleNoteNames = scaleIntervals.map(i => SCALE_NOTES[i % 12]);
        return (
          <Link key={s.key} href={`/scales?scale=${encodeURIComponent(s.key)}`}
            className="flex items-start justify-between gap-4 bg-[#0b0b0b] border border-[#1a1a1a] rounded-2xl px-5 py-4 hover:border-[#38DBE5]/20 transition-all group"
            onClick={() => saveRecent(query)}>
            <div>
              <p className="font-Space-Grotesk font-bold text-[14px] text-white group-hover:text-[#38DBE5] transition-colors">{s.name}</p>
              <p className="font-Manrope text-[12px] text-[#52525b] mt-0.5 leading-relaxed">{s.desc}</p>
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {scaleNoteNames.map(n => (
                  <span key={n} className="px-2 py-0.5 rounded-md font-Inter text-[10px] bg-[#131313] text-[#38DBE5]/60 border border-white/5">{n}</span>
                ))}
              </div>
            </div>
            <span className="text-[#3f3f46] group-hover:text-[#38DBE5] transition-colors mt-1 shrink-0"><ArrowRight /></span>
          </Link>
        );
      })}
    </div>
  ) : null;

  // ── Tool results block ──────────────────────────────────────────────────────

  const ToolResults = toolResults.length > 0 ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[#f59e0b]"><ToolIcon /></span>
        <p className="font-Space-Grotesk font-bold text-white text-[15px]">Tools</p>
      </div>
      {toolResults.map(t => (
        <Link key={t.href} href={t.href}
          className="flex items-center justify-between gap-4 bg-[#0b0b0b] border border-[#1a1a1a] rounded-2xl px-5 py-4 hover:border-[#f59e0b]/20 transition-all group"
          onClick={() => saveRecent(query)}>
          <div>
            <p className="font-Space-Grotesk font-bold text-[14px] text-white group-hover:text-[#f59e0b] transition-colors">{t.label}</p>
            <p className="font-Manrope text-[12px] text-[#52525b] mt-0.5">{t.desc}</p>
          </div>
          <span className="text-[#3f3f46] group-hover:text-[#f59e0b] transition-colors shrink-0"><ArrowRight /></span>
        </Link>
      ))}
    </div>
  ) : null;

  // ── Empty state ─────────────────────────────────────────────────────────────

  const EmptyState = (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#131313] border border-white/5 flex items-center justify-center">
        <SearchIcon size={28} color="#3f3f46" />
      </div>
      <div>
        <p className="font-Space-Grotesk font-bold text-white text-[18px]">No results for &ldquo;{query}&rdquo;</p>
        <p className="font-Manrope text-[#52525b] text-[14px] mt-1">Try a chord name like &ldquo;Am7&rdquo;, a scale like &ldquo;pentatonic&rdquo;, or a tool name.</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {["C major","Am","Major scale","Tuner"].map(s => (
          <button key={s} onClick={() => handleSuggestion(s)}
            className="px-3 py-1.5 rounded-full bg-[#131313] border border-white/5 font-Manrope text-[13px] text-[#52525b] hover:text-white hover:border-white/15 transition-all">
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  // ── MOBILE VIEW ─────────────────────────────────────────────────────────────

  const MobileView = (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-20 px-5 py-4 border-b border-[#1a1a1a]"
        style={{ backdropFilter: "blur(16px)", background: "rgba(14,14,14,0.9)" }}>
        {SearchInput(false)}
      </div>

      <div className="px-5 py-5 flex flex-col gap-6 flex-1">
        {!query.trim() ? (
          <>
            {RecentSearches}
            {TrendingSearches}

            {/* Quick category links */}
            <div className="flex flex-col gap-3">
              <p className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-[2px]">BROWSE</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Chord Library", href: "/chords/cmajor", color: "#1BD79E", icon: <ChordIcon /> },
                  { label: "Scale Explorer", href: "/scales", color: "#38DBE5", icon: <ScaleIcon /> },
                  { label: "Ear Training", href: "/ear-training", color: "#8b5cf6", icon: <ToolIcon /> },
                  { label: "Guitar Tuner", href: "/tuner", color: "#f59e0b", icon: <ToolIcon /> },
                ].map(item => (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-3 bg-[#0b0b0b] border border-[#1a1a1a] rounded-2xl px-4 py-4 hover:border-white/10 transition-all group">
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span className="font-Space-Grotesk font-bold text-[13px] text-white">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {showEmpty && EmptyState}
            {ChordResults}
            {ScaleResults}
            {ToolResults}
          </>
        )}
      </div>
    </div>
  );

  // ── DESKTOP VIEW ─────────────────────────────────────────────────────────────

  const DesktopView = (
    <div className="px-8 pt-6 pb-16">

      {/* Hero + search */}
      <div className="mb-10">
        <h2 className="font-Space-Grotesk font-bold text-[64px] leading-none tracking-[-2px] text-white mb-6">Search</h2>
        <div className="max-w-2xl">{SearchInput(true)}</div>

        {/* Suggested tags */}
        {!query.trim() && (
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-wider">Try:</span>
            {TRENDING.map(t => (
              <button key={t} onClick={() => handleSuggestion(t)}
                className="px-3 py-1.5 rounded-full bg-[#131313] border border-white/5 font-Manrope text-[13px] text-[#52525b] hover:border-[#1BD79E]/30 hover:text-[#1BD79E] transition-all">
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {!query.trim() ? (
        /* ── No query: show recent + browse grid ── */
        <div className="flex flex-col gap-8">
          {recent.length > 0 && (
            <div className="max-w-2xl">{RecentSearches}</div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* Left: tool cards */}
            <div className="col-span-8 flex flex-col gap-4">
              <p className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-[2px]">ALL TOOLS</p>
              <div className="grid grid-cols-2 gap-3">
                {TOOL_ITEMS.map(t => (
                  <Link key={t.href} href={t.href}
                    className="flex items-center justify-between bg-[#0b0b0b] border border-[#1a1a1a] rounded-2xl px-5 py-4 hover:border-white/10 transition-all group">
                    <div>
                      <p className="font-Space-Grotesk font-bold text-[14px] text-white group-hover:text-[#1BD79E] transition-colors">{t.label}</p>
                      <p className="font-Manrope text-[12px] text-[#52525b] mt-0.5">{t.desc}</p>
                    </div>
                    <span className="text-[#3f3f46] group-hover:text-[#1BD79E] transition-colors"><ArrowRight /></span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: popular chords */}
            <div className="col-span-4 flex flex-col gap-4">
              <p className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-[2px]">POPULAR CHORDS</p>
              <div className="flex flex-wrap gap-2">
                {["C","Am","G","F","Em","Dm","D","A","E","B","Bm","C#m","Am7","Cmaj7","G7","D7","A7","E7","Cadd9","Gsus4"].map(c => {
                  const entry = ALL_CHORDS.find(e => e.fullName === c || (e.chord.key === c && !e.chord.suffix));
                  const href = entry
                    ? `/chords/${encodeURIComponent(entry.chord.key.toLowerCase())}${entry.chord.suffix ?? ""}`
                    : `/chords/${c.toLowerCase()}major`;
                  return (
                    <Link key={c} href={href}
                      className="px-3 py-2 rounded-xl font-Space-Grotesk font-bold text-[13px] bg-[#131313] border border-white/5 text-white hover:bg-[#1BD79E]/10 hover:border-[#1BD79E]/30 hover:text-[#1BD79E] transition-all">
                      {c}
                    </Link>
                  );
                })}
              </div>

              <p className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-[2px] mt-2">SCALE CATEGORIES</p>
              <div className="flex flex-col gap-2">
                {ALL_SCALES.slice(0, 6).map(s => (
                  <Link key={s.key} href={`/scales?scale=${encodeURIComponent(s.key)}`}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0b0b0b] border border-[#1a1a1a] hover:border-[#38DBE5]/20 transition-all group">
                    <span className="font-Manrope font-semibold text-[13px] text-white group-hover:text-[#38DBE5] transition-colors">{s.name}</span>
                    <ArrowRight />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Results ── */
        <div>
          {showEmpty && <div className="max-w-xl">{EmptyState}</div>}

          {hasResults && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left: Chords */}
              <div className="col-span-7 flex flex-col gap-6">
                {ChordResults}
              </div>

              {/* Right: Scales + Tools */}
              <div className="col-span-5 flex flex-col gap-6">
                {ScaleResults}
                {ToolResults}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="lg:hidden">{MobileView}</div>
      <div className="hidden lg:block">{DesktopView}</div>
    </>
  );
}
