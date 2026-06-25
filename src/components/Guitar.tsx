import React, { useCallback, useEffect, useRef, useState } from "react";
import { A } from "@/types/chord.types";
import { initAudio, playNote } from "@/utils/audioUtils";

// frets[0] = string 6 (low E) … frets[5] = string 1 (high e)
const STRING_NAMES      = ["E", "B", "G", "D", "A", "E"];
const STRING_BASE_MIDI  = [40, 45, 50, 55, 59, 64];
const STRING_HEIGHTS    = ["1px", "2px", "3px", "3.5px", "4px", "5px"];
const FRET_WIDTH_PX     = 96;
const FRETBOARD_OVERHEAD_PX = 24 + 50 + 8 + 40;
const MAX_FRETS         = 24;
const MIN_FRETS         = 12;

interface IGuitar {
  data?: A;
  positionOverride?: number;
  onPositionChange?: (pos: number) => void;
}

function getPositionData(data: A | undefined, position: number) {
  const p = data?.positions?.[position];
  return {
    frets:    (p?.frets    ?? []) as number[],
    fingers:  (p?.fingers  ?? []) as number[],
    baseFret: (p?.baseFret ?? 1)  as number,
    barres:   (p?.barres   ?? []) as number[],
  };
}

function stringIdx(stringNum: number) {
  return 6 - stringNum;
}

function absoluteFret(baseFret: number, relativeFret: number) {
  return baseFret + relativeFret - 1;
}

