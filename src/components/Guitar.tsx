import React from "react";
import data from "../chrods.json";

import ChordName from "./ChordName";

const Strings = [1, 2, 3, 4, 5, 6];
// TODO: make this array dynamic so as the user selects how many frets to show on the screen
const Frets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const finger = data?.chords.C[0]?.positions?.[0]?.fingers;
const fret = data.chords.C[0]?.positions?.[0]?.frets;

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

export default function Guitar() {
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
      <div className="relative w-full">
        <div className="strings">
          {Strings.map((string: number) => {
            return (
              <div
                className="relative mt-6 mb-[70px] h-[1px] w-full bg-[#FFF]"
                id={`string-${string}`}
                key={`string-${string}`}
              ></div>
            );
          })}
        </div>
        <div className="frets absolute top-0 flex">
          {Frets.map((fret: number) => {
            return (
              <div
                className="b-1 mr-[120px] h-[356px] w-1 bg-[#FFF]"
                id={`fret-${fret}`}
                key={`fret-${fret}`}
              ></div>
            );
          })}
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
                    className={`absolute h-[32px] w-[32px] rounded-full bg-[#1BD79E]`}
                    key={idx}
                    style={{
                      left: `${fretDiv && fretDiv.x + 48}px`,
                      top: `${stringDiv && stringDiv.y - 163}px`,
                    }}
                  >
                    <h3 className="mt-[-2px] flex items-center justify-center font-Lora text-2xl text-white">
                      {item?.fingerNumber}
                    </h3>
                  </div>
                )
              );
            })}
        </div>
        <ChordName />
      </div>
    </>
  );
}
