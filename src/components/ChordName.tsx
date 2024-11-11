import Image from "next/image";
import { A } from "@/types/chord.types";
import { useRouter } from "next/router";
import getChords from "@/helpers/getChods";
import AudioPlayer from "./Player/AudioPlayer";
import React, { useEffect, useReducer, useState } from "react";interface IChordName {
  singleDatafromDynamicPage: A;
}

export default function ChordName({ singleDatafromDynamicPage }: IChordName) {
  // @ts-ignore
  const [chordData, setChordData] = useState<A>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const router = useRouter();
  const currentChordUrl = router?.asPath;


  useEffect(() => {
    // Fetch the chord data when the component mounts
    async function fetchChords() {
      try {
        const data = await getChords(); // Call the getChords function
        setChordData(data); // Store the retrieved data in state
      } catch (error) {
        console.error("Error fetching chord data:", error);
      }
    }

    fetchChords();
  }, []);

  const goToNextChord = () => {
    if (currentChordIndex < chordData.length - 1) {
      const currentChord = chordData[currentChordIndex];
      const nextChordIndex = chordData.findIndex(
        (chord: any) =>
          chord.key === currentChord.key && chord.suffix === currentChord.suffix
      );

      if (nextChordIndex < chordData.length - 1) {
        setCurrentChordIndex(nextChordIndex + 1);
        const nextChord = chordData[nextChordIndex + 1];
        const nextChordUrl = `/chords/${nextChord.key.toLowerCase()}${
          nextChord.suffix
        }`;
        router.push(nextChordUrl);
      }
    }
  };
  const goToPreviousChord = () => {
    if (currentChordIndex > 0) {
      setCurrentChordIndex(currentChordIndex - 1);
      const previousChord = chordData[currentChordIndex - 1];
      const previousChordUrl = `/chords/${previousChord?.key?.toLowerCase()}${
        previousChord?.suffix
      }`;
      router.push(previousChordUrl);
    }
  };

  const currentChord = chordData[currentChordIndex];

  return (
    <>
      <div className="flex items-center justify-center font-Lora ">
        <div className="line1 h-[2px] w-[309px] bg-white"></div>
        <Image
          src="/prev_chord.svg"
          alt="previous-chord"
          width={80}
          height={80}
          className="cursor-pointer"
          onClick={goToPreviousChord}
        />
        <div className="relative ml-12 mr-24 py-5">
          <h2 className="text-[76px] md:text-[100px] text-white">
            {singleDatafromDynamicPage?.key}
          </h2>
          <h2 className="absolute right-[-70px] top-[30px] text-lg md:text-[24px] text-white">
            {singleDatafromDynamicPage?.suffix}
          </h2>
        </div>
        <Image
          src="/next_chord.svg"
          alt="next-chord"
          width={80}
          height={80}
          className="cursor-pointer"
          onClick={goToNextChord}
        />
        <div className="line2 h-[2px] w-[309px] bg-white"></div>
      </div>
    </>
  );
}
