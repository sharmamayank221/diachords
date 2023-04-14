import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";
import { A } from "@/types/chord.types";
import Image from "next/image";
import React from "react";

// TODO: make this array dynamic so as the user selects how many frets to show on the screen
const Frets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

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
  const [position, setPosition] = React.useState(0);
  const [fretsToUse, setFretsToUse] = React.useState([]);
  const [fingersToUse, setFingersToUse] = React.useState([]);
  const ref = React.useRef(null);

  const pos = useGetStringNumAndFretNum(fretsToUse, fingersToUse);

  // gives DOMRECT : { x: 124, y: 148, width: 4, height: 356, top: 148, right: 128, bottom: 504, left: 124 }
  // console.log(fret2?.getBoundingClientRect().x, "fret");

  // gives DOMRect { x: 0, y: 219, width: 1920, height: 1, top: 219, right: 1920, bottom: 220, left: 0 }
  // console.log(string2?.getBoundingClientRect().y, "string");

  // need to optimize the default position of zero
  const hanldeNextPosition = () => {
    if (position < data?.[0]?.positions?.length - 1) {
      setPosition((prev) => prev + 1);
      setFretsToUse(data?.[0]?.positions?.[position]?.frets);
      setFingersToUse(data?.[0]?.positions?.[position]?.fingers);
    }
  };

  const handlePrevPosition = () => {
    if (position > 0) {
      setPosition((prev) => prev - 1);
      setFretsToUse(data?.[0]?.positions?.[position]?.frets);
      setFingersToUse(data?.[0]?.positions?.[position]?.fingers);
    }
  };

  console.log(pos, "posi");

  return (
    <>
      <div className="relative w-full container mx-auto  h-full py-14 ">
        <div className="strings relative z-30">
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
        <div className="frets flex -mt-[22.1%] z-20 relative">
          {Frets.map((fret, idx) => {
            return (
              <div
                className="b-1 h-[284px] w-[120px] relative"
                id={`fret-${idx + 1}`}
                key={idx}
                ref={ref}
              >
                <div className="b-1 mr-[120px] h-[284px] w-3 bg-[#FFF]"></div>
                <span
                  className={`text-white h-[100%] font-Lora text-3xl flex flex-column justify-end -mt-8 -mx-3 absolute top-[-32px] left-[72px]`}
                >
                  {fret}
                </span>
              </div>
            );
          })}
        </div>
        <div className="fingers ">
          {pos?.map((item: IPositionsToBePlaced, idx: number) => {
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
                  className={`absolute h-[32px] w-[32px] rounded-full bg-[#FFF] z-50`}
                  key={idx}
                  style={{
                    left: `${fretDiv && fretDiv.x - 130}px`,
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
        <div className="positions flex items-center justify-center w-full">
          <div onClick={handlePrevPosition}>
            <Image
              src="/arrowRight.svg"
              alt="next"
              width={80}
              height={80}
              className="rotate-180 origin-center"
            />
          </div>
          <h2 className="text-white text-center font-Lora text-3xl">
            Position: {position}
          </h2>
          <div onClick={hanldeNextPosition} className="-mt-[10px]">
            <Image src="/arrowRight.svg" alt="next" width={80} height={80} />
          </div>
        </div>
      </div>
    </>
  );
}
