import React from "react";
import type { RootState } from "../../app/store";
import { useAppSelector } from "../../app/hooks";

export default function useGetChordData() {
  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );

  return singleData;
}
