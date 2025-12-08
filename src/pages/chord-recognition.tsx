import dynamic from "next/dynamic";
import Head from "next/head";

// Dynamic import to avoid SSR issues with Web Audio API
const ChordRecognition = dynamic(
  () => import("@/components/ChordRecognition/ChordRecognition"),
  { ssr: false }
);

export default function ChordRecognitionPage() {
  return (
    <>
      <Head>
        <title>Chord Recognition - Identify Guitar Chords | ChordsofGuitar.com</title>
        <meta name="description" content="Play a chord on your guitar and our AI will identify it instantly. Free chord recognition tool for guitar players." />
        <meta name="keywords" content="chord recognition, guitar chord identifier, chord detector, guitar app, chord finder, identify chords" />
        <meta property="og:title" content="Chord Recognition - Identify Guitar Chords | ChordsofGuitar.com" />
        <meta property="og:description" content="Play a chord on your guitar and our AI will identify it instantly." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://chordsofguitar.com/chord-recognition" />
        <link rel="canonical" href="https://chordsofguitar.com/chord-recognition" />
      </Head>
      <ChordRecognition />
    </>
  );
}

