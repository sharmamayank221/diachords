import dynamic from "next/dynamic";
import { GetServerSideProps } from "next";

import getChords from "@/helpers/getChods";
import { ParsedUrlQuery } from "querystring";
import ChordName from "@/components/ChordName";

interface IParams extends ParsedUrlQuery {
  slug: string;
}

export default function Chord(props: any) {
  const { id } = props;
  const { arrayWithoutIDs } = props;

  const DynamicComponentWithNoSSR = dynamic(
    () => import("../../components/Guitar")
  );

  const singleData = Object.values(arrayWithoutIDs)?.filter(
    (item: any) => item?.id === id
  );

  return (
    <div className="h-full w-full overflow-hidden bg-black ">
      <DynamicComponentWithNoSSR data={singleData as any} id={id as string} />
      <ChordName />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query } = context;

  const id = query?.id || null;
  const data = await getChords();
  let arrayWithoutIDs: any = [];

  Object.values(data.chords).forEach((item) => {
    item.forEach((ch) => {
      // this id will be used for searching the database and to generate next js dynamic detail pages
      let id = (ch.key + ch.suffix).toLowerCase();
      // for pushing the above id into respective objects
      ch = Object.assign({ ...ch }, { id: id });
      // finally to push each object into an array or state
      arrayWithoutIDs.push(ch);
    });
  });

  return {
    props: {
      id,
      arrayWithoutIDs,
    },
  };
};
