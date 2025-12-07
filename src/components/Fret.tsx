import React, { useState } from "react";
import Image from "next/image";
import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";

interface IFret {
  stringNum?: number;
  fretNum?: number;
  fingerNum?: number;
  hasCapo?: boolean;
  fretsToUse?: number[];
  fingersToUse?: number[];
  fretId?: number;
  fretIndex?: number;
  baseFret?: number;
  onNotePlay?: (midiNote: number, stringNum: number) => void;
}

// Base MIDI notes for each string (E2, A2, D3, G3, B3, E4)
const STRING_BASE_NOTES = [64, 59, 55, 50, 45, 40]; // 1st to 6th string

export default function Fret({
  fretsToUse,
  fingersToUse,
  fretId,
  fretIndex,
  baseFret,
  onNotePlay,
}: IFret) {
  const [playingString, setPlayingString] = useState<number | null>(null);

  const FingerPositionOnStringsWithFretNums = useGetStringNumAndFretNum(
    fretsToUse as number[],
    fingersToUse as number[],
    baseFret as number
  );

  const Strings = [
    { stringNum: 1, color: "#9c70e7", h: "1px" },
    { stringNum: 2, color: "#EA9E2D", h: "2px" },
    { stringNum: 3, color: "#F642EF", h: "3px" },
    { stringNum: 4, color: "#C2D934", h: "3.5px" },
    { stringNum: 5, color: "#C65151", h: "4px" },
    { stringNum: 6, color: "#38DBE5", h: "5px" },
  ];

  const StringsWithMatchedFingerNumbersOfAGivenChord = Strings.map(
    (stringObj) => {
      const matchingObj = FingerPositionOnStringsWithFretNums.find(
        (obj) =>
          obj.stringNumber === stringObj.stringNum && obj.fretNumber === fretId
      );

      return {
        ...stringObj,
        fingerNum: matchingObj && matchingObj.fingerNumber,
        fretNum: matchingObj && matchingObj.fretNumber,
        baseFret: baseFret,
      };
    }
  );

  const handleFingerClick = (stringNum: number, fretNum: number | undefined) => {
    if (fretNum === undefined) return;
    
    // Calculate MIDI note: base note + fret position
    const baseNote = STRING_BASE_NOTES[stringNum - 1];
    const midiNote = baseNote + fretNum;
    
    // Visual feedback
    setPlayingString(stringNum);
    setTimeout(() => setPlayingString(null), 500);
    
    // Play the note
    if (onNotePlay) {
      onNotePlay(midiNote, stringNum);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-white text-center pb-2 text-xl md:text-2xl font-Lora">
        {fretIndex === 0
          ? "Open"
          : baseFret && fretIndex && baseFret - 1 + fretIndex}
      </p>
      <div
        className={`b-1  h-[199px] md:h-[279px] w-[100px] md:w-[120px] relative b-[#FFF] border-r-8 border-l-8 border-collapse`}
        id={`${fretIndex}`}
      >
        {StringsWithMatchedFingerNumbersOfAGivenChord?.map((stirng: any) => {
          const isPlaying = playingString === stirng.stringNum;
          const hasFingerPosition = stirng.fretNum !== undefined;
          
          return (
            <div
              className={`w-[84px] md:w-[103px] mb-9 md:mb-[52px] h-1 relative`}
              id={`string-${stirng.stringNum}`}
              key={stirng.stringNum}
              style={{
                background: `#FFF`,
                height: `${stirng.h}`,
              }}
            >
              {hasFingerPosition ? (
                <button
                  onClick={() => handleFingerClick(stirng.stringNum, stirng.fretNum)}
                  className={`absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] h-6 w-6 md:h-[32px] md:w-[32px] rounded-full transition-all duration-150 bg-[#1BD79E] cursor-pointer hover:scale-125 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-white ${
                    isPlaying ? "scale-125 ring-4 ring-white ring-opacity-50" : ""
                  }`}
                  style={
                    isPlaying
                      ? {
                          boxShadow: `0 0 20px ${stirng.color}, 0 0 40px ${stirng.color}`,
                        }
                      : {}
                  }
                  aria-label={`Play finger ${stirng.fingerNum} on string ${stirng.stringNum}`}
                >
                  <span className="mt-[-2px] flex items-center justify-center font-Lora text-base md:text-2xl text-black">
                    {stirng?.fingerNum}
                  </span>
                </button>
              ) : (
                <div className="absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] h-6 w-6 md:h-[32px] md:w-[32px] rounded-full" />
              )}
              {fretIndex === 0 && (
                <div className="text-white">{stirng.stringNum}</div>
              )}
            </div>
          );
        })}

        {fretIndex &&
          fretIndex !== 1 &&
          fretIndex !== 11 &&
          fretIndex !== 4 &&
          fretIndex % 2 !== 0 && (
            <div className="w-3 h-3 bg-[#FFF] absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rotate-45"></div>
          )}
      </div>
    </div>
  );
}
