import Fret from "./Fret";
import React from "react";
import Image from "next/image";
import Switch from "react-switch";
import { A } from "@/types/chord.types";
import AudioPlayer from "./Player/AudioPlayer";
import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";
import { initAudio, playNote } from "@/utils/audioUtils";

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
  const [checked, setChecked] = React.useState<boolean>(false);
  const [position, setPosition] = React.useState(0);
  const [capo, setCapo] = React.useState(false);
  const [capoFret, setCapoFret] = React.useState<number | null>(null);

  const [PreviousButtonDisabled, setPreviousButtonDisabled] = React.useState<boolean>(false);
  const [NextButtonDisabled, setNextButtonDisabled] = React.useState<boolean>(false);

  const [fretsToUse, setFretsToUse] = React.useState(data?.positions?.[0]?.frets);
  const [fingersToUse, setFingersToUse] = React.useState(data?.positions?.[0]?.fingers);

  React.useEffect(() => {
    const currentPosition = data?.positions?.[position];
    setFretsToUse(currentPosition?.frets);
    setFingersToUse(currentPosition?.fingers);

    // Determine if capo should be applied
    const fingerOnes = currentPosition?.fingers.filter((finger: number) => finger === 1);
    const shouldApplyCapo = fingerOnes && fingerOnes.length >= 3;
    setCapo(shouldApplyCapo || false);

    // Find the capo fret
    const capoFretIndex = currentPosition?.fingers.indexOf(1);
    setCapoFret(capoFretIndex !== -1 && currentPosition?.frets ? currentPosition.frets[capoFretIndex as number] : null);
  }, [data?.positions, position]);

  const handleCapoChange = (newChecked: boolean) => {
    setCapo(newChecked);
  };

  const base = data?.positions?.filter((item: any) => item.frets === fretsToUse);

  const hasCapo = data?.positions?.filter((item: any) => item?.frets === fretsToUse)?.[0]?.capo;

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

  const hasBar = data?.positions?.filter((item: any) => item.frets === fretsToUse);

  const hanldeNextPosition = () => {
    if (data?.positions?.length && position < data?.positions?.length - 1) {
      setPosition((prev) => prev + 1);
    }

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

  // Initialize audio on mount
  React.useEffect(() => {
    initAudio();
  }, []);

  React.useEffect(() => {
    if (fretsToUse) {
      const notes = fretsToUse.map((fret, index) => {
        if (fret === -1) return -1;
        const baseNote = [40, 45, 50, 55, 59, 64][index];
        return baseNote + fret;
      }).filter(note => note !== -1);
      setMidiNotes(notes);
    }
  }, [fretsToUse]);

  // Handler for playing notes from fretboard clicks
  const handleFretboardNotePlay = (midiNote: number, stringNum: number) => {
    playNote(midiNote);
  };

  return (
    <>
      <div className="positions flex items-center justify-center w-full container mx-auto mb-4">
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
      
      <div className="flex justify-center mb-4">
        <label className="text-white font-Lora text-xl md:text-3xl flex items-center">
          <h4>Capo : {capo ? "On" : "Off"}</h4>
          <Switch
            onChange={handleCapoChange}
            checked={capo}
            className="react-switch ml-2"
            disabled={!data?.positions?.[position]?.capo}
            boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
            activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
            uncheckedIcon={false}
            checkedIcon={false}
            onColor="#FFF"
          />
        </label>
      </div>

      <div className="frets z-20 -mt-2 relative">
        <div className="overflow-x-scroll flex h-[276px] md:h-[350px] w-[600px] sm:w-[700px] md:w-[1000px] lg:w-[1536px] overflow-y-hidden">
          {fretObjects.map((fret, idx) => {
            const isCapoFret = fret.fretNum === capoFret;
            return (
              <div key={fret.fretId} className="relative">
                <Fret
                  fretsToUse={
                    (fret.fretId === fret.fretNum && fretsToUse) as number[]
                  }
                  fingersToUse={fingersToUse}
                  fretId={fret.fretId}
                  baseFret={base?.[0]?.baseFret}
                  fretIndex={fret.fretNum}
                  onNotePlay={handleFretboardNotePlay}
                />
                {isCapoFret && capo && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                    <Image
                      src="/capo.svg"
                      alt="Capo"
                      width={40}
                      height={200}
                      className="z-10"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Acoustic Guitar Body */}
        <div className="absolute -right-[100px] -top-[80px] z-[-1] hidden md:block">
          <svg 
            width="550" 
            height="500" 
            viewBox="0 0 550 500" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Guitar Body Shape */}
            <path 
              d="M480 250C480 380 400 480 250 480C100 480 20 380 20 250C20 180 60 120 120 80C180 40 220 20 280 20C340 20 400 60 440 100C480 140 500 180 500 220C500 230 490 240 480 250Z" 
              fill="#1a1a1a"
              stroke="#333"
              strokeWidth="3"
            />
            {/* Upper Bout */}
            <ellipse 
              cx="280" 
              cy="120" 
              rx="140" 
              ry="80" 
              fill="#1a1a1a"
              stroke="#333"
              strokeWidth="2"
            />
            {/* Lower Bout */}
            <ellipse 
              cx="260" 
              cy="320" 
              rx="180" 
              ry="130" 
              fill="#1a1a1a"
              stroke="#333"
              strokeWidth="2"
            />
            {/* Waist (indent) */}
            <ellipse 
              cx="270" 
              cy="220" 
              rx="100" 
              ry="50" 
              fill="#000"
            />
            {/* Sound Hole */}
            <circle 
              cx="270" 
              cy="250" 
              r="80" 
              fill="#2D2D2D"
            />
            {/* Sound Hole Rosette Ring */}
            <circle 
              cx="270" 
              cy="250" 
              r="90" 
              fill="none"
              stroke="#3a3a3a"
              strokeWidth="8"
            />
            <circle 
              cx="270" 
              cy="250" 
              r="100" 
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="4"
            />
            {/* Decorative rosette pattern */}
            <circle 
              cx="270" 
              cy="250" 
              r="95" 
              fill="none"
              stroke="#1BD79E"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />
            {/* Bridge */}
            <rect 
              x="200" 
              y="350" 
              width="140" 
              height="15" 
              rx="3" 
              fill="#222"
              stroke="#444"
              strokeWidth="1"
            />
            {/* Saddle */}
            <rect 
              x="210" 
              y="352" 
              width="120" 
              height="4" 
              rx="2" 
              fill="#ddd"
            />
            {/* Bridge Pins */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <circle 
                key={i}
                cx={225 + i * 20} 
                cy="360" 
                r="3" 
                fill="#111"
                stroke="#333"
                strokeWidth="1"
              />
            ))}
            {/* Pickguard */}
            <path 
              d="M160 200C140 220 130 260 140 300C150 340 180 360 200 350C220 340 230 300 220 260C210 220 180 180 160 200Z" 
              fill="#111"
              stroke="#222"
              strokeWidth="1"
              opacity="0.8"
            />
          </svg>
        </div>
      </div>

      <div className="relative w-full h-full md:pt-14 flex items-center justify-center container mx-auto">
      </div>
      
      <div className="mt-4 flex justify-center">
        <AudioPlayer 
          midiNotes={midiNotes} 
          individualNotes={midiNotes}
          frets={fretsToUse}
          fingers={fingersToUse}
        />
      </div>
    </>
  );
}
