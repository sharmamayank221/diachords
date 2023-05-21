import React from "react";

import { A } from "@/types/chord.types";

interface IChordName {
  singleDatafromDynamicPage: A;
}

export default function ChordName({ singleDatafromDynamicPage }: IChordName) {
  return (
    <>
      <div className="flex items-center justify-center font-Lora ">
        <div className="line1 h-[2px] w-[309px] bg-white"></div>
        <div className="relative ml-12 mr-24 py-5">
          <h2 className="text-[76px] md:text-[100px] text-white">
            {singleDatafromDynamicPage?.key}
          </h2>
          <h2 className="absolute right-[-70px] top-[30px] text-lg md:text-[24px] text-white">
            {singleDatafromDynamicPage?.suffix}
          </h2>
        </div>
        <div className="line2 h-[2px] w-[309px] bg-white"></div>
      </div>
    </>
  );
}
