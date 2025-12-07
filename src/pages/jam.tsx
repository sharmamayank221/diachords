import Head from "next/head";
import BackingTrackGenerator from "@/components/BackingTrack/BackingTrackGenerator";

export default function JamPage() {
  return (
    <>
      <Head>
        <title>AI Backing Track Generator | Diachords</title>
        <meta
          name="description"
          content="Generate custom backing tracks to practice guitar. Choose genre, key, tempo, and chord progressions. Jam along with drums, bass, and rhythm."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#111] py-8">
        <BackingTrackGenerator />
      </main>
    </>
  );
}

