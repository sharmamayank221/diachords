import React from "react";
import dynamic from "next/dynamic";
import { type NextPage } from "next";

import { RootState } from "@/app/store";
import { useAppSelector } from "@/app/hooks";
import ChordName from "@/components/ChordName";

const Chord: NextPage = () => {
  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );

  const DynamicComponentWithNoSSR = dynamic(
    () => import("@/components/Guitar"),
    { ssr: false }
  );

  return (
    <div className="h-full w-full overflow-hidden bg-black">
      <DynamicComponentWithNoSSR
        id={singleData?.[0]?.id}
        data={singleData?.[0]}
      />
      <ChordName singleDatafromDynamicPage={singleData} />
    </div>
  );
};

export default Chord;
