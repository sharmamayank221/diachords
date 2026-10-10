import Fret from "./Fret";
import React from "react";
import Image from "next/image";
import Switch from "react-switch";
import { A } from "@/types/chord.types";
import ChordPlayer from "./Player/ChordPlayer";
import { formatChordName, getChordStringNotes } from "@/helpers/chordNotes";
import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";

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

  const baseFret: number = base?.[0]?.baseFret ?? 1;
  const chordNotes = React.useMemo(
    () => getChordStringNotes(fretsToUse, baseFret, data?.key),
    [fretsToUse, baseFret, data?.key]
  );
  const mutedStrings = chordNotes.filter((n) => n.midi === null).map((n) => n.stringNumber);
  const [playingStrings, setPlayingStrings] = React.useState<number[]>([]);
  const chordPlayerRef = React.useRef<((stringNum: number) => void) | null>(null);
  const isBarre = (data?.positions?.[position]?.barres?.length ?? 0) > 0;

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
          <h4>{isBarre ? "Barre" : "Capo"} : {capo ? "On" : "Off"}</h4>
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
        {baseFret > 1 && (
          <p className="text-center font-Inter text-xs uppercase tracking-wider text-gray-500 mb-2">
            Starts at fret {baseFret}
          </p>
        )}
        <div className="overflow-x-auto flex h-[276px] md:h-[350px] w-full max-w-[1536px] mx-auto pl-6 overflow-y-hidden">
          {fretObjects.map((fret, idx) => {
            const isCapoFret = fret.fretNum === capoFret;
            return (
              <div key={fret.fretNum} className="relative">
                <Fret
                  fretsToUse={
                    (fret.fretId === fret.fretNum && fretsToUse) as number[]
                  }
                  fingersToUse={fingersToUse}
                  fretId={fret.fretId}
                  baseFret={baseFret}
                  fretIndex={fret.fretNum}
                  mutedStrings={mutedStrings}
                  playingStrings={playingStrings}
                  onStringClick={(stringNum) => chordPlayerRef.current?.(stringNum)}
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
      </div>

      <div className="mt-2 mb-8">
        <ChordPlayer
          chordName={formatChordName(data?.key, data?.suffix)}
          variation={position + 1}
          totalVariations={data?.positions?.length ?? 1}
          notes={chordNotes}
          playingStrings={playingStrings}
          onPlayingStringsChange={setPlayingStrings}
          playStringRef={chordPlayerRef}
        />
      </div>
    </>
  );
}
