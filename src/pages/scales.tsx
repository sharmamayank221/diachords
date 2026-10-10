import React from "react";
import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";
import PracticeStudio from "@/components/Practice/PracticeStudio";

function ScalesPage() {
  const jsonLd = [
    createWebPageSchema(
      "Guitar Scale Explorer",
      "Learn and practice guitar scales with interactive fretboard",
      "/scales",
    ),
    createHowToSchema(
      "How to Learn Guitar Scales",
      "Learn guitar scales using the interactive fretboard",
      [
        "Select a root note (C, D, E, F, G, A, B)",
        "Choose a scale type (Major, Minor, Pentatonic, Blues, etc.)",
        "View the scale pattern on the fretboard",
        "Click on notes to hear them",
        "Switch to backing tracks to jam in the same key",
      ],
    ),
  ];

  return (
    <>
      <SEO
        title="Guitar Scale Explorer - Learn Major, Minor, Pentatonic Scales"
        description="Master guitar scales with our interactive fretboard. Learn major, minor, pentatonic, blues, and modal scales. Pair with AI backing tracks in the Practice Studio."
        canonical="/scales"
        keywords={[
          "guitar scales",
          "pentatonic scale",
          "major scale guitar",
          "minor scale guitar",
          "blues scale",
          "scale patterns",
          "guitar modes",
          "fretboard patterns",
        ]}
        jsonLd={jsonLd}
      />
      <main className="bg-gradient-to-b from-[#0a0a0a] to-[#111] min-h-screen">
        <PracticeStudio defaultTab="scales" />
      </main>
    </>
  );
}

export default ScalesPage;
