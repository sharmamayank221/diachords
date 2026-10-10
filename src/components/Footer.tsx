import Link from "next/link";
import React from "react";

const LINKS = [
  { href: "/chords", label: "Chord library" },
  { href: "/scales", label: "Scales" },
  { href: "/practice", label: "Backing tracks" },
  { href: "/tuner", label: "Guitar tuner" },
  { href: "/metronome", label: "Metronome" },
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-Inter text-sm">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-gray-400 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <a href="mailto:chordsofguitar@gmail.com" className="text-gray-500 hover:text-white transition-colors">
          chordsofguitar@gmail.com
        </a>
      </div>
    </footer>
  );
}
