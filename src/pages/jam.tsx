import SEO, { createWebPageSchema } from "@/components/SEO";
import BackingTrackGenerator from "@/components/BackingTrack/BackingTrackGenerator";

export default function JamPage() {
  const jsonLd = createWebPageSchema(
    "AI Backing Track Generator",
    "Generate custom backing tracks to practice guitar",
    "/jam"
  );

  return (
    <>
      <SEO
        title="AI Backing Track Generator - Practice Guitar with Drums & Bass"
        description="Generate custom backing tracks to practice guitar. Choose from rock, blues, jazz, pop genres. Adjust tempo, key, and chord progressions. Jam along with drums, bass, and rhythm guitar."
        canonical="/jam"
        keywords={[
          "backing track generator",
          "guitar backing tracks",
          "practice tracks guitar",
          "jam tracks",
          "drum tracks for guitar",
          "chord progression player",
          "guitar practice tool",
          "music backing tracks",
        ]}
        jsonLd={jsonLd}
      />
      <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#111] py-8">
        <BackingTrackGenerator />
      </main>
    </>
  );
}
