import React from "react";
import { useRouter } from "next/router";

import data from "@/chrods.json";
import type { A } from "@/types/chord.types";
import { useAppDispatch } from "@/app/hooks";
import { getSingleDataForDynamicPage } from "@/reducers/chord/searchDataSlice";

interface IChordSearch {
  searchChord: string;
  setSearchChord: (status: string) => A[];
}

export default function Searchbar() {
  const [searchChord, setSearchChord] = React.useState<string>("");
  const [Data, setData] = React.useState<any>([]);
  const [WithIds, setWithIds] = React.useState<any>([]);
  const router = useRouter();
  const [singleDataForDynamicPage, setSingleDataForDynamicPage] =
    React.useState<A[]>([]);

  const dispatch = useAppDispatch();

  // search functionality
  React.useEffect(() => {
    const searchData = WithIds.filter((item: any) =>
      Object.values(item).find((c: any) =>
        c.includes(searchChord.toLowerCase())
      )
    );
    setData(searchData);
  }, [WithIds, searchChord]);

  // what i am trying to achieve is to set the id in all chords objects so that i can search by id as well as make dynamic detail page
  // My approach is use forEach to loop over every object and set the id as keysuffix value
  // this is an array of chords without the ids
  let arrayWithoutIDs: any = [];

  React.useEffect(() => {
    Object.values(data.chords).forEach((item) => {
      item.forEach((ch) => {
        // this id will be used for searching the database and to generate next js dynamic detail pages
        let id = (ch.key + ch.suffix).toLowerCase();
        // for pushing the above id into respective objects
        ch = Object.assign({ ...ch }, { id: id });
        // finally to push each object into an array or state
        arrayWithoutIDs.push(ch);
        setWithIds([...arrayWithoutIDs].slice(0, 552));
      });
    });
  }, []);

  // need to optimize this
  React.useEffect(() => {
    if (searchChord !== "") {
      Data &&
        Data.forEach((item: A, idx: number) => {
          setSingleDataForDynamicPage([item]);
        });
      dispatch(getSingleDataForDynamicPage(Data));
    }
  }, [Data, dispatch, searchChord]);

  return (
    <div className="h-full">
      <form className=" relative flex w-full items-start justify-start">
        <input
          type="text"
          className="focus:shadow-outline shadow-none h-[60px] w-[90%] rounded-full border-none bg-[#2D2D2D] pl-4 font-Lora text-lg text-[#FFF] outline-none focus:outline-none"
          placeholder="search.."
          color="#FFF"
          onChange={(e: React.FormEvent<HTMLInputElement>) =>
            setSearchChord(e?.currentTarget?.value)
          }
          value={searchChord}
        />
        {searchChord !== "" && (
          <div className="absolute top-28 z-30 mx-auto mt-[22px] w-[90%] rounded-[20px] border-none bg-[#2D2D2D] p-4">
            <div className={`h-[32px] w-[32px] rounded-full bg-[#1BD79E]`}>
              <span className="mt-[-2px] flex items-center justify-center font-Lora text-2xl text-white">
                {searchChord?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center space-x-7 space-y-7">
              {Data?.map((item: any, idx: number) => {
                return (
                  <div key={idx}>
                    <span
                      key={idx}
                      className="cursor-pointer font-Lora text-white hover:text-[#1BD79E]"
                      onClick={() => {
                        router.push(`/chords/${item?.id}`);
                        setSearchChord("");
                      }}
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
