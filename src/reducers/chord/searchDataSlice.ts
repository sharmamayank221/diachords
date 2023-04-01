import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, createAction } from "@reduxjs/toolkit";

import { A, KEY_SIGNATURE } from "@/types/chord.types";

export interface singleDataForDynamicPage {
  singleData: A[];
  apiData: A[];
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
  apiData: [
    {
      key: KEY_SIGNATURE.A,
      suffix: "",
      positions: [],
      id: "",
    },
  ],
};

export const searchDataSliceReducer = createSlice({
  name: "searchdata",
  initialState,
  reducers: {
    getSingleDataForDynamicPage: (state, action: PayloadAction<any>): void => {
      state.singleData = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { getSingleDataForDynamicPage } = searchDataSliceReducer.actions;

export default searchDataSliceReducer.reducer;
