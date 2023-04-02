import { A } from "@/types/chord.types";
import React from "react";

import ChordName from "./ChordName";

const Strings = [
  {
    string: 1,
    h: 0.4,
  },
  {
    string: 2,
    h: 0.6,
  },
  {
    string: 3,
    h: 0.8,
  },
  {
    string: 4,
    h: 1,
  },
  {
    string: 5,
    h: 2,
  },
  {
    string: 6,
    h: 3,
  },
];
// TODO: make this array dynamic so as the user selects how many frets to show on the screen
const Frets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

//  NOTES: what i figured out from chords.db json file for fret numbers
//  1st index of frets array is the 6th string and last index is fisrt string
// C major for example
//  "frets":[
//   -1, Low E string and -1 is not to play and press
//   3,  5th string  (3rd fret)
//   2,  4th     (2nd fret)
//   0,  3rd    (open string or no fret)
//   1,  2nd    (1st fret)
//   0   1st    (open string or no fret)
// ],

//  this array is for "a" chord in second fret where 3rd,4th and 5th index of array represent 2nd fret
//  [ -1, 0, 2, 2, 2, 0 ]  = [E, A, D, G, B, E]

interface IPositionsToBePlaced {
  stringNumber: number;
  fretNumber: number;
  fingerNumber?: number;
}

interface IGuitar {
  id?: string;
  data?: A;
}

export default function Guitar({ data, id }: IGuitar) {
  const finger = data?.[0]?.positions?.[0]?.fingers;
  const fret = data?.[0]?.positions?.[0]?.frets;

  const [positionToPlaceFingers, setPositionToPlaceFingers] = React.useState<
    IPositionsToBePlaced[]
  >([]);

  // gives DOMRECT : { x: 124, y: 148, width: 4, height: 356, top: 148, right: 128, bottom: 504, left: 124 }
  // console.log(fret2?.getBoundingClientRect().x, "fret");

  // gives DOMRect { x: 0, y: 219, width: 1920, height: 1, top: 219, right: 1920, bottom: 220, left: 0 }
  // console.log(string2?.getBoundingClientRect().y, "string");

  React.useEffect(() => {
    // a function that will give me string number and fret number from the fret array's individual indexes
    const getStringNumAndFretNum = (fret: number[], finger: number[]) => {
      // check for faulty array
      if (fret?.length === 6) {
        fret.forEach((item: number, idx: number) => {
          setPositionToPlaceFingers(
            (prev) =>
              [
                ...prev,
                {
                  stringNumber: fret?.length - idx,
                  fretNumber: item,
                  fingerNumber: finger[idx],
                },
              ] || []
          );
        });
      }
    };
    getStringNumAndFretNum(fret as number[], finger as number[]);
  }, []);

  return (
    <>
      <div className="relative w-full container mx-auto  h-full py-14 ">
        <div className="strings relative z-10">
          <div
            className={`relative mt-6 mb-[55px] h-[0.5px] w-full bg-[#FFF]`}
            id="string-1"
          ></div>
          <div
            className={`relative mt-6 mb-[55px] h-[1.8px] w-full bg-[#EA9E2D]`}
            id="string-2"
          ></div>
          <div
            className={`relative mt-6 mb-[55px] h-[1.2px] w-full bg-[#F642EF]`}
            id="string-3"
          ></div>
          <div
            className={`relative mt-6 mb-[55px] h-[2px] w-full bg-[#C2D934]`}
            id="string-4"
          ></div>
          <div
            className={`relative mt-6 mb-[55px] h-[3px] w-full bg-[#C65151]`}
            id="string-5"
          ></div>
          <div
            className={`relative mt-6 mb-[55px] h-1 w-full bg-[#38DBE5]`}
            id="string-6"
          ></div>
        </div>
        <div className="frets flex -mt-[22.1%]">
          <div className="b-1 h-[284px] w-[120px]" id="fret-1">
            <div className="b-1 mr-[120px] h-[284px] w-3 bg-[#FFF]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex flex-column justify-end -mt-8 -mx-3`}
          >
            1
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-2">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            2
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-3">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            3
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-4">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            4
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-5">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            5
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-6">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            6
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-7">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            7
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-8">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            8
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-9">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            9
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-10">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            10
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-11">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            11
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-12">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            12
          </span>
          <div className="b-1 h-[284px] w-[120px]" id="fret-13">
            <div className="b-1 mr-[120px] h-[284px] w-2 bg-[#FFF]"></div>
            <div className="w-3 h-3 flex items-center justify-center rotate-45 translate-x-14 -translate-y-[152px]"></div>
          </div>
          <span
            className={`text-white h-[100%] font-Lora text-3xl flex items-end -mt-8 -mx-3`}
          >
            13
          </span>
        </div>
        <div className="fingers ">
          {positionToPlaceFingers
            ?.slice(0, 6)
            ?.map((item: IPositionsToBePlaced, idx: number) => {
              const stringDiv = document
                ?.getElementById(`string-${item?.stringNumber}`)
                ?.getBoundingClientRect();

              const fretDiv = document
                ?.getElementById(`fret-${item?.fretNumber}`)
                ?.getBoundingClientRect();

              return (
                // fretNumber === -1 means not to be pressed and rendered
                item?.fretNumber !== -1 && (
                  <div
                    className={`absolute h-[32px] w-[32px] rounded-full bg-[#FFF] z-20`}
                    key={idx}
                    style={{
                      left: `${fretDiv && fretDiv.x - 140}px`,
                      top: `${stringDiv && stringDiv.y - 162}px`,
                    }}
                  >
                    <h3 className="mt-[-2px] flex items-center justify-center font-Lora text-2xl text-black">
                      {item?.fingerNumber}
                    </h3>
                  </div>
                )
              );
            })}
        </div>
        <div className="hole w-[400px] h-[400px] bg-[#2D2D2D] rounded-full absolute -right-[250px] top-5 z-1"></div>
      </div>
    </>
  );
}
