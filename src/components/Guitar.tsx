import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";
import { A } from "@/types/chord.types";
import Image from "next/image";
import React from "react";
import Switch from "react-switch";
import Fret from "./Fret";
import AudioPlayer from "./Player/AudioPlayer";

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
  const Frets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const [checked, setChecked] = React.useState<boolean>();
  const [PreviousButtonDisabled, setPreviousButtonDisabled] =
    React.useState<boolean>(false);
  const [NextButtonDisabled, setNextButtonDisabled] =
    React.useState<boolean>(false);

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
    setFretsToUse(data?.positions?.[position + 1]?.frets);
    setFingersToUse(data?.positions?.[position + 1]?.fingers);
  };

  const handlePrevPosition = () => {
    if (position > 0) {
      setPosition((prev) => prev - 1);
    }

    setFretsToUse(data?.positions?.[position - 1]?.frets);
    setFingersToUse(data?.positions?.[position - 1]?.fingers);
  };
  const baseFretDiv = document
    ?.getElementById(`fret-${hasBar?.[0]?.baseFret}`)
    ?.getBoundingClientRect();

  React.useEffect(() => {
    if (position === 0) {
      setPreviousButtonDisabled(true);
    } else {
      setPreviousButtonDisabled(false);
    }
    if (data?.positions?.length && position === data?.positions?.length - 1) {
      setNextButtonDisabled(true);
    } else {
      setNextButtonDisabled(false);
    }
  }, [data?.positions?.length, position]);

  const [midiNotes, setMidiNotes] = React.useState<number[]>([]);

  React.useEffect(() => {
    // Calculate MIDI notes based on fretsToUse
    if (fretsToUse) {
      const notes = fretsToUse.map((fret, index) => {
        if (fret === -1) return -1; // Muted string
        const baseNote = [40, 45, 50, 55, 59, 64][index]; // MIDI notes for standard tuning
        return baseNote + fret;
      }).filter(note => note !== -1);
      setMidiNotes(notes);
    }
  }, [fretsToUse]);

  return (
    <>
      <div className="positions flex items-center justify-center w-full container mx-auto  mb-4">
        {/* <label className="text-white font-Lora text-xl md:text-3xl flex items-center">
          <h4>Capo : {""}</h4>
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
        </label> */}
        <button
          onClick={handlePrevPosition}
          className="cursor-pointer"
          disabled={PreviousButtonDisabled}
        >
          <Image
            src="/arrowRight.svg"
            alt="next"
            width={80}
            height={80}
            className={`rotate-180 origin-center w-[60px] h-[60px] md:w-[80px] md:h-[80px] ${
              PreviousButtonDisabled ? "opacity-50" : "opacity-100"
            }`}
          />
        </button>
        <h2 className="text-white text-center font-Lora text-xl md:text-3xl">
          Variation: {position + 1}
        </h2>

        <button
          onClick={hanldeNextPosition}
          className={` -mt-[10px] md:-mt-[30px] cursor-pointer w-[60px] h-[60px] md:w-[80px] md:[80px] ${
            NextButtonDisabled ? "opacity-50" : "opacity-100"
          }`}
          disabled={NextButtonDisabled}
        >
          <Image src="/arrowRight.svg" alt="next" width={80} height={80} />
        </button>
      </div>
      <div className="frets  z-20 -mt-2 relative ">
        <div className="overflow-x-scroll flex h-[276px] md:h-[350px] w-[600px] sm:w-[700px] md:w-[1000px] lg:w-[1536px] overflow-y-hidden">
          {fretObjects.map((fret, idx) => {
            return (
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

        <div className="hole w-[400px] h-[400px] bg-[#2D2D2D] rounded-full absolute -right-[50px] -top-[20px] z-[-1] hidden md:block"></div>
      </div>
      <div className="relative w-full h-full md:pt-14 flex items-center justify-center container mx-auto">
        <div className="">
          {/* <div className="positions hidden items-center justify-start lg:justify-center w-full container mx-auto md:flex ">
            <label className="text-white font-Lora text-xl md:text-3xl flex items-center">
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
            <button
              onClick={handlePrevPosition}
              className="cursor-pointer"
              disabled={PreviousButtonDisabled}
            >
              <Image
                src="/arrowRight.svg"
                alt="next"
                width={80}
                height={80}
                className={`rotate-180 origin-center ${
                  PreviousButtonDisabled ? "opacity-50" : "opacity-100"
                }`}
              />
            </button>
            <h2 className="text-white text-center font-Lora text-xl md:text-3xl">
              Variation: {position + 1}
            </h2>

            <button
              onClick={hanldeNextPosition}
              className={`-mt-[10px] cursor-pointer ${
                NextButtonDisabled ? "opacity-50" : "opacity-100"
              }`}
              disabled={NextButtonDisabled}
            >
              <Image src="/arrowRight.svg" alt="next" width={80} height={80} />
            </button>
          </div> */}
        </div>
      </div>
      
      <div className="mt-4 flex justify-center">
        <AudioPlayer midiNotes={midiNotes} />
      </div>
    </>
  );
}
