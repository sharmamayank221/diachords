import React from "react";
import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";
import dynamic from "next/dynamic";

// Microphone + Tone.js only exist in the browser
const Tuner = dynamic(() => import("@/components/Tuner/Tuner"), { ssr: false });

function TunerPage() {
  const jsonLd = [
    createWebPageSchema(
      "Free Online Guitar Tuner",
      "Tune your guitar with our free chromatic tuner",
      "/tuner"
    ),
    createHowToSchema(
      "How to Tune Your Guitar",
      "Use this free online guitar tuner to tune your guitar",
      [
        "Click 'Start Tuning' to enable microphone access",
        "Play a string on your guitar",
        "Watch the tuner detect the note",
        "Adjust tuning until the needle is centered",
        "Repeat for all 6 strings: E A D G B E",
      ]
    ),
  ];

  return (
    <>
      <SEO
        title="Free Online Guitar Tuner - Chromatic Tuner with Microphone"
        description="Free online guitar tuner using your device's microphone. Tune your acoustic or electric guitar to standard tuning (E A D G B E). Fast, accurate, and easy to use."
        canonical="/tuner"
        keywords={[
          "guitar tuner",
          "online guitar tuner",
          "free guitar tuner",
          "chromatic tuner",
          "tune guitar online",
          "acoustic guitar tuner",
          "electric guitar tuner",
          "standard tuning",
        ]}
        jsonLd={jsonLd}
      />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-12">
        <h1 className="font-Lora text-3xl md:text-4xl text-white text-center">Guitar tuner</h1>
        <p className="font-Inter text-sm text-gray-400 mt-1 mb-5 text-center">
          Pick a tuning, press Start and play a string. Works with acoustic and electric guitars.
        </p>
        <Tuner />
      </div>
    </>
  );
}

export default TunerPage;
