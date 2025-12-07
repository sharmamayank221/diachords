import dynamic from "next/dynamic";
import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";

// Dynamic import to avoid SSR issues with Tone.js
const Metronome = dynamic(
  () => import("@/components/Metronome/Metronome"),
  { ssr: false }
);

export default function MetronomePage() {
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
        "Set your desired tempo (BPM) using the slider or quick buttons",
        "Choose a time signature (4/4, 3/4, 6/8, or 2/4)",
        "Press the play button or hit Space to start",
        "Practice along with the beat, keeping your strumming in time",
        "Use Tap Tempo to match the tempo of a song",
      ]
    ),
  ];

  return (
    <>
      <SEO
        title="Free Online Metronome - Guitar Practice Tool"
        description="Free online metronome for guitar practice. Adjustable tempo from 40-240 BPM, multiple time signatures, tap tempo, and visual beat indicator. Perfect for improving your timing."
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
      <Metronome />
    </>
  );
}

