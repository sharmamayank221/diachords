import React from "react";
import { useRouter } from "next/router";

import data from "@/chrods.json";
import type { A } from "@/types/chord.types";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  getSingleDataForDynamicPage,
  setSearchChordData,
} from "@/reducers/chord/searchDataSlice";
import { KEY_SIGNATURE } from "@/types/chord.types";

interface IChordSearch {
  searchChord: string;
  setSearchChord: (status: string) => A[];
}

export default function Searchbar() {
  const router = useRouter();
  const searchChord = useAppSelector(
    (state) => state.searchDataSlice.searchChord
  );
  const [Data, setData] = React.useState<any>([]);
  const [singleDataForDynamicPage, setSingleDataForDynamicPage] =
    React.useState<A[]>([]);

  const dispatch = useAppDispatch();

  const isChordPage = router.pathname.startsWith('/chords/');

  // Updated search functionality
  React.useEffect(() => {
    const searchKey = searchChord.toUpperCase();
    const sharpKey = searchKey.replace('#', 'SHARP');

    let foundChords: any[] = [];

    // Search for the key in the data structure
    for (let key of Object.keys(data.chords)) {
      if (key.toUpperCase() === searchKey || key.toUpperCase() === sharpKey) {
        foundChords = data.chords[key as keyof typeof data.chords];
        break;
      }
    }

    // If we have a more specific search (like C5 or Cdim7), filter the found chords
    if (searchKey.length > 2 && foundChords.length > 0) {
      foundChords = foundChords.filter(chord => {
        const chordName = (chord.key + (chord.suffix || '')).toUpperCase();
        return chordName === searchKey || chordName.replace('#', 'SHARP') === sharpKey;
      });
    } else if (searchKey.length === 2 && searchKey.endsWith('#')) {
      // For C#, D#, etc., don't filter
    }

    setData(foundChords);
  }, [searchChord]);

  // need to optimize this
  React.useEffect(() => {
    if (searchChord) {
      Data &&
        Data.forEach((item: A, idx: number) => {
          setSingleDataForDynamicPage([item]);
        });
    }
  }, [Data, dispatch, searchChord]);

  // incase i need searchdata in any other component
  React.useEffect(() => {
    dispatch(getSingleDataForDynamicPage(singleDataForDynamicPage));
  }, [dispatch, singleDataForDynamicPage]);

  const handleChordClick = (item: any) => {
    const chordKey = encodeURIComponent(item.key.toLowerCase());
    const chordSuffix = item.suffix || '';
    const newPath = `/chords/${chordKey}${chordSuffix}`;

    if (router.asPath !== newPath) {
      router.push(newPath);
    }
    
    // Update Redux state with the original chord data
    dispatch(setSearchChordData(''));
  };

  return (
    <div className="h-full">
      <form className="relative flex w-full">
        <input
          type="text"
          className="focus:shadow-outline shadow-none h-[48px] md:h-[60px] rounded-full border-none bg-[#2D2D2D] pl-4 font-Lora text-base md:text-lg text-[#FFF] outline-none focus:outline-none w-full"
          placeholder="search any chord here"
          color="#FFF"
          onChange={(e: React.FormEvent<HTMLInputElement>) =>
            dispatch(setSearchChordData(e?.currentTarget?.value))
          }
          value={searchChord}
        />

        {searchChord && Data.length > 0 && (
          <div className="absolute top-12 mx-auto mt-[22px] w-full rounded-[20px] border-none bg-[#2D2D2D] p-4 z-50">
            <div className={`h-[32px] w-[32px] rounded-full bg-[#1BD79E]`}>
              <span className="mt-[-2px] flex items-center justify-center font-Lora text-2xl text-white capitalize">
                {searchChord}
              </span>
            </div>
            <div className="flex flex-wrap items-center space-x-7 space-y-7">
              {Data.map((item: any, idx: number) => (
                <div key={idx}>
                  <span
                    className="cursor-pointer font-Lora text-white hover:text-[#1BD79E]"
                    onClick={() => handleChordClick(item)}
                  >
                    {item?.key}{item?.suffix || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
