import SEO, { createWebPageSchema, createHowToSchema } from "@/components/SEO";
import Tuner from "@/components/Tuner/Tuner";

export default function TunerPage() {
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
      <Tuner />
    </>
  );
}
