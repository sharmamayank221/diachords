import dynamic from "next/dynamic";
import { GetStaticPaths } from "next";
import { GetStaticProps, GetStaticPropsContext } from "next";
import getChords from "@/helpers/getChods";
import { ParsedUrlQuery } from "querystring";
import ChordName from "@/components/ChordName";
import { A } from "@/types/chord.types";
import getIDs from "@/helpers/getIDs";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface IParams extends ParsedUrlQuery {
  slug: string;
}

export default function Chord(props: any) {
  const router = useRouter();
  const { id } = props;
  const { chordData } = props;

  const DynamicComponentWithNoSSR = dynamic(
    () => import("../../components/Guitar")
  );

  if (router.isFallback) {
    return (
      <div
        aria-label="Loading..."
        role="status"
        className="flex items-center space-x-2"
      >
        <svg
          className="h-6 w-6 animate-spin stroke-white"
          viewBox="0 0 256 256"
        >
          <line
            x1="128"
            y1="32"
            x2="128"
            y2="64"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
          <line
            x1="195.9"
            y1="60.1"
            x2="173.3"
            y2="82.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
          <line
            x1="224"
            y1="128"
            x2="192"
            y2="128"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
          <line
            x1="195.9"
            y1="195.9"
            x2="173.3"
            y2="173.3"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
          <line
            x1="128"
            y1="224"
            x2="128"
            y2="192"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
          <line
            x1="60.1"
            y1="195.9"
            x2="82.7"
            y2="173.3"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
          <line
            x1="32"
            y1="128"
            x2="64"
            y2="128"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
          <line
            x1="60.1"
            y1="60.1"
            x2="82.7"
            y2="82.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="24"
          ></line>
        </svg>
        <span className="text-xs font-medium text-white">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <DynamicComponentWithNoSSR data={chordData as A} id={id as string} />

      <ChordName singleDatafromDynamicPage={chordData} />
    </div>
  );
}

export const getStaticProps: GetStaticProps = async (
  context: GetStaticPropsContext
) => {
  const { params } = context;

  const data = await getChords();
  const chordData = data?.find((chord: any) => chord.id === params?.id);

  return {
    props: {
      chordData,
    },
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const ids = await getIDs();
  const paths = ids.map((id: string) => `/chords/${id}`);

  return { paths, fallback: false };
};
