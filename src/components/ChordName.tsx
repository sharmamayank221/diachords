import React from "react";

import { A } from "@/types/chord.types";
import GuitarHintsModal from "./Modal/GuitarHintsModal";
import data from "@/chrods.json";

interface IChordName {
  singleDatafromDynamicPage: A;
}

export default function ChordName({ singleDatafromDynamicPage }: IChordName) {
  return (
    <>
      {/* <div className="flex items-center justify-between w-full">
        {Object.keys(data?.chords).map((item: any) => {
          return (
            <div
              className="border-white border-2 px-3 py-2 font-Lora rounded-full text-white bg-black cursor-pointer hover:bg-[#1BD79E90]"
              key={item}
              // onClick={() => setSearchChordData(item.toLowerCase())}
            >
              {item}
            </div>
          );
        })}
      </div> */}
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
