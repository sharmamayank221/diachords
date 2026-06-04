import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "@/components/Auth/LoginModal";
import UserMenu from "@/components/Auth/UserMenu";

// ── Nav data ──────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  match?: string[];   // additional paths that count as "active" for this item
}

const LearnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const FretboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <line x1="7" y1="4" x2="7" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/>
  </svg>
);

const EarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10s0 7 7 7 7-7 7-7"/><line x1="12" y1="17" x2="12" y2="22"/>
  </svg>
);

const MetroIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 20 2 20"/><line x1="12" y1="9" x2="16" y2="17"/>
  </svg>
);

const JamIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);

const TunerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
);

const LEARN_ITEMS: NavItem[] = [
  {
    href: "/chords/cmajor",
    label: "Chord Library",
    description: "Browse 2,000+ guitar chords",
    icon: <LearnIcon />,
    match: ["/chords"],
  },
  {
    href: "/scales",
    label: "Scale Explorer",
    description: "Interactive fretboard + pitch detection",
    icon: <FretboardIcon />,
  },
  {
    href: "/ear-training",
    label: "Ear Training",
    description: "Interval, chord & scale recognition",
    icon: <EarIcon />,
  },
];

const PRACTICE_ITEMS: NavItem[] = [
  {
    href: "/chord-recognition",
    label: "Chord Detect",
    description: "Real-time chord recognition from mic",
    icon: <MicIcon />,
  },
  {
    href: "/metronome",
    label: "Metronome",
    description: "Keep perfect time while you play",
    icon: <MetroIcon />,
  },
  {
    href: "/jam",
    label: "Jam Session",
    description: "Play along with AI backing tracks",
    icon: <JamIcon />,
  },
];

const TOOL_ITEMS: NavItem[] = [
  {
    href: "/tuner",
    label: "Tuner",
    description: "Keep your guitar in tune",
    icon: <TunerIcon />,
  },
];

const SavedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const LIBRARY_ITEM: NavItem = {
  href: "/library",
  label: "My Library",
  description: "Your saved chords",
  icon: <SavedIcon />,
};

const ALL_ITEMS = [...LEARN_ITEMS, ...PRACTICE_ITEMS, ...TOOL_ITEMS, LIBRARY_ITEM];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (item.match) return item.match.some(m => pathname.startsWith(m));
  return false;
}

function useActiveItem(pathname: string) {
  return ALL_ITEMS.find(item => isActive(item, pathname)) ?? null;
}

