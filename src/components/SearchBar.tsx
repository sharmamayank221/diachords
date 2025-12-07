import React from "react";
import data from "@/chrods.json";
import { useRouter } from "next/router";
import type { A } from "@/types/chord.types";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { getSingleDataForDynamicPage, setSearchChordData } from "@/reducers/chord/searchDataSlice";

// Build a flat list of all chords with their full names for searching
function getAllChords(): Array<{ chord: A; fullName: string; searchName: string }> {
  const allChords: Array<{ chord: A; fullName: string; searchName: string }> = [];
  
  for (const key of Object.keys(data.chords)) {
    const chords = data.chords[key as keyof typeof data.chords];
    for (const chord of chords) {
      const fullName = `${chord.key}${chord.suffix || ""}`;
      // Create a normalized search name (lowercase, no spaces)
      const searchName = fullName.toLowerCase().replace(/\s+/g, "");
      allChords.push({ chord: chord as A, fullName, searchName });
    }
  }
  
  return allChords;
}

// Fuzzy match function - checks if query matches the chord name
function fuzzyMatch(query: string, chordName: string): { matches: boolean; score: number } {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, "");
  const normalizedChord = chordName.toLowerCase().replace(/\s+/g, "");
  
  // Exact match gets highest score
  if (normalizedChord === normalizedQuery) {
    return { matches: true, score: 100 };
  }
  
  // Starts with query gets high score
  if (normalizedChord.startsWith(normalizedQuery)) {
    return { matches: true, score: 90 };
  }
  
  // Contains query
  if (normalizedChord.includes(normalizedQuery)) {
    return { matches: true, score: 70 };
  }
  
  // Check if all characters of query appear in order in chord name
  let queryIdx = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  
  for (let i = 0; i < normalizedChord.length && queryIdx < normalizedQuery.length; i++) {
    if (normalizedChord[i] === normalizedQuery[queryIdx]) {
      queryIdx++;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else {
      consecutiveMatches = 0;
    }
  }
  
  if (queryIdx === normalizedQuery.length) {
    // All characters matched in order
    const score = 50 + (maxConsecutive / normalizedQuery.length) * 20;
    return { matches: true, score };
  }
  
  return { matches: false, score: 0 };
}

// Cache all chords
const ALL_CHORDS = getAllChords();

export default function Searchbar() {
  const router = useRouter();
  const searchChord = useAppSelector(
    (state) => state.searchDataSlice.searchChord
  );
  const [searchResults, setSearchResults] = React.useState<Array<{ chord: A; fullName: string; score: number }>>([]);
  const [singleDataForDynamicPage, setSingleDataForDynamicPage] = React.useState<A[]>([]);

  const dispatch = useAppDispatch();

  // Smart search functionality
  React.useEffect(() => {
    if (!searchChord || searchChord.trim() === "") {
      setSearchResults([]);
      return;
    }

    const query = searchChord.trim();
    
    // Find matching chords with scores
    const matches = ALL_CHORDS
      .map(({ chord, fullName, searchName }) => {
        const { matches, score } = fuzzyMatch(query, fullName);
        return { chord, fullName, score, matches };
      })
      .filter(item => item.matches)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 50); // Limit results

    setSearchResults(matches);
  }, [searchChord]);

  // Update single data for dynamic page
  React.useEffect(() => {
    if (searchResults.length > 0) {
      setSingleDataForDynamicPage([searchResults[0].chord]);
    }
  }, [searchResults]);

  // Dispatch to Redux
  React.useEffect(() => {
    dispatch(getSingleDataForDynamicPage(singleDataForDynamicPage));
  }, [dispatch, singleDataForDynamicPage]);

  const handleChordClick = (item: A) => {
    const chordKey = encodeURIComponent(item.key.toLowerCase());
    const chordSuffix = item.suffix || "";
    const newPath = `/chords/${chordKey}${chordSuffix}`;

    if (router.asPath !== newPath) {
      router.push(newPath);
    }

    // Clear search
    dispatch(setSearchChordData(""));
  };

  // Group results by key for better display
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, Array<{ chord: A; fullName: string }>> = {};
    
    for (const result of searchResults) {
      const key = result.chord.key;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({ chord: result.chord, fullName: result.fullName });
    }
    
    return groups;
  }, [searchResults]);

  const hasResults = searchResults.length > 0;

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Also handle native input events for better compatibility
  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      dispatch(setSearchChordData(target.value));
    };

    input.addEventListener('input', handleInput);
    return () => input.removeEventListener('input', handleInput);
  }, [dispatch]);

  return (
    <div className="h-full">
      <form className="relative flex w-full" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={inputRef}
          type="text"
          className="focus:shadow-outline shadow-none h-[48px] md:h-[60px] rounded-full border-none bg-[#2D2D2D] pl-4 font-Lora text-base md:text-lg text-[#FFF] outline-none focus:outline-none w-full"
          placeholder="search any chord here"
          color="#FFF"
          onChange={(e: React.FormEvent<HTMLInputElement>) =>
            dispatch(setSearchChordData(e?.currentTarget?.value))
          }
          defaultValue=""
        />

        {searchChord && hasResults && (
          <div className="absolute top-12 mx-auto mt-[22px] w-full rounded-[20px] border-none bg-[#2D2D2D] p-4 z-50 max-h-[400px] overflow-y-auto">
            {Object.entries(groupedResults).map(([key, chords]) => (
              <div key={key} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-[28px] w-[28px] rounded-full bg-[#1BD79E] flex items-center justify-center`}>
                    <span className="font-Lora text-lg text-black font-semibold">
                      {key}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 ml-2">
                  {chords.map((item, idx) => (
                    <span
                      key={idx}
                      className="cursor-pointer font-Lora text-white hover:text-[#1BD79E] transition-colors px-2 py-1 rounded hover:bg-[#1BD79E20]"
                      onClick={() => handleChordClick(item.chord)}
                    >
                      {item.fullName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {searchChord && !hasResults && (
          <div className="absolute top-12 mx-auto mt-[22px] w-full rounded-[20px] border-none bg-[#2D2D2D] p-4 z-50">
            <span className="font-Lora text-gray-400">
              No chords found for &quot;{searchChord}&quot;
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
