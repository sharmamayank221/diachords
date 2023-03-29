import React from "react";
import dynamic from "next/dynamic";
import { type NextPage } from "next";

import SearchBar from "../../components/SearchBar";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";

const Chord: NextPage = () => {
  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );

  const DynamicComponentWithNoSSR = dynamic(
    () => import("../../components/Guitar"),
    { ssr: false }
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-b from-[#0C0C0C] to-[#15162c]">
      <div className="mb-10">
        <SearchBar />
      </div>
      <DynamicComponentWithNoSSR id={singleData?.[0]?.id} data={singleData} />
    </div>
  );
};

export default Chord;
