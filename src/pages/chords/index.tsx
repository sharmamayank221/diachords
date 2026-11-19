import React from "react";
import { useRouter } from "next/router";
import ChordLibrary, { keyFromSlug, keyPath } from "@/components/Chord/ChordLibrary";

export default function ChordLibraryPage() {
  const router = useRouter();

  // Old /chords?key=eb links → /chords/key/eb. The website does this with a server redirect
  // (next.config.js); this covers the static iOS build, which has no server.
  React.useEffect(() => {
    if (!router.isReady) return;
    const k = keyFromSlug(router.query.key);
    if (k && k !== "C") router.replace(keyPath(k));
  }, [router]);

  return <ChordLibrary chordKey="C" />;
}
