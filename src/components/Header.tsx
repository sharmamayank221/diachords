import React from "react";

import Searchbar from "@/components/SearchBar";
import Image from "next/image";
import Link from "next/link";
import AudioPlayer from "./Player/AudioPlayer";
import GuitarHintsModal from "./Modal/GuitarHintsModal";

export default function Header() {
  return (
    <div className="bg-black">
      <div className="container mx-auto ">
        <div className="pb-10 flex justify-center items-center w-full pt-12">
          <div className="w-[10%] flex items-center justify-center pr-2">
            <Link href={"/chords/cmajor"}>
              <Image src="/Logo.svg" alt="logo" width={41} height={41} />
            </Link>
          </div>
          <div className="w-[60%]">
            <Searchbar />
          </div>
          {/* <GuitarHintsModal /> */}
        </div>
      </div>
    </div>
  );
}
