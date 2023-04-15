import dynamic from "next/dynamic";
import { GetStaticPaths } from "next";
import { GetStaticProps, GetStaticPropsContext } from "next";
import getChords from "@/helpers/getChods";
import { ParsedUrlQuery } from "querystring";
import ChordName from "@/components/ChordName";
import { A } from "@/types/chord.types";
import getIDs from "@/helpers/getIDs";

interface IParams extends ParsedUrlQuery {
  slug: string;
}

export default function Chord(props: any) {
  const { id } = props;
  const { chordData } = props;

  const DynamicComponentWithNoSSR = dynamic(
    () => import("../../components/Guitar")
  );

  return (
    <div className="h-full w-full overflow-hidden bg-black ">
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
