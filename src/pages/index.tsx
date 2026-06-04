import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/Navigation/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface Favorite {
  id: string;
  chord_id: string;
  chord_key: string;
  chord_suffix: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DAILY_FOCUS = [
  { chord: "Cmaj7", key: "C", suffix: "maj7", desc: "The quintessential jazz chord. Notice the lush, open character created by the major 7th interval.", level: "Advanced Theory" },
  { chord: "Am7",   key: "A", suffix: "m7",   desc: "A smooth minor 7th chord essential for jazz and bossa nova progressions.", level: "Intermediate" },
  { chord: "G",     key: "G", suffix: "major", desc: "The most common open chord. Master this and unlock hundreds of songs.", level: "Beginner" },
  { chord: "Dm",    key: "D", suffix: "minor", desc: "Rich minor tonality — the foundation of countless emotional progressions.", level: "Beginner" },
];

// Deterministic daily pick based on date
const todaysFocus = DAILY_FOCUS[new Date().getDate() % DAILY_FOCUS.length];

const SUFFIX_LABELS: Record<string, string> = {
  major: "Major", minor: "Minor", "7": "Dominant 7", maj7: "Major 7th",
  m7: "Minor 7th", dim: "Diminished", aug: "Augmented",
};

function MiniFretboard({ chordId }: { chordId: string }) {
  return (
    <div className="relative w-full max-w-md rounded-xl overflow-hidden"
      style={{ background: "#0a0a0a", aspectRatio: "2/1", padding: 24 }}>
      {/* Strings */}
      <div className="absolute inset-0 flex flex-col justify-between py-6 px-2">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="w-full" style={{ height: 1, background: "rgba(118,117,117,0.4)" }} />
        ))}
      </div>
      {/* Frets */}
      <div className="absolute inset-0 flex justify-between px-2">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="h-full" style={{ width: 1, background: "rgba(118,117,117,0.25)" }} />
        ))}
      </div>
      {/* Finger dots */}
      <div className="absolute w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#005c3d]"
        style={{ top: "calc(100%/5*2)", left: "calc(100%/5*2.5)", transform: "translate(-50%,-50%)", background: "#1BD79E", boxShadow: "0 0 16px rgba(27,215,158,0.5)" }}>3</div>
      <div className="absolute w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#005c3d]"
        style={{ top: "calc(100%/5*3)", left: "calc(100%/5*1.5)", transform: "translate(-50%,-50%)", background: "#1BD79E", boxShadow: "0 0 16px rgba(27,215,158,0.5)" }}>2</div>
      <div className="absolute w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#005c3d]"
        style={{ top: "calc(100%/5*5)", left: "calc(100%/5*0.5)", transform: "translate(-50%,-50%)", background: "#1BD79E", boxShadow: "0 0 16px rgba(27,215,158,0.5)" }}>1</div>
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const [recents, setRecents] = useState<Favorite[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => setRecents(data ?? []));
  }, [user]);

  const displayName = user?.email?.split("@")[0] ?? "Guitarist";
  const savedCount = recents.length;

  return (
    <div className="px-8 lg:px-10 py-8 max-w-[1600px]">

      {/* ── Welcome header ── */}
      <header className="mb-10">
        <h2 className="font-Space-Grotesk font-bold text-white tracking-tight"
          style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)" }}>
          Welcome back, {displayName}!
        </h2>
        <p className="font-Manrope mt-2 text-[15px] leading-relaxed max-w-2xl" style={{ color: "#adaaaa" }}>
          Your fretboard awaits. Explore new chords, practice your{" "}
          <span className="font-bold" style={{ color: "#1BD79E" }}>saved library</span>, or jump straight into a session.
        </p>
      </header>

      {/* ── Bento grid ── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Daily Focus — 8 cols */}
        <section className="col-span-12 xl:col-span-8 rounded-xl overflow-hidden flex flex-col md:flex-row relative"
          style={{ background: "#131313" }}>
          <div className="p-8 flex-1 z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="px-3 py-1 rounded-full font-Space-Grotesk font-bold text-[10px] uppercase tracking-widest"
                  style={{ background: "rgba(27,215,158,0.1)", color: "#1BD79E" }}>
                  Daily Focus
                </span>
                <span className="font-Inter text-[11px]" style={{ color: "rgba(173,170,170,0.5)" }}>
                  {todaysFocus.level}
                </span>
              </div>
              <h3 className="font-Space-Grotesk font-bold text-white leading-none mb-2"
                style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>
                {todaysFocus.chord}
              </h3>
              <p className="font-Manrope text-[14px] leading-relaxed max-w-sm mb-8" style={{ color: "#adaaaa" }}>
                {todaysFocus.desc}
              </p>
            </div>
            <Link href={`/chords/${todaysFocus.key.toLowerCase()}${todaysFocus.suffix}`}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-Space-Grotesk font-bold text-[14px] self-start transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #aeffd4 0%, #10feb0 100%)", color: "#005c3d" }}>
              Practice Chord
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#005c3d"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </Link>
          </div>

          {/* Mini fretboard */}
          <div className="flex-1 flex items-center justify-center p-8 min-h-[240px]"
            style={{ background: "rgba(32,32,31,0.4)" }}>
            <MiniFretboard chordId={`${todaysFocus.key.toLowerCase()}${todaysFocus.suffix}`} />
          </div>
        </section>

        {/* Streak / Stats — 4 cols */}
        <section className="col-span-12 xl:col-span-4 rounded-xl p-7 flex flex-col items-center justify-center text-center"
          style={{ background: "#1a1a1a" }}>
          {/* Circular progress */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-5">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="68" fill="transparent" stroke="#0a0a0a" strokeWidth="8" />
              <circle cx="80" cy="80" r="68" fill="transparent"
                stroke="#1BD79E" strokeWidth="8" strokeLinecap="round"
                strokeDasharray="427.3"
                strokeDashoffset={427.3 * (1 - Math.min(savedCount / 10, 1))}
                style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-Space-Grotesk font-bold text-white" style={{ fontSize: 48, lineHeight: 1 }}>
                {savedCount}
              </span>
              <span className="font-Inter text-[10px] uppercase tracking-widest mt-1" style={{ color: "#adaaaa" }}>
                Saved Chords
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="rounded-xl p-4" style={{ background: "#0a0a0a" }}>
              <p className="font-Space-Grotesk font-bold text-[28px] leading-none" style={{ color: "#1BD79E" }}>
                {savedCount}
              </p>
              <p className="font-Inter text-[10px] uppercase tracking-widest mt-1" style={{ color: "#adaaaa" }}>In Library</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#0a0a0a" }}>
              <p className="font-Space-Grotesk font-bold text-[28px] leading-none" style={{ color: "#82e9ff" }}>
                {isLoading ? "—" : user ? "✓" : "—"}
              </p>
              <p className="font-Inter text-[10px] uppercase tracking-widest mt-1" style={{ color: "#adaaaa" }}>Signed In</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-6 flex justify-center gap-2">
            {[
              { href: "/library", label: "Library" },
              { href: "/scales", label: "Scales" },
              { href: "/ear-training", label: "Ear Training" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 rounded-full font-Inter text-[11px] transition-all hover:text-white"
                style={{ background: "#262626", color: "#52525b" }}>
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* Recently Saved — 8 cols */}
        <section className="col-span-12 xl:col-span-8">
          <div className="flex items-center justify-between mb-5">
            <h4 className="font-Space-Grotesk font-bold text-white text-[20px]">Recently Saved</h4>
            <Link href="/library" className="font-Space-Grotesk font-bold text-[13px] hover:underline" style={{ color: "#1BD79E" }}>
              View All
            </Link>
          </div>

          {!user && !isLoading && (
            <div className="rounded-xl p-8 text-center" style={{ background: "#131313" }}>
              <p className="font-Manrope text-[14px]" style={{ color: "#52525b" }}>
                Sign in to see your saved chords here.
              </p>
            </div>
          )}

          {user && recents.length === 0 && !isLoading && (
            <div className="rounded-xl p-8 text-center" style={{ background: "#131313" }}>
              <p className="font-Manrope text-[14px] mb-4" style={{ color: "#52525b" }}>
                No saved chords yet. Start exploring!
              </p>
              <Link href="/chords/cmajor"
                className="inline-block px-5 py-2 rounded-full font-Space-Grotesk font-bold text-[13px]"
                style={{ background: "rgba(27,215,158,0.1)", color: "#1BD79E", border: "1px solid rgba(27,215,158,0.2)" }}>
                Browse Chords
              </Link>
            </div>
          )}

          {recents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recents.slice(0, 4).map((fav, i) => {
                const displayName = fav.chord_suffix === "major" ? fav.chord_key
                  : fav.chord_suffix === "minor" ? `${fav.chord_key}m`
                  : fav.chord_suffix === "7" ? `${fav.chord_key}7`
                  : `${fav.chord_key}${fav.chord_suffix}`;
                const label = SUFFIX_LABELS[fav.chord_suffix] ?? fav.chord_suffix;
                const savedTime = timeAgo(fav.created_at);
                return (
                  <Link key={fav.id} href={`/chords/${fav.chord_id}`}
                    className="flex items-center gap-5 p-5 rounded-xl transition-all hover:scale-[1.01]"
                    style={{ background: "#131313", border: "1px solid transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                  >
                    <div className="w-[72px] h-[72px] rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: "#262626", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="font-Space-Grotesk font-bold text-white text-[20px] leading-none">{displayName}</span>
                      <span className="font-Inter text-[8px] uppercase tracking-tighter mt-0.5" style={{ color: "#52525b" }}>{label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-Space-Grotesk font-bold text-white text-[16px] leading-tight">{displayName}</p>
                      <p className="font-Inter text-[12px] mt-0.5" style={{ color: "#71717a" }}>{label}</p>
                      <p className="font-Inter text-[11px] mt-3 flex items-center gap-1" style={{ color: "rgba(173,170,170,0.4)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Saved {savedTime}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Actions — 4 cols */}
        <section className="col-span-12 xl:col-span-4 flex flex-col gap-4">
          {[
            {
              href: "/tuner",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="1.75" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10s0 7 7 7 7-7 7-7"/><line x1="12" y1="17" x2="12" y2="22"/>
                </svg>
              ),
              title: "Tuner",
              desc: "Standard EADGBE",
              badge: { label: "Active", color: "#1BD79E" },
              iconBg: "#0a0a0a",
            },
            {
              href: "/metronome",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#82e9ff" strokeWidth="1.75" strokeLinecap="round">
                  <polygon points="12 2 22 20 2 20"/><line x1="12" y1="9" x2="16" y2="17"/>
                </svg>
              ),
              title: "Metronome",
              desc: "120 BPM · 4/4 Time",
              badge: null,
              iconBg: "#0a0a0a",
            },
            {
              href: "/scales",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aeffd4" strokeWidth="1.75" strokeLinecap="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <line x1="7" y1="4" x2="7" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/>
                </svg>
              ),
              title: "Scale Explorer",
              desc: "Fretboard patterns",
              badge: null,
              iconBg: "#0a0a0a",
            },
          ].map(({ href, icon, title, desc, badge }) => (
            <Link key={href} href={href}
              className="rounded-xl p-5 flex items-center justify-between transition-all hover:scale-[1.01] cursor-pointer"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#0a0a0a" }}>
                  {icon}
                </div>
                <div>
                  <h5 className="font-Space-Grotesk font-bold text-white text-[15px]">{title}</h5>
                  <p className="font-Inter text-[12px] mt-0.5" style={{ color: "#52525b" }}>{desc}</p>
                </div>
              </div>
              {badge ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: badge.color }} />
                  <span className="font-Inter text-[10px] font-bold uppercase tracking-widest" style={{ color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              )}
            </Link>
          ))}
        </section>

      </div>
    </div>
  );
}

Home.getLayout = (page: React.ReactElement) => (
  <AppShell mobileTitle="Home">{page}</AppShell>
);
