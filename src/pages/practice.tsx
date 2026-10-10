import React from "react";
import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";
import PracticeStudio from "@/components/Practice/PracticeStudio";

function PracticePage() {
  const jsonLd = [
    createWebPageSchema(
      "Practice Studio — Jam & Scales",
      "Backing tracks and interactive scale fretboard in one session",
      "/practice",
    ),
    createHowToSchema(
      "How to practice guitar with Diachords",
      "Jam over progressions and solo with scale patterns in the same key",
      [
        "Choose a practice key and scale",
        "Start a backing track and follow the chord changes",
        "Switch to the scale fretboard to see solo notes",
        "Use pitch detection to check your intonation",
      ],
    ),
  ];

  return (
    <>
      <SEO
        title="Practice Studio — Backing Tracks & Scale Fretboard"
        description="One session for jamming and scales: AI backing tracks, chord progressions, interactive fretboard, and pitch practice in the same key."
        canonical="/practice"
        keywords={[
          "guitar practice",
          "backing tracks",
          "guitar scales",
          "jam tracks",
          "scale fretboard",
          "pentatonic practice",
        ]}
        jsonLd={jsonLd}
      />
      <main className="bg-gradient-to-b from-[#0a0a0a] to-[#111] min-h-screen">
        <PracticeStudio defaultTab="jam" />
      </main>
    </>
  );
}

export default PracticePage;
