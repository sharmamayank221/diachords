import SearchBar from "../../components/SearchBar";
import dynamic from "next/dynamic";

export default function Chord() {
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
}
