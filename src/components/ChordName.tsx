import Image from "next/image";
import React from "react";
import { useAppSelector } from "../../app/hooks";
import { RootState } from "../../app/store";

export default function ChordName() {
  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );

  return (
    <>
      <div className="flex items-center justify-center font-Lora">
        <div className="line1 h-[2px] w-[309px] bg-white"></div>
        <div className="relative ml-12 mr-24">
          <h2 className="text-[100px] text-white">{singleData?.[0]?.key}</h2>
          <h2 className="absolute right-[-53px] top-[25px] text-[24px] text-white">
            {singleData?.[0]?.suffix}
          </h2>
        </div>
        <div className="line2 h-[2px] w-[309px] bg-white"></div>
      </div>
      <div className="flex items-center justify-center">
        <div
          className={`mr-6 h-[27px] w-[27px] rounded-full bg-[#1BD79E]`}
        ></div>
        <span className="font-Lora text-xl text-white">Pressed fingers</span>
      </div>
      <div className="mt-1 flex items-center justify-center">
        <div className={`mr-6 h-[27px] w-[27px] rounded-full bg-[#1BD79E]`}>
          <h3 className="flex items-center justify-center font-Lora text-xl text-white">
            0
          </h3>
        </div>
        <span className="mr-4 font-Lora text-xl text-white">Open string</span>
        {/* <Image src="hand.svg" alt="finger-numbers" width={125} height={166} /> */}
        <span className="mr-4 font-Lora text-xl text-white">Left hand</span>
      </div>
    </>
  );
}