const ChordDot = React.memo(({
  finger, isPlaying, onClick,
}: {
  finger: number;
  isPlaying: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-label={`Finger ${finger}`}
    className="absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] h-6 w-6 md:h-[30px] md:w-[30px] rounded-full transition-all duration-150 cursor-pointer hover:scale-125 active:scale-95 focus:outline-none z-10"
    style={{
      background: "#1BD79E",
      transform: `translate(-50%, -50%) scale(${isPlaying ? 1.25 : 1})`,
      boxShadow: isPlaying ? "0 0 20px #1BD79E, 0 0 40px #1BD79E" : "none",
    }}
  >
    <span className="flex items-center justify-center font-Lora text-xs font-bold text-black">
      {finger || ""}
    </span>
  </button>
));
ChordDot.displayName = "ChordDot";

export default function Guitar({ data, positionOverride }: IGuitar) {
  const [position, setPosition]       = useState(positionOverride ?? 0);
  const [playingString, setPlayingString] = useState<number | null>(null);
  const [numFrets, setNumFrets]       = useState(MIN_FRETS);
  const fretboardContainerRef         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (positionOverride !== undefined) setPosition(positionOverride);
  }, [positionOverride]);

  useEffect(() => { initAudio(); }, []);

  useEffect(() => {
    const el = fretboardContainerRef.current;
    if (!el) return;
    const measure = () => {
      const available = el.clientWidth - FRETBOARD_OVERHEAD_PX;
      const frets = Math.min(MAX_FRETS, Math.max(MIN_FRETS, Math.floor(available / FRET_WIDTH_PX)));
      setNumFrets(frets);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { frets, fingers, baseFret, barres } = getPositionData(data, position);
  const barreSet = new Set(barres);
  const fretCols = Array.from({ length: numFrets }, (_, i) => i + 1);

  const getRelativeFret = (stringNum: number) => frets[stringIdx(stringNum)] ?? -1;
  const getFinger       = (stringNum: number) => fingers[stringIdx(stringNum)] ?? 0;

  const handleStringClick = useCallback((stringNum: number) => {
    const idx = stringIdx(stringNum);
    const rel = frets[idx];
    if (rel === -1) return;
    const noteMidi = rel === 0
      ? STRING_BASE_MIDI[idx]
      : STRING_BASE_MIDI[idx] + absoluteFret(baseFret, rel);
    setPlayingString(idx);
    playNote(noteMidi);
    setTimeout(() => setPlayingString(null), 500);
  }, [frets, baseFret]);

  const hasFretMarker = (f: number) => [3, 5, 7, 9].includes(f);
  const hasDoubleMark   = (f: number) => f === 12;

  return (
    <div className="overflow-x-auto w-full" ref={fretboardContainerRef}>
      <div className="flex" style={{ minWidth: "max-content" }}>

        {/* String name labels */}
        <div className="flex flex-col">
          <div className="h-8" />
          <div className="h-[199px] md:h-[279px] flex flex-col justify-around pb-1">
            {STRING_NAMES.map((name, i) => (
              <span key={i}
                className="flex items-center justify-center w-6 font-Lora font-bold text-[11px] md:text-[13px]"
                style={{ color: "#1BD79E" }}>
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Open-string zone */}
        <div className="flex flex-col items-center mr-1">
          <div className="h-8 flex items-end pb-1">
            <span className="font-Inter text-[11px] text-gray-500 uppercase tracking-wider w-10 text-center">Open</span>
          </div>
          <div className="h-[199px] md:h-[279px] w-10 relative flex flex-col justify-around py-1">
            {[1, 2, 3, 4, 5, 6].map(stringNum => {
              const rel       = getRelativeFret(stringNum);
              const isOpen    = rel === 0;
              const isMuted   = rel === -1;
              const isPlaying = playingString === stringIdx(stringNum) && isOpen;

              return (
                <div key={stringNum} className="flex items-center justify-center">
                  {isMuted ? (
                    <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-Lora font-bold text-[12px] text-red-400">X</span>
                  ) : isOpen ? (
                    <button
                      onClick={() => handleStringClick(stringNum)}
                      className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      style={{
                        background: "transparent",
                        border: "2px solid #1BD79E",
                        boxShadow: isPlaying ? "0 0 14px #1BD79E" : "none",
                      }}>
                      <span className="font-Lora text-[9px] font-bold leading-none text-[#1BD79E]">O</span>
                    </button>
                  ) : (
                    <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-Lora font-bold text-[12px] text-gray-600">·</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Nut */}
        <div className="flex flex-col">
          <div className="h-8" />
          <div className="h-[199px] md:h-[279px] w-[6px] md:w-[8px] rounded-sm" style={{ background: "#e8e8e8" }} />
        </div>

        {/* Fret columns */}
        {fretCols.map(fretNum => {
          const isBarreCol = Array.from(barreSet).some(r => absoluteFret(baseFret, r) === fretNum);

          const barreStringNums = isBarreCol
            ? [1, 2, 3, 4, 5, 6].filter(s => {
                const r = getRelativeFret(s);
                return r > 0 && barreSet.has(r) && absoluteFret(baseFret, r) === fretNum && getFinger(s) === 1;
              })
            : [];
          const barreTop    = barreStringNums.length ? Math.min(...barreStringNums) : -1;
          const barreBottom = barreStringNums.length ? Math.max(...barreStringNums) : -1;

          return (
            <div key={fretNum} className="flex flex-col items-center">
              <div className="h-8 flex items-end pb-1">
                <span className="font-Inter text-[11px] text-gray-500 w-[80px] md:w-[96px] text-center">
                  {fretNum}
                </span>
              </div>
              <div className="h-[199px] md:h-[279px] w-[80px] md:w-[96px] relative border-r-4 border-r-[#333] border-collapse">
                {[1, 2, 3, 4, 5, 6].map(stringNum => {
                  const rel        = getRelativeFret(stringNum);
                  const finger     = getFinger(stringNum);
                  const isPressed  = rel > 0 && absoluteFret(baseFret, rel) === fretNum;
                  const isPlaying  = playingString === stringIdx(stringNum) && isPressed;
                  const inBarre    = isBarreCol && stringNum >= barreTop && stringNum <= barreBottom;
                  const hideDot    = inBarre && finger === 1 && stringNum !== barreTop;

                  return (
                    <div key={stringNum}
                      className="w-full mb-9 md:mb-[52px] relative"
                      style={{ background: "#FFF", height: STRING_HEIGHTS[stringNum - 1] }}>

                      {isBarreCol && stringNum === barreTop && barreStringNums.length > 1 && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 z-[5] rounded-full pointer-events-none"
                          style={{
                            width: 26,
                            top: "50%",
                            height: (barreBottom - barreTop) * 52,
                            background: "linear-gradient(180deg, #1BD79E 0%, #15c48e 100%)",
                            boxShadow: "0 0 14px rgba(27,215,158,0.45)",
                          }}
                        />
                      )}

                      {isPressed && !hideDot && (
                        <ChordDot
                          finger={finger}
                          isPlaying={isPlaying}
                          onClick={() => handleStringClick(stringNum)}
                        />
                      )}
                    </div>
                  );
                })}

                {hasFretMarker(fretNum) && (
                  <div className="w-2.5 h-2.5 bg-[#444] rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                )}
                {hasDoubleMark(fretNum) && (
                  <>
                    <div className="w-2.5 h-2.5 bg-[#444] rounded-full absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <div className="w-2.5 h-2.5 bg-[#444] rounded-full absolute left-1/2 top-[65%] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
