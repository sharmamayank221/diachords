import React from "react";
import Head from "next/head";
import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from "next";
import { useRouter } from "next/router";

import getIDs from "@/helpers/getIDs";
import { A } from "@/types/chord.types";
import getChords from "@/helpers/getChods";
import ChordDetailView from "@/components/ChordDetail/ChordDetailView";
import ChordDetailDesktop from "@/components/ChordDetail/ChordDetailDesktop";

export default function Chord(props: any) {
  const router = useRouter();
  const { chordData } = props;

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="#14ffb1" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span className="font-Inter text-sm text-[#adaaaa]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`${chordData?.key ?? ""} ${chordData?.suffix ?? ""} — ChordsofGuitar.com`}</title>
        <meta name="description" content={`How to play ${chordData?.key} ${chordData?.suffix} guitar chord`} />
      </Head>

      {/* Mobile view (hidden on large screens) */}
      <div className="lg:hidden">
        <ChordDetailView chordData={chordData as A} />
      </div>

      {/* Desktop view (hidden on small screens) */}
      <div className="hidden lg:block">
        <ChordDetailDesktop chordData={chordData as A} />
      </div>
    </>
  );
}

// Skip global Layout — both views have their own chrome
Chord.getLayout = (page: React.ReactElement) => page;

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext) => {
  const { params } = context;
  const data = await getChords();
  const chordData = data?.find((chord: any) => chord.id === params?.id);
  return { props: { chordData } };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const ids = await getIDs();
  const paths = ids.map((id: string) => `/chords/${id}`);
  return { paths, fallback: false };
};
