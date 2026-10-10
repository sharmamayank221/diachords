import React from "react";

interface IPositionsToBePlaced {
  stringNumber: number;
  fretNumber: number;
  fingerNumber?: number;
  baseFret?: number;
}

// a function that will give me string number and fret number from the fret array's individual indexes
function useGetStringNumAndFretNum(
  fret: number[],
  finger: number[],
  baseFret: number
): IPositionsToBePlaced[] {
  // derived directly from props so positions never go stale between variations
  return React.useMemo(() => {
    if (!Array.isArray(fret) || fret.length !== 6) return [];
    return fret.map((item: number, idx: number) => ({
      stringNumber: fret.length - idx,
      fretNumber: item,
      fingerNumber: finger?.[idx],
      baseFret: baseFret,
    }));
  }, [finger, fret, baseFret]);
}

export default useGetStringNumAndFretNum;
