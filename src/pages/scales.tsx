import Head from "next/head";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with audio
const ScaleFretboard = dynamic(
  () => import("@/components/Scale/ScaleFretboard"),
  { ssr: false }
);

export default function ScalesPage() {
  return (
    <>
      <Head>
        <title>Scale Explorer - Chords of Guitar</title>
        <meta
          name="description"
          content="Learn and practice guitar scales. Explore major, minor, pentatonic, blues scales and more with our interactive fretboard."
        />
        <meta property="og:title" content="Scale Explorer - Chords of Guitar" />
        <meta
          property="og:description"
          content="Learn and practice guitar scales with our interactive fretboard."
        />
      </Head>
      <ScaleFretboard />
    </>
  );
}

