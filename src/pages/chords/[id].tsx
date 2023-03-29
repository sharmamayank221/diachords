import dynamic from "next/dynamic";
import { GetServerSideProps, GetStaticPropsContext } from "next";

import type { RootState } from "@/app/store";
import { useAppSelector } from "@/app/hooks";
import SearchBar from "@/components/SearchBar";

export default function Chord(id: string | undefined) {
  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );

  console.log(
    singleData.find((item) => item.id === id),
    singleData,
    "te"
  );

  const DynamicComponentWithNoSSR = dynamic(
    () => import("../../components/Guitar")
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-black">
      <DynamicComponentWithNoSSR data={singleData} id={id as string} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query } = context;

  const id = query?.id || null;
  console.log(id, "id");

  return {
    props: {
      id,
    },
  };
};
