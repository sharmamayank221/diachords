import React from "react";

interface IPositionsToBePlaced {
  stringNumber: number;
  fretNumber: number;
  fingerNumber?: number;
}

// a function that will give me string number and fret number from the fret array's individual indexes
function useGetStringNumAndFretNum(
  fret: number[],
  finger: number[],
  baseFret: number
) {
  const [positionToPlaceFingers, setPositionToPlaceFingers] = React.useState<
    IPositionsToBePlaced[]
  >([]);
  //  n is the number of elements from the array that needs to be trimmed each time from positionToBePlaceFingers
  const n = 6;
  React.useEffect(() => {
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
                baseFret: baseFret,
              },
            ]
        );
      });
    }
  }, [finger, fret, baseFret]);
  return positionToPlaceFingers.slice(-n);
}

export default useGetStringNumAndFretNum;
