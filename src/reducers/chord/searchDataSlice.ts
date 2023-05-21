import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, createAction } from "@reduxjs/toolkit";

import { A, KEY_SIGNATURE } from "@/types/chord.types";

export interface singleDataForDynamicPage {
  singleData: A[];
  searchChord: string;
}

const initialState: singleDataForDynamicPage = {
  singleData: [
    {
      key: KEY_SIGNATURE.A,
      suffix: "",
      positions: [],
      params: {
        id: "",
      },
    },
  ],
  searchChord: "",
};

export const searchDataSliceReducer = createSlice({
  name: "searchdata",
  initialState,
  reducers: {
    getSingleDataForDynamicPage: (state, action: PayloadAction<any>): void => {
      state.singleData = action.payload;
    },
    setSearchChordData: (state, action: PayloadAction<any>): void => {
      state.searchChord = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { getSingleDataForDynamicPage, setSearchChordData } =
  searchDataSliceReducer.actions;

export default searchDataSliceReducer.reducer;
