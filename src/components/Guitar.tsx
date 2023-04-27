import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";
import { A } from "@/types/chord.types";
import Image from "next/image";
import React from "react";
import Switch from "react-switch";
import Fret from "./Fret";

// TODO: make this array dynamic so as the user selects how many frets to show on the screen

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
  hasCapo?: boolean;
  hasBar?: [];
}

interface IGuitar {
  id?: string;
  data?: A;
}

export default function Guitar({ data }: IGuitar) {
  console.log(data, "data");
  const Frets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const [checked, setChecked] = React.useState<boolean>();

  const [position, setPosition] = React.useState(0);
  const [fretsToUse, setFretsToUse] = React.useState(
    data?.positions?.[0]?.frets
  );
  const base = data?.positions?.filter(
    (item: any) => item.frets === fretsToUse
  );

  const hasCapo = data?.positions?.filter(
    (item: any) => item?.frets === fretsToUse
  )?.[0]?.capo;

  const handleChange = (hasCapo: any) => {
    if (hasCapo === true) {
      setChecked(true);
    } else {
      setChecked(false);
    }
  };

  const [fingersToUse, setFingersToUse] = React.useState(
    data?.positions?.[0]?.fingers
  );

  const pos = useGetStringNumAndFretNum(
    fretsToUse as number[],
    fingersToUse as number[],
    base?.[0]?.baseFret as number
  );

  const fretObjects = Frets.map((fretNum) => {
    return {
      fretNum: fretNum,
      fretId: pos
        .map((item: any) => item.fretNumber)
        .find((item: any) => item === fretNum),
    };
  });

  const hasBar = data?.positions?.filter(
    (item: any) => item.frets === fretsToUse
  );

  const hanldeNextPosition = () => {
    if (data?.positions?.length && position < data?.positions?.length - 1) {
      setPosition((prev) => prev + 1);
    }

    // position + 1 is to sync position outside and inside the handlenext and handlePrev func
    setFretsToUse(data?.positions?.[position]?.frets);
    setFingersToUse(data?.positions?.[position]?.fingers);
  };

  const handlePrevPosition = () => {
    if (position > 0) {
      setPosition((prev) => prev - 1);
    }
    setFretsToUse(data?.positions?.[position]?.frets);
    setFingersToUse(data?.positions?.[position]?.fingers);
  };
  const baseFretDiv = document
    ?.getElementById(`fret-${hasBar?.[0]?.baseFret}`)
    ?.getBoundingClientRect();

  return (
    <>
      <div className="relative w-full h-full pt-14 flex items-center container mx-auto">
        <div className="">
          <div className="frets flex z-20 -mt-2 relative">
            {fretObjects.map((fret, idx) => {
              return (
                // <div
                //   className="b-1 h-[284px] w-[120px] relative"
                //   id={`fret-${idx + 1}`}
                //   key={idx}
                //   ref={ref}
                // >
                //   <div className="b-1 mr-[120px] h-[284px] w-3 bg-[#FFF]"></div>
                //   <span
                //     className={`text-white h-[100%] font-Lora text-3xl flex flex-column justify-end -mt-8 -mx-3 absolute top-[-32px] left-[72px]`}
                //   >
                //     {fret}
                //   </span>
                //   {fret === 5 && (
                //     <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-16 -translate-y-[152px]"></div>
                //   )}
                //   {fret === 7 && (
                //     <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-16 -translate-y-[152px]"></div>
                //   )}
                //   {fret === 3 && (
                //     <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-16 -translate-y-[152px]"></div>
                //   )}
                //   {fret === 9 && (
                //     <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-16 -translate-y-[152px]"></div>
                //   )}
                //   {fret === 12 && (
                //     <>
                //       <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-16 -translate-y-[210px]"></div>
                //       <div className="w-3 h-3 bg-[#FFF] flex items-center justify-center rotate-45 translate-x-16 -translate-y-[106px]"></div>
                //     </>
                //   )}
                // </div>
                <Fret
                  fretsToUse={
                    (fret.fretId === fret.fretNum && fretsToUse) as number[]
                  }
                  fingersToUse={fingersToUse}
                  fretId={fret.fretId}
                  key={fret.fretId}
                  baseFret={base?.[0]?.baseFret}
                  fretIndex={fret.fretNum}
                />
              );
            })}
          </div>
          {/* <div className="fingers ">
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
                    className={`absolute h-[32px] w-[32px] rounded-full bg-[#1BD79E] ${
                      checked ? "z-20" : "z-40"
                    }`}
                    key={idx}
                    style={{
                      left: `${
                        fretDiv &&
                        baseFretDiv &&
                        fretDiv.x + baseFretDiv.x - 140
                      }px`,
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
          </div> */}
          <div className="positions flex items-center justify-center w-full container mx-auto">
            <label className="text-white font-Lora text-3xl flex items-center">
              Capo : {""}
              <Switch
                onChange={handleChange}
                checked={checked as boolean}
                className="react-switch ml-2"
                disabled={!hasCapo as boolean}
                boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                uncheckedIcon={false}
                checkedIcon={false}
                onColor="#FFF"
              />
            </label>
            <div onClick={handlePrevPosition} className="cursor-pointer">
              <Image
                src="/arrowRight.svg"
                alt="next"
                width={80}
                height={80}
                className="rotate-180 origin-center"
              />
            </div>
            <h2 className="text-white text-center font-Lora text-3xl">
              Variation: {position}
            </h2>

            <div
              onClick={hanldeNextPosition}
              className="-mt-[10px] cursor-pointer"
            >
              <Image src="/arrowRight.svg" alt="next" width={80} height={80} />
            </div>
          </div>
        </div>
        <div className="hole w-[400px] h-[400px] bg-[#2D2D2D] rounded-full absolute -right-[250px] top-5 z-1"></div>
      </div>
    </>
  );
}
