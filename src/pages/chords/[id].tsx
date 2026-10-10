import Link from "next/link";
import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from "next";

import getIDs from "@/helpers/getIDs";
import { A } from "@/types/chord.types";
import getChords from "@/helpers/getChods";
import MetaTags from "@/components/Meta/Meta";
import Guitar from "@/components/Guitar";
import ChordDiagram from "@/components/Chord/ChordDiagram";
import { getChordSeo } from "@/helpers/chordSeo";

// Rendered on the server so search engines get the chord name, notes, every shape and links to
// related chords in the HTML. The interactive player hydrates on top of the same markup.
export default function Chord({ chordData }: { chordData: A }) {
  const seo = getChordSeo(chordData);
  const suffixName = seo.fullName.slice(chordData.key.length).trim();

  return (
    <>
      <MetaTags
        currentPageTitle={chordData.id ?? ""}
        title={seo.title}
        description={seo.description}
        chordKey={chordData.key}
        chordSuffix={suffixName}
      />
      <div className="h-full w-full overflow-hidden pt-2">
        <Guitar data={chordData} />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-16 text-white">
        {/* At a glance */}
        <section aria-labelledby="about-chord" className="border-t border-white/5 pt-10">
          <h2 id="about-chord" className="font-Lora text-2xl md:text-3xl">
            {seo.display} chord at a glance
          </h2>
          <p className="font-Inter text-gray-400 mt-2 max-w-2xl leading-relaxed">
            {seo.fullName} ({seo.display}) is built from the notes{" "}
            <span className="text-white">{seo.notes.join(" – ")}</span>. Here {seo.shapes.length === 1 ? "is the shape" : `are all ${seo.shapes.length} shapes`} on
            the neck, from the open position upwards. Numbers under each diagram are the frets from low E to high E
            (x = don&rsquo;t play that string).
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {seo.shapes.map((shape, i) => (
              <figure key={i} className="rounded-2xl bg-[#111] border border-white/5 p-4 flex flex-col items-center">
                <ChordDiagram position={shape.position as any} size={120} title={`${seo.display} shape ${i + 1}, ${shape.label}`} />
                <figcaption className="mt-2 text-center">
                  <span className="block font-Inter text-sm text-white">
                    Shape {i + 1} · {shape.label}
                  </span>
                  <span className="block font-Inter text-xs text-gray-500 tracking-wider mt-0.5">{shape.frets}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Related chords: also gives crawlers a path to every chord page */}
        <nav aria-label="Related chords" className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {seo.sameRoot.length > 0 && (
            <div>
              <h2 className="font-Lora text-xl">More {chordData.key} chords</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {seo.sameRoot.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} title={c.fullName} className="inline-flex h-9 px-3.5 items-center rounded-full bg-[#161616] hover:bg-[#222] font-Lora text-[15px]">
                      {c.display}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`/chords?key=${chordData.key.toLowerCase().replace("#", "sharp")}`} className="inline-flex h-9 px-3.5 items-center rounded-full font-Inter text-sm text-[#1BD79E] hover:underline">
                    All {chordData.key} chords →
                  </Link>
                </li>
              </ul>
            </div>
          )}
          {seo.sameTypeOtherKeys.length > 0 && (
            <div>
              <h2 className="font-Lora text-xl">{suffixName ? `${suffixName[0].toUpperCase()}${suffixName.slice(1)}` : "Same chord"} in other keys</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {seo.sameTypeOtherKeys.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} title={c.fullName} className="inline-flex h-9 px-3.5 items-center rounded-full bg-[#161616] hover:bg-[#222] font-Lora text-[15px]">
                      {c.display}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext) => {
  const { params } = context;
  const data = await getChords();
  const chordData = data?.find((chord: any) => chord.id === params?.id);
  if (!chordData) return { notFound: true };
  return { props: { chordData } };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const ids = await getIDs();
  const paths = ids.map((id: string) => `/chords/${id}`);
  return { paths, fallback: false };
};
