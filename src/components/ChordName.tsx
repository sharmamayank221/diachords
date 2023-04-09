import React from "react";

import { A } from "@/types/chord.types";

interface IChordName {
  singleDatafromDynamicPage: A[];
}

export default function ChordName({ singleDatafromDynamicPage }: IChordName) {
  return (
    <>
      <div className="flex items-center justify-center font-Lora">
        <div className="line1 h-[2px] w-[309px] bg-white"></div>
        <div className="relative ml-12 mr-24">
          <h2 className="text-[100px] text-white">
            {singleDatafromDynamicPage?.[0]?.key}
          </h2>
          <h2 className="absolute right-[-63px] top-[25px] text-[24px] text-white">
            {singleDatafromDynamicPage?.[0]?.suffix}
          </h2>
        </div>
        <div className="line2 h-[2px] w-[309px] bg-white"></div>
      </div>
    </>
  );
}
