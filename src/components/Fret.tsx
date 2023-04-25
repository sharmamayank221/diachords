import React from "react";
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
}

export default function Fret({
  fretsToUse,
  fingersToUse,
  fretId,
  fretIndex,
}: IFret) {
  const FingerPositionOnStringsWithFretNums = useGetStringNumAndFretNum(
    fretsToUse as number[],
    fingersToUse as number[]
  );

  const Strings = [
    { stringNum: 1, color: "#FFF" },
    { stringNum: 2, color: "#EA9E2D" },
    { stringNum: 3, color: "#F642EF" },
    { stringNum: 4, color: "#C2D934" },
    { stringNum: 5, color: "#C65151" },
    { stringNum: 6, color: "#38DBE5" },
  ];

  const StringsWithMatchedFingerNumbersOfAGivenChord = Strings.map(
    (stringObj) => {
      const matchingObj = FingerPositionOnStringsWithFretNums.find(
        (obj) =>
          obj.stringNumber === stringObj.stringNum && obj.fretNumber === fretId
      );

      console.log(matchingObj, "st");

      return {
        ...stringObj,
        fingerNum: matchingObj && matchingObj.fingerNumber,
        fretNum: matchingObj && matchingObj.fretNumber,
      };
    }
  );

  return (
    <div className="flex flex-col items-center">
      <p className="text-white text-center pb-2 text-2xl font-Lora">
        {fretIndex}
      </p>
      <div
        className={`b-1 h-[284px] w-[120px] relative b-[#FFF] border-r-8 border-l-[${
          fretIndex === 0 ? "0" : "8px"
        }] border-collapse`}
        id={`fret-1`}
      >
        {StringsWithMatchedFingerNumbersOfAGivenChord?.map((stirng: any) => {
          return (
            <>
              <div
                className={`w-[103px] bg-[${stirng.color}] mb-[52px] h-1 relative`}
                id={`string-${stirng.stringNum}`}
                key={stirng.stringNum}
              >
                <div
                  className={`absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]  h-[32px] w-[32px] rounded-full bg-[${
                    stirng.fretNum !== undefined ? "#1BD79E" : ""
                  }]`}
                >
                  {stirng.fretNum !== undefined && (
                    <h3 className="mt-[-2px] flex items-center justify-center font-Lora text-2xl text-black">
                      {stirng?.fingerNum}
                    </h3>
                  )}
                </div>
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
}