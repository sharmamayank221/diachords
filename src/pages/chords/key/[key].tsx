import type { GetStaticPaths, GetStaticProps } from "next";
import ChordLibrary, { KEYS, keyFromSlug, keySlug } from "@/components/Chord/ChordLibrary";

// One pre-rendered page per key (C is served at /chords)
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: KEYS.filter((k) => k !== "C").map((k) => ({ params: { key: keySlug(k) } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ chordKey: string }> = async ({ params }) => {
  const chordKey = keyFromSlug(params?.key);
  return chordKey ? { props: { chordKey } } : { notFound: true };
};

export default function ChordKeyPage({ chordKey }: { chordKey: string }) {
  return <ChordLibrary chordKey={chordKey} />;
}
