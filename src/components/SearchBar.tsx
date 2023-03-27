import React from "react";

import data from "../chrods.json";
import type { A, KEY_SIGNATURE } from "../types/chord.types";
import type { RootState } from "../../app/store";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { getSingleDataForDynamicPage } from "@/slices/searchDataSlice";

interface IChordSearch {
  searchChord: string;
  setSearchChord: (status: string) => A[];
}

export default function Searchbar() {
  const [searchChord, setSearchChord] = React.useState<string>("");
  const [Data, setData] = React.useState<A[]>([]);
  const [singleDataForDynamicPage, setSingleDataForDynamicPage] =
    React.useState<A[]>([]);

  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );
  const dispatch = useAppDispatch();

  console.log(singleData, "data");

  React.useEffect(() => {
    setData(data?.chords[searchChord.toUpperCase()]);
  }, [Data, searchChord]);

  React.useEffect(() => {
    Data &&
      Data.forEach((item: A, idx: number) => {
        setSingleDataForDynamicPage([item]);
      });
  }, [Data, dispatch]);
  dispatch(getSingleDataForDynamicPage(Data));

  return (
    <div className="h-full">
      <form className=" relative flex w-full items-center justify-center">
        <input
          type="text"
          className="focus:shadow-outline shadow-none mt-12 h-[60px] w-[50%] rounded-full border-none bg-[#2D2D2D] pl-4 font-Lora text-lg text-[#FFF] outline-none focus:outline-none"
          placeholder="search.."
          color="#FFF"
          onChange={(e: React.FormEvent<HTMLInputElement>) =>
            setSearchChord(e?.currentTarget?.value)
          }
          value={searchChord}
        />
        {searchChord !== "" && (
          <div className="absolute top-28 z-30 mx-auto mt-[22px] w-[50%] rounded-[20px] border-none bg-[#2D2D2D] p-4">
            <div className={`h-[32px] w-[32px] rounded-full bg-[#1BD79E]`}>
              <span className="mt-[-2px] flex items-center justify-center font-Lora text-2xl text-white">
                {searchChord?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center space-x-7 space-y-7">
              {Data?.map((item, idx) => {
                return (
                  <div key={idx}>
                    <span
                      key={idx}
                      className="cursor-pointer font-Lora text-white hover:text-[#1BD79E]"
                    >
                      {item?.suffix}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
