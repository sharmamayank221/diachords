import React from "react";
import dynamic from "next/dynamic";
import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";

// Dynamic import to avoid SSR issues with Tone.js
const Metronome = dynamic(
  () => import("@/components/Metronome/Metronome"),
  { ssr: false }
);

function MetronomePage() {
  const jsonLd = [
    createWebPageSchema(
      "Free Online Metronome",
      "Practice guitar with a free online metronome",
      "/metronome"
    ),
    createHowToSchema(
      "How to Use a Metronome for Guitar Practice",
      "Use this free online metronome to improve your timing",
      [
        "Set your tempo with the slider, the − and + buttons, or the arrow keys",
        "Choose a time signature (2/4, 3/4, 4/4, 6/8 or 12/8) and a subdivision",
        "Press the play button or hit Space to start",
        "Practice along with the beat, keeping your strumming in time",
        "Use Tap Tempo to match the tempo of a song, or the speed trainer to build up gradually",
      ]
    ),
  ];

  return (
    <>
      <SEO
        title="Free Online Metronome - Guitar Practice Tool"
        description="Free online metronome for guitar practice: 30–260 BPM, 2/4 to 12/8, subdivisions (eighths, triplets, 16ths), tap tempo, count-in and a speed trainer."
        canonical="/metronome"
        keywords={[
          "metronome",
          "online metronome",
          "free metronome",
          "guitar metronome",
          "practice metronome",
          "tap tempo",
          "bpm counter",
          "music timing",
        ]}
        jsonLd={jsonLd}
      />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-12">
        <Metronome />
      </div>
    </>
  );
}

export default MetronomePage;

