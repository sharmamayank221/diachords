import Head from "next/head";
import Tuner from "@/components/Tuner/Tuner";

export default function TunerPage() {
  return (
    <>
      <Head>
        <title>Guitar Tuner - Chords of Guitar</title>
        <meta
          name="description"
          content="Free online guitar tuner. Tune your guitar with our chromatic tuner using your device's microphone. Standard tuning E A D G B E."
        />
        <meta
          property="og:title"
          content="Guitar Tuner - Chords of Guitar"
        />
        <meta
          property="og:description"
          content="Free online guitar tuner. Tune your guitar with our chromatic tuner using your device's microphone."
        />
      </Head>
      <Tuner />
    </>
  );
}

