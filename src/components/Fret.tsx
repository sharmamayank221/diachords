import React from "react";
import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";
import { toAbsoluteFret } from "@/helpers/chordNotes";
interface IFret {
  fretsToUse?: number[];
  fingersToUse?: number[];
  fretId?: number;
  fretIndex?: number;
  baseFret?: number;
  mutedStrings?: number[];
  playingStrings?: number[];
  onStringClick?: (stringNum: number) => void;
}

const SINGLE_INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_INLAYS = [12, 24];

export default function Fret({
  fretsToUse,
  fingersToUse,
  fretId,
  fretIndex = 0,
  baseFret = 1,
  mutedStrings = [],
  playingStrings = [],
  onStringClick,
}: IFret) {
  const FingerPositionOnStringsWithFretNums = useGetStringNumAndFretNum(
    fretsToUse as number[],
    fingersToUse as number[],
    baseFret
  );

  const Strings = [
    { stringNum: 1, h: "1px" },
    { stringNum: 2, h: "2px" },
    { stringNum: 3, h: "3px" },
    { stringNum: 4, h: "3.5px" },
    { stringNum: 5, h: "4px" },
    { stringNum: 6, h: "5px" },
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
      };
    }
  );

  const isOpenColumn = fretIndex === 0;
  // inlays belong to the real fret on the neck, not the column index
  const actualFret = toAbsoluteFret(fretIndex, baseFret);

  return (
    <div className="flex flex-col items-center">
      <p className="text-white text-center pb-2 text-xl md:text-2xl font-Lora">
        {isOpenColumn ? "Open" : actualFret}
      </p>
      <div
        className={`b-1  h-[199px] md:h-[279px] w-[100px] md:w-[120px] relative b-[#FFF] border-r-8 border-l-8 border-collapse`}
        id={`${fretIndex}`}
      >
        {StringsWithMatchedFingerNumbersOfAGivenChord.map((string) => {
          const hasNote = string.fretNum !== undefined;
          const isMuted = isOpenColumn && mutedStrings.includes(string.stringNum);
          const isPlaying = hasNote && playingStrings.includes(string.stringNum);
          return (
            <div
              className={`w-[84px] md:w-[103px] mb-9 md:mb-[52px] h-1 relative`}
              id={`string-${string.stringNum}`}
              key={string.stringNum}
              style={{ background: `#FFF`, height: `${string.h}` }}
            >
              {isOpenColumn && (
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full font-Inter text-[11px] md:text-xs text-gray-400 pr-1">
                  {string.stringNum}
                </span>
              )}
              {hasNote && (
                <button
                  onClick={() => onStringClick?.(string.stringNum)}
                  aria-label={`Play string ${string.stringNum}`}
                  className={`absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] h-6 w-6 md:h-[32px] md:w-[32px] rounded-full bg-[#1BD79E] flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-110 focus:outline-none ${
                    isPlaying ? "scale-125 shadow-[0_0_20px_#1BD79E,0_0_40px_#1BD79E]" : ""
                  }`}
                >
                  <span className="mt-[-2px] font-Lora text-base md:text-2xl text-black leading-none">
                    {string.fretNum === 0 ? "O" : string.fingerNum}
                  </span>
                </button>
              )}
              {isMuted && (
                <span
                  aria-label={`String ${string.stringNum} muted`}
                  className="absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] h-6 w-6 md:h-[32px] md:w-[32px] rounded-full bg-black border-2 border-[#555] flex items-center justify-center font-Inter text-sm md:text-base font-bold text-gray-400"
                >
                  ✕
                </span>
              )}
            </div>
          );
        })}

        {!isOpenColumn && SINGLE_INLAYS.includes(actualFret) && (
          <div className="w-3 h-3 bg-[#FFF] absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rotate-45 pointer-events-none"></div>
        )}
        {!isOpenColumn && DOUBLE_INLAYS.includes(actualFret) && (
          <>
            <div className="w-3 h-3 bg-[#FFF] absolute left-[50%] top-[30%] translate-x-[-50%] translate-y-[-50%] rotate-45 pointer-events-none"></div>
            <div className="w-3 h-3 bg-[#FFF] absolute left-[50%] top-[70%] translate-x-[-50%] translate-y-[-50%] rotate-45 pointer-events-none"></div>
          </>
        )}
      </div>
    </div>
  );
}
