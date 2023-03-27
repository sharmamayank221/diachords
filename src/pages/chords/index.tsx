import React from "react";
import dynamic from "next/dynamic";
import { type NextPage } from "next";

import SearchBar from "../../components/SearchBar";

const Chord: NextPage = () => {
  const [searchChord, setSearchChord] = React.useState<string>("");
  const DynamicComponentWithNoSSR = dynamic(
    () => import("../../components/Guitar"),
    { ssr: false }
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-b from-[#0C0C0C] to-[#15162c]">
      <div className="mb-10">
        <SearchBar />
      </div>
      <DynamicComponentWithNoSSR />
    </div>
  );
};

export default Chord;
