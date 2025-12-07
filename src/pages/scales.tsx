import dynamic from "next/dynamic";
import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";

// Dynamic import to avoid SSR issues with audio
const ScaleFretboard = dynamic(
  () => import("@/components/Scale/ScaleFretboard"),
  { ssr: false }
);

export default function ScalesPage() {
  const jsonLd = [
    createWebPageSchema(
      "Guitar Scale Explorer",
      "Learn and practice guitar scales with interactive fretboard",
      "/scales"
    ),
    createHowToSchema(
      "How to Learn Guitar Scales",
      "Learn guitar scales using the interactive fretboard",
      [
        "Select a root note (C, D, E, F, G, A, B)",
        "Choose a scale type (Major, Minor, Pentatonic, Blues, etc.)",
        "View the scale pattern on the fretboard",
        "Click on notes to hear them",
        "Practice chord progressions for each scale",
      ]
    ),
  ];

  return (
    <>
      <SEO
        title="Guitar Scale Explorer - Learn Major, Minor, Pentatonic Scales"
        description="Master guitar scales with our interactive fretboard. Learn major, minor, pentatonic, blues, and modal scales. See patterns, hear notes, and practice chord progressions."
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
      <ScaleFretboard />
    </>
  );
}
