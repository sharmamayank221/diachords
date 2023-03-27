import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { A, KEY_SIGNATURE } from "@/types/chord.types";

export interface singleDataForDynamicPage {
  singleData: A[];
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
};

export const searchDataSlice = createSlice({
  name: "searchdata",
  initialState,
  reducers: {
    getSingleDataForDynamicPage: (state, action: PayloadAction<A[]>) => {
      state.singleData = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { getSingleDataForDynamicPage } = searchDataSlice.actions;

export default searchDataSlice.reducer;
