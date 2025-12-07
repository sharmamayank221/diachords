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

        {/* Acoustic Guitar Body - Horizontal orientation matching fretboard */}
        <div className="absolute -right-[280px] -top-[100px] z-[-1] hidden md:block">
          <svg 
            width="700" 
            height="550" 
            viewBox="0 0 700 550" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main Body Shape - Acoustic guitar body (horizontal, neck enters from left) */}
            {/* Upper bout */}
            <ellipse 
              cx="400" 
              cy="150" 
              rx="200" 
              ry="120" 
              fill="#1a1a1a"
            />
            {/* Lower bout (larger) */}
            <ellipse 
              cx="380" 
              cy="400" 
              rx="250" 
              ry="140" 
              fill="#1a1a1a"
            />
            {/* Waist connector */}
            <rect
              x="180"
              y="150"
              width="250"
              height="250"
              fill="#1a1a1a"
            />
            {/* Cutaway curve (left side where neck meets body) */}
            <path 
              d="M180 150 
                 Q120 200 140 275 
                 Q160 350 180 400"
              fill="#1a1a1a"
              stroke="#1a1a1a"
              strokeWidth="40"
            />
            {/* Waist indents */}
            <ellipse 
              cx="130" 
              cy="220" 
              rx="60" 
              ry="40" 
              fill="#000"
            />
            <ellipse 
              cx="630" 
              cy="280" 
              rx="50" 
              ry="60" 
              fill="#000"
            />
            
            {/* Body outline/edge */}
            <path 
              d="M180 50
                 C320 30 550 50 580 150
                 C620 220 620 200 600 280
                 C620 360 600 480 450 520
                 C300 550 180 530 130 450
                 C80 370 90 320 120 280
                 C90 220 100 140 180 50Z"
              fill="none"
              stroke="#333"
              strokeWidth="2"
            />
            
            {/* Sound Hole */}
            <circle 
              cx="350" 
              cy="230" 
              r="75" 
              fill="#0a0a0a"
            />
            
            {/* Rosette rings */}
            <circle 
              cx="350" 
              cy="230" 
              r="90" 
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="8"
            />
            <circle 
              cx="350" 
              cy="230" 
              r="82" 
              fill="none"
              stroke="#1BD79E"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <circle 
              cx="350" 
              cy="230" 
              r="100" 
              fill="none"
              stroke="#222"
              strokeWidth="3"
            />
            
            {/* Bridge */}
            <rect 
              x="280" 
              y="380" 
              width="150" 
              height="16" 
              rx="3" 
              fill="#111"
              stroke="#333"
              strokeWidth="1"
            />
            
            {/* Saddle */}
            <rect 
              x="290" 
              y="378" 
              width="130" 
              height="4" 
              rx="2" 
              fill="#ddd"
            />
            
            {/* Bridge pins */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <circle 
                key={i}
                cx={300 + i * 20} 
                cy="392" 
                r="3" 
                fill="#0a0a0a"
                stroke="#333"
                strokeWidth="1"
              />
            ))}
            
            {/* Pickguard */}
            <path 
              d="M230 180 
                 C200 200 190 260 200 300 
                 C210 340 250 360 280 350 
                 C300 340 310 300 300 260 
                 C290 220 260 160 230 180Z"
              fill="#111"
              opacity="0.6"
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
