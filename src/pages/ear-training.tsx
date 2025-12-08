import dynamic from "next/dynamic";
import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";

// Dynamic import to avoid SSR issues with Tone.js
const EarTraining = dynamic(
  () => import("@/components/EarTraining/EarTraining"),
  { ssr: false }
);

export default function EarTrainingPage() {
  const jsonLd = [
    createWebPageSchema(
      "Free Ear Training for Guitar",
      "Develop your musical ear with interval and chord recognition exercises",
      "/ear-training"
    ),
    createHowToSchema(
      "How to Train Your Musical Ear",
      "Use this free ear training tool to improve your musical hearing",
      [
        "Choose a training mode: Intervals or Chords",
        "Select your difficulty level: Beginner, Intermediate, or Advanced",
        "Click the play button to hear the sound",
        "Select your answer from the multiple choice options",
        "Track your progress with score and streak counters",
        "Use the song reference tips to remember intervals",
      ]
    ),
  ];

  return (
    <>
      <SEO
        title="Free Ear Training - Interval & Chord Recognition for Guitar"
        description="Develop your musical ear with free online ear training. Practice interval recognition, chord identification, and improve your musical hearing. Perfect for guitarists and musicians."
        canonical="/ear-training"
        keywords={[
          "ear training",
          "interval training",
          "chord recognition",
          "music ear training",
          "guitar ear training",
          "identify intervals",
          "identify chords",
          "musical hearing",
          "music theory practice",
        ]}
        jsonLd={jsonLd}
      />
      <EarTraining />
    </>
  );
}

