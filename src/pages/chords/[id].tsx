import SearchBar from "../../components/SearchBar";
import dynamic from "next/dynamic";
import type { RootState } from "../../../app/store";
import { useAppSelector } from "../../../app/hooks";
import { GetServerSideProps } from "next";

import { A } from "@/types/chord.types";

export default function Chord(id: string | undefined) {
  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );

  const DynamicComponentWithNoSSR = dynamic(
    () => import("../../components/Guitar")
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-b from-[#0C0C0C] to-[#15162c]">
      <div className="mb-10">
        <SearchBar />
      </div>
      <DynamicComponentWithNoSSR data={singleData} id={id as string} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query } = context;

  const id = query?.id || null;

  return {
    props: {
      id,
    },
  };
};
