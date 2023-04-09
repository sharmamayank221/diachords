import Image from "next/image";
import React from "react";

export default function Footer() {
  return (
    <div className="bg-black flex items-center justify-between">
      <div className="flex items-center justify-start px-3 py-2">
        <div className={`mr-6 h-[27px] w-[27px] rounded-full bg-white`}></div>
        <span className="font-Lora text-xl text-white">Pressed fingers</span>
      </div>

      <div className="flex items-center">
        <div className={`mr-5 h-[27px] w-[27px] rounded-full bg-white`}>
          <h3 className="flex items-center justify-center font-Lora text-xl text-black -mt-0.5">
            0
          </h3>
        </div>
        <span className="mr-4 font-Lora text-xl text-white w-1/2">
          Open string
        </span>
      </div>
      <div className="mt-1 flex items-center justify-start px-3 py-2">
        <Image src="/hand.png" alt="finger-numbers" width={135} height={180} />
        <span className="mr-4 font-Lora text-xl text-white">Left hand</span>
      </div>
      <span className="mr-4 font-Lora text-xl text-white w-[25%]">
        Standard tuning: E2,A2,D3,G3,B3,E4
      </span>
      <div className="mr-4 font-Lora text-xl text-white w-1/2 flex">
        Stirngs:
        <div className="flex items-center ">
          <span className="text-[#38DBE5] ">6th String, </span>
        </div>
        <div className="flex items-center ml-3">
          <span className="text-[#C65151] ">5th String, </span>
        </div>
        <div className="flex items-center ml-3">
          <span className="text-[#C2D934] ">4th String, </span>
        </div>
        <div className="flex items-center ml-3">
          <span className="text-[#F642EF] ">3rd String, </span>
        </div>
        <div className="flex items-center ml-3">
          <span className="text-[#EA9E2D] ">2nd String, </span>
        </div>
        <div className="flex items-center ml-3">
          <span className="">1st String </span>
        </div>
      </div>
    </div>
  );
}