// ── Desktop sidebar group row ─────────────────────────────────────────────────

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item, pathname);
  return (
    <Link href={item.href}
      className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active ? "bg-[#1BD79E]/10" : "hover:bg-white/5"}`}
      style={{ borderRight: active ? "2px solid #1BD79E" : "2px solid transparent" }}>
      <span style={{ color: active ? "#1BD79E" : "#52525b" }} className="transition-colors group-hover:text-[#adaaaa]">
        {item.icon}
      </span>
      <span className={`font-Manrope text-[14px] leading-tight transition-colors ${active ? "font-bold text-[#1BD79E]" : "font-medium text-[#52525b] group-hover:text-[#adaaaa]"}`}>
        {item.label}
      </span>
    </Link>
  );
}

// ── Mobile bottom-sheet item ──────────────────────────────────────────────────

function SheetItem({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose: () => void }) {
  const active = isActive(item, pathname);
  return (
    <Link href={item.href} onClick={onClose}
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${active ? "bg-[#1BD79E]/10 border border-[#1BD79E]/20" : "bg-[#1a1a1a] border border-white/5 hover:border-white/15"}`}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: active ? "rgba(27,215,158,0.15)" : "rgba(255,255,255,0.04)" }}>
        <span style={{ color: active ? "#1BD79E" : "#71717a" }}>{item.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-Space-Grotesk font-bold text-[15px] ${active ? "text-[#1BD79E]" : "text-white"}`}>{item.label}</p>
        <p className="font-Inter text-[12px] text-[#555] truncate mt-0.5">{item.description}</p>
      </div>
      <ChevronRight />
    </Link>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode;
  mobileTitle: string;
  /** Optional: additional content shown in the desktop top bar right side */
  topBarRight?: React.ReactNode;
}

export default function AppShell({ children, mobileTitle, topBarRight }: AppShellProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, isLoading } = useAuth();

  const learnActive    = LEARN_ITEMS.some(i => isActive(i, pathname));
  const practiceActive = PRACTICE_ITEMS.some(i => isActive(i, pathname));
  const tunerActive    = isActive(TOOL_ITEMS[0], pathname);
  const chordsActive   = isActive(LEARN_ITEMS[0], pathname);
  const scalesActive   = isActive(LEARN_ITEMS[1], pathname);

  return (
    <>
      {/* ────── DESKTOP ────── */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-[#0e0e0e]">

        {/* Sidebar */}
        <aside className="fixed top-0 left-0 h-full w-64 bg-[#0e0e0e] border-r border-[#1a1a1a] flex flex-col z-40">
          {/* Brand */}
          <div className="px-6 pt-7 pb-5">
            <Link href="/">
              <h1 className="font-Space-Grotesk font-bold text-[18px] text-[#1BD79E] tracking-tight leading-tight">ChordsofGuitar</h1>
            </Link>
          </div>

          {/* Home + Search */}
          <div className="px-4 mb-2 flex flex-col gap-0.5">
            <Link href="/"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${pathname === "/" ? "bg-[#1BD79E]/10" : "hover:bg-white/5"}`}
              style={{ borderRight: pathname === "/" ? "2px solid #1BD79E" : "2px solid transparent" }}>
              <span style={{ color: pathname === "/" ? "#1BD79E" : "#52525b" }}><HomeIcon /></span>
              <span className={`font-Manrope text-[14px] ${pathname === "/" ? "font-bold text-[#1BD79E]" : "font-medium text-[#52525b]"}`}>Home</span>
            </Link>
            <Link href="/search"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${pathname === "/search" ? "bg-[#1BD79E]/10" : "hover:bg-white/5"}`}
              style={{ borderRight: pathname === "/search" ? "2px solid #1BD79E" : "2px solid transparent" }}>
              <span style={{ color: pathname === "/search" ? "#1BD79E" : "#52525b" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <span className={`font-Manrope text-[14px] ${pathname === "/search" ? "font-bold text-[#1BD79E]" : "font-medium text-[#52525b]"}`}>Search</span>
            </Link>
          </div>

          <div className="flex-1 px-4 flex flex-col gap-5 overflow-y-auto pb-4">
            {/* LEARN / THEORY */}
            <div>
              <p className="font-Inter text-[10px] text-[#3f3f46] tracking-[2px] uppercase px-4 mb-2">LEARN</p>
              <div className="flex flex-col gap-0.5">
                {LEARN_ITEMS.map(item => <SidebarItem key={item.href} item={item} pathname={pathname} />)}
              </div>
            </div>

            {/* PRACTICE */}
            <div>
              <p className="font-Inter text-[10px] text-[#3f3f46] tracking-[2px] uppercase px-4 mb-2">PRACTICE</p>
              <div className="flex flex-col gap-0.5">
                {PRACTICE_ITEMS.map(item => <SidebarItem key={item.href} item={item} pathname={pathname} />)}
              </div>
            </div>

            {/* TOOLS */}
            <div>
              <p className="font-Inter text-[10px] text-[#3f3f46] tracking-[2px] uppercase px-4 mb-2">TOOLS</p>
              <div className="flex flex-col gap-0.5">
                {TOOL_ITEMS.map(item => <SidebarItem key={item.href} item={item} pathname={pathname} />)}
              </div>
            </div>

            {/* MY LIBRARY */}
            <div>
              <p className="font-Inter text-[10px] text-[#3f3f46] tracking-[2px] uppercase px-4 mb-2">MY LIBRARY</p>
              <div className="flex flex-col gap-0.5">
                <SidebarItem item={LIBRARY_ITEM} pathname={pathname} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#1a1a1a] px-6 py-5">
            <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[1.5px]">CHORDSOFGUITAR.COM</p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
          {/* Top bar */}
          <header className="flex-shrink-0 z-30 h-14 flex items-center justify-between px-8 border-b border-[#1a1a1a]"
            style={{ backdropFilter: "blur(16px)", background: "rgba(14,14,14,0.85)" }}>
            <div className="flex items-center gap-2">
              {/* Breadcrumb */}
              {learnActive && (
                <span className="font-Inter text-[12px] text-[#3f3f46] uppercase tracking-[1px]">Learn /</span>
              )}
              {practiceActive && (
                <span className="font-Inter text-[12px] text-[#3f3f46] uppercase tracking-[1px]">Practice /</span>
              )}
              {tunerActive && (
                <span className="font-Inter text-[12px] text-[#3f3f46] uppercase tracking-[1px]">Tools /</span>
              )}
              <span className="font-Space-Grotesk font-bold text-white text-[15px]">{mobileTitle}</span>
            </div>
            <div className="flex items-center gap-3">
              {topBarRight}
              <Link href="/search"
                className="w-8 h-8 rounded-full bg-[#131313] border border-white/5 flex items-center justify-center hover:border-[#1BD79E]/30 hover:bg-[#1BD79E]/5 transition-all"
                title="Search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </Link>
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

          {/* Page content */}
          <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
        </div>
      </div>

      {/* ────── MOBILE ────── */}
      <div className="lg:hidden min-h-screen bg-[#0e0e0e] flex flex-col">

        {/* Mobile header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]"
          style={{ backdropFilter: "blur(12px)", background: "rgba(14,14,14,0.9)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-white/5 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#adaaaa" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="font-Space-Grotesk font-bold text-white text-[18px]">{mobileTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/search"
              className="w-9 h-9 rounded-full bg-[#131313] border border-white/5 flex items-center justify-center hover:border-[#1BD79E]/30 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </Link>
            {!isLoading && (
              user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="w-9 h-9 rounded-full bg-[#1BD79E]/10 border border-[#1BD79E]/30 flex items-center justify-center hover:bg-[#1BD79E]/20 transition-all"
                  title="Sign in"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>
              )
            )}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 pb-24">{children}</main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40"
          style={{
            backdropFilter: "blur(16px)",
            background: "rgba(10,10,10,0.92)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "16px 16px 0 0",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.6)",
          }}>
          <div className="flex items-stretch h-20 max-w-[430px] mx-auto">

            {/* Chords */}
            <Link href="/chords/cmajor" className="flex-1 flex flex-col items-center justify-center gap-1 relative">
              <div className={`flex flex-col items-center gap-1 ${chordsActive ? "opacity-100" : "opacity-40"}`}>
                <LearnIcon />
                <span className="font-Inter text-[10px] font-medium tracking-[0.8px] uppercase"
                  style={{ color: chordsActive ? "#1BD79E" : "white" }}>Chords</span>
              </div>
              {chordsActive && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1BD79E]" />}
            </Link>

            {/* Scales */}
            <Link href="/scales" className="flex-1 flex flex-col items-center justify-center gap-1 relative">
              <div className={`flex flex-col items-center gap-1 ${scalesActive ? "opacity-100" : "opacity-40"}`}>
                <FretboardIcon />
                <span className="font-Inter text-[10px] font-medium tracking-[0.8px] uppercase"
                  style={{ color: scalesActive ? "#1BD79E" : "white" }}>Scales</span>
              </div>
              {scalesActive && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1BD79E]" />}
            </Link>

            {/* Practice (opens bottom sheet) */}
            <button className="flex-1 flex flex-col items-center justify-center gap-1 relative"
              onClick={() => setSheetOpen(true)}>
              <div className={`flex flex-col items-center gap-1 ${practiceActive ? "opacity-100" : "opacity-40"}`}>
                <MicIcon />
                <span className="font-Inter text-[10px] font-medium tracking-[0.8px] uppercase"
                  style={{ color: practiceActive ? "#1BD79E" : "white" }}>Practice</span>
              </div>
              {practiceActive && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1BD79E]" />}
            </button>

            {/* Tuner */}
            <Link href="/tuner" className="flex-1 flex flex-col items-center justify-center gap-1 relative">
              <div className={`flex flex-col items-center gap-1 ${tunerActive ? "opacity-100" : "opacity-40"}`}>
                <TunerIcon />
                <span className="font-Inter text-[10px] font-medium tracking-[0.8px] uppercase"
                  style={{ color: tunerActive ? "#1BD79E" : "white" }}>Tuner</span>
              </div>
              {tunerActive && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1BD79E]" />}
            </Link>
          </div>
        </nav>

        {/* Practice bottom sheet */}
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />

            {/* Sheet */}
            <div className="relative rounded-t-3xl z-10 pb-10"
              style={{ background: "rgba(16,16,16,0.98)", border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none" }}>
              {/* Handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-10 h-1 rounded-full bg-[#2a2a2a]" />
              </div>

              {/* Header */}
              <div className="px-6 pb-5 pt-2 border-b border-[#1a1a1a]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">SECTION</p>
                    <h3 className="font-Space-Grotesk font-bold text-white text-[22px]">Practice</h3>
                    <p className="font-Manrope text-[#555] text-[13px] mt-0.5">Active tools for playing & training</p>
                  </div>
                  <button onClick={() => setSheetOpen(false)}
                    className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-[#555] hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="px-5 pt-4 flex flex-col gap-3">
                {PRACTICE_ITEMS.map(item => (
                  <SheetItem key={item.href} item={item} pathname={pathname} onClose={() => setSheetOpen(false)} />
                ))}

                {/* Ear Training is LEARN but also a practice tool — show here too */}
                <div className="pt-2 border-t border-[#1a1a1a] mt-1">
                  <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px] mb-3 px-1">ALSO IN LEARN</p>
                  <SheetItem item={LEARN_ITEMS[2]} pathname={pathname} onClose={() => setSheetOpen(false)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login modal — fixed overlay, works for both desktop and mobile */}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  );
}
