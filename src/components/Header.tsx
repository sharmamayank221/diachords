import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Dialog } from "@headlessui/react";
import Searchbar from "@/components/SearchBar";
import GuitarHintsModal from "./Modal/GuitarHintsModal";
import UserMenu from "@/components/Auth/UserMenu";
import LoginModal from "@/components/Auth/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

const NAV = [
  { href: "/chords", label: "Chords", match: (p: string) => p.startsWith("/chords") },
  { href: "/scales", label: "Scales", match: (p: string) => p.startsWith("/scales") },
  { href: "/practice", label: "Practice", match: (p: string) => p.startsWith("/practice") || p.startsWith("/jam") },
  { href: "/tuner", label: "Tuner", match: (p: string) => p.startsWith("/tuner") },
  { href: "/metronome", label: "Metronome", match: (p: string) => p.startsWith("/metronome") },
];

// Less-used tools live under "More" so the main row stays short
const MORE = [
  { href: "/ear-training", label: "Ear training", hint: "Recognise chords and intervals by ear" },
  { href: "/chord-recognition", label: "Chord detect", hint: "Play a chord, see its name" },
  { href: "/library", label: "My library", hint: "Your saved chords", needsAuth: true },
].filter((m) => !("needsAuth" in m) || isSupabaseConfigured);

function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = MORE.some((m) => pathname.startsWith(m.href));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`px-3 py-2 rounded-full font-Inter text-sm font-medium inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
          active ? "text-white bg-white/10" : "text-gray-400 hover:text-white"
        }`}
      >
        More
        <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="currentColor" aria-hidden>
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-[#333] bg-[#1a1a1a] p-2 shadow-2xl shadow-black/60 z-50">
          {MORE.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              role="menuitem"
              className="block rounded-xl px-3 py-2.5 hover:bg-white/5 focus-visible:bg-white/5 outline-none"
            >
              <span className="block font-Inter text-sm font-medium text-white">{m.label}</span>
              <span className="block font-Inter text-xs text-gray-400 mt-0.5">{m.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountButton() {
  const { user, isLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  if (!isSupabaseConfigured) return null;
  if (isLoading) return <div className="h-10 w-10 shrink-0" aria-hidden />;
  return (
    <>
      {user ? (
        <UserMenu />
      ) : (
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="shrink-0 h-10 px-4 rounded-full border border-[#1BD79E]/40 text-[#1BD79E] font-Inter text-sm font-semibold hover:bg-[#1BD79E]/10 transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
        >
          Sign in
        </button>
      )}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  );
}

export default function Header() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  const navLinks = (className: string) =>
    NAV.map((item) => {
      const active = item.match(router.pathname);
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`${className} font-Inter text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] rounded-full ${
            active ? "text-white bg-white/10" : "text-gray-400 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <header className="bg-black sticky top-0 z-40 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-6">
        <Link href="/" aria-label="Chords of Guitar home" className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-[#1BD79E]">
          <Image src="/Logo.svg" alt="" width={40} height={40} />
        </Link>
        <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {navLinks("px-2.5 xl:px-3.5 py-2")}
          <MoreMenu pathname={router.pathname} />
        </nav>
        <div className="flex-1 min-w-0">
          <Searchbar />
        </div>
        <button
          type="button"
          onClick={openModal}
          aria-label="How to read chord diagrams"
          title="How to read chord diagrams"
          className="shrink-0 h-10 w-10 rounded-full border border-[#333] text-gray-300 font-Inter text-base font-semibold hover:border-[#1BD79E] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
        >
          ?
        </button>
        <AccountButton />
      </div>
      <nav aria-label="Main" className="lg:hidden max-w-6xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto no-scrollbar">
        {navLinks("px-3.5 py-1.5 shrink-0")}
        {MORE.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            aria-current={router.pathname.startsWith(m.href) ? "page" : undefined}
            className={`px-3.5 py-1.5 shrink-0 font-Inter text-sm font-medium rounded-full transition-colors ${
              router.pathname.startsWith(m.href) ? "text-white bg-white/10" : "text-gray-400 hover:text-white"
            }`}
          >
            {m.label}
          </Link>
        ))}
      </nav>
      <GuitarHintsModal isOpen={isOpen} onClose={closeModal}>
            {" "}
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title
                as="h3"
                className="text-2xl font-medium leading-6 text-gray-900 text-center font-Lora"
              >
                Here is how you navigate the guitar
              </Dialog.Title>
              <div className="mt-2">
                <span className="mr-4 font-Lora text-xl text-black  block border-b-2 border-[#E5EFE1] pb-2 mt-2">
                  Fingers and Strings{" "}
                </span>
                <div className="flex items-center justify-start px-3 py-2">
                  <div
                    className={`mr-3 h-[27px] w-[27px] rounded-full bg-[#1BD79E] flex items-center justify-center font-Lora`}
                  >
                    1
                  </div>
                  <span className="font-Lora text-xl text-black">
                    Pressed fingers
                  </span>
                </div>
                <span className="font-Lora text-sm text-black">
                  In this case you can use the index finger of your left hand to
                  press the on the guitar
                </span>
              </div>
              <div className="mt-1 flex items-center justify-start px-3 py-2">
                <Image
                  src="/hand.png"
                  alt="finger-numbers"
                  width={135}
                  height={180}
                />
                <span className="mr-4 font-Lora text-lg text-black">
                  Left hand
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-start px-3 py-2">
                  <div
                    className={`mr-3 h-[27px] w-[27px] rounded-full bg-[#1BD79E] flex items-center justify-center font-Lora`}
                  >
                    0
                  </div>
                  <span className="font-Lora text-xl text-black">
                    Open String
                  </span>
                </div>
                <span className="font-Lora text-sm text-black">
                  In this case 0 is open string
                </span>
              </div>
              <span className="mr-4 font-Lora text-xl text-black  block border-b-2 border-[#E5EFE1] pb-2 mt-2">
                Tuning{" "}
              </span>
              <span className="mr-4 font-Lora text-lg text-black w-[25%]">
                Standard tuning: E2,A2,D3,G3,B3,E4
              </span>
              <span className="mr-4 font-Lora text-xl text-black  block border-b-2 border-[#E5EFE1] pb-2 mt-2">
                String Colors{" "}
              </span>
              <span className="mr-4 font-Lora text-lg text-black ">
                <div>
                  <span className="text-[#38DBE5]">6th </span>
                  <span className="text-[#C65151]">5th </span>
                  <span className="text-[#C2D934]">4th </span>
                  <span className="text-[#F642EF]">3rd </span>
                  <span className="text-[#EA9E2D]">2nd </span>
                  <span className="text-[#9c70e7]">1st </span>
                </div>
              </span>
              <div className="mt-4">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-[#1bd79f85] px-4 py-2 text-sm font-medium text-black hover:bg-[#1BD79E] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 font-Lora"
                  onClick={closeModal}
                >
                  Got it, thanks!
                </button>
              </div>
            </Dialog.Panel>
          </GuitarHintsModal>
    </header>
  );
}
