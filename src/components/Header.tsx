
import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { Dialog } from "@headlessui/react";
import Searchbar from "@/components/SearchBar";
import AudioPlayer from "./Player/AudioPlayer";
import GuitarHintsModal from "./Modal/GuitarHintsModal";

export default function Header() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const router = useRouter();

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  // Check which nav item is active
  const isChordPage = router.pathname.startsWith("/chords") || router.pathname === "/";
  const isScalePage = router.pathname === "/scales";
  const isTunerPage = router.pathname === "/tuner";
  const isJamPage = router.pathname === "/jam";
  const isMetronomePage = router.pathname === "/metronome";
  const isEarTrainingPage = router.pathname === "/ear-training";
  const isChordRecognitionPage = router.pathname === "/chord-recognition";

  const navLinks = [
    { href: "/chords/cmajor", label: "Chords", isActive: isChordPage },
    { href: "/scales", label: "Scales", isActive: isScalePage },
    { href: "/tuner", label: "Tuner", isActive: isTunerPage },
    { href: "/chord-recognition", label: "Detect", isActive: isChordRecognitionPage },
    { href: "/metronome", label: "Tempo", isActive: isMetronomePage },
    { href: "/ear-training", label: "Ear", isActive: isEarTrainingPage },
    { href: "/jam", label: "Jam", isActive: isJamPage },
  ];

  return (
    <div className="bg-black">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="pb-5 flex justify-center items-center w-full pt-5">
          <div className="w-[10%] flex items-center justify-center pr-2">
            <Link href={"/chords/cmajor"}>
              <Image src="/Logo.svg" alt="logo" width={41} height={41} />
            </Link>
          </div>
          <div className="w-[50%]">
            <Searchbar />
          </div>
          {navLinks.map((link) => (
            <div key={link.href} className="flex items-center justify-center pr-2">
              <Link
                href={link.href}
                className={`rounded-md bg-black font-Lora bg-opacity-20 px-4 py-2 text-xl md:text-2xl font-medium hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                  link.isActive ? "text-[#1BD79E]" : "text-white hover:text-gray-300"
                }`}
              >
                {link.label}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden relative">
        {/* Top row: Logo and Hamburger */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={"/chords/cmajor"}>
            <Image src="/Logo.svg" alt="logo" width={28} height={28} />
          </Link>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white focus:outline-none p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              // Close Icon (X)
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Hamburger Icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-black/95 backdrop-blur-sm border-t border-gray-800 z-50 flex flex-col px-4 pb-4 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`font-Lora text-lg py-3 border-b border-gray-800 last:border-0 ${
                  link.isActive 
                    ? "text-[#1BD79E]" 
                    : "text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
        
        {/* Search bar below nav */}
        <div className="px-4 pb-3">
          <Searchbar />
        </div>
      </div>

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
    </div>
  );
}
