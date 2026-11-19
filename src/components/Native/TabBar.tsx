import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import { hapticTap } from "@/lib/native";

const MORE_PATHS = ["/more", "/metronome", "/ear-training", "/chord-recognition", "/library", "/search", "/privacy", "/terms", "/support"];

const TABS: { href: string; label: string; match: (p: string) => boolean; icon: React.ReactNode }[] = [
  {
    href: "/",
    label: "Home",
    match: (p) => p === "/",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/chords",
    label: "Chords",
    match: (p) => p.startsWith("/chords"),
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M4 9h16M4 15h16" />
      </>
    ),
  },
  {
    href: "/practice",
    label: "Practice",
    match: (p) => p.startsWith("/practice") || p.startsWith("/jam") || p.startsWith("/scales"),
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4z" />
      </>
    ),
  },
  {
    href: "/tuner",
    label: "Tuner",
    match: (p) => p.startsWith("/tuner"),
    icon: (
      <>
        <path d="M4 18a8 8 0 1 1 16 0" />
        <path d="m12 18 4-7" />
      </>
    ),
  },
  {
    href: "/more",
    label: "More",
    match: (p) => MORE_PATHS.some((m) => p.startsWith(m)),
    icon: (
      <>
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </>
    ),
  },
];

export default function TabBar() {
  const { pathname } = useRouter();
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-40 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe"
    >
      <div className="mx-auto max-w-2xl h-14 grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => hapticTap()}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 font-Inter text-[10px] font-medium ${
                active ? "text-[#1BD79E]" : "text-gray-500"
              }`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2.2 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {tab.icon}
              </svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
