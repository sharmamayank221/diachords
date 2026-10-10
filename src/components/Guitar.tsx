import Fret from "./Fret";
import React from "react";
import { A } from "@/types/chord.types";
import ChordPlayer from "./Player/ChordPlayer";
import {
  formatChordName,
  getChordShapeInfo,
  getChordStringNotes,
} from "@/helpers/chordNotes";
import useGetStringNumAndFretNum from "@/helpers/getStringNumAndFretNum";
import TutorialSection from "@/components/ChordDetail/TutorialSection";
import LoginModal from "@/components/Auth/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { isSupabaseConfigured } from "@/lib/supabase";

interface IGuitar {
  id?: string;
  data?: A;
}

// ♥ save to "My library"; signed-out visitors are asked to sign in first
function FavoriteButton({ chordId, chordKey, suffix, chordName }: { chordId: string; chordKey: string; suffix: string; chordName: string }) {
  const { user } = useAuth();
  const { isFavorited, toggle, loading } = useFavorites(chordId, chordKey, suffix);
  const [loginOpen, setLoginOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => (user ? toggle() : setLoginOpen(true))}
        disabled={loading}
        aria-pressed={isFavorited}
        aria-label={isFavorited ? `Remove ${chordName} from My library` : `Save ${chordName} to My library`}
        title={isFavorited ? "Saved to My library" : "Save to My library"}
        className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] disabled:opacity-50 ${
          isFavorited ? "bg-[#1BD79E]/15 border-[#1BD79E]/50 text-[#1BD79E]" : "border-white/15 text-gray-400 hover:text-white hover:border-white/30"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.4 3.3 5 6.8 5c2 0 3.5 1.1 4.2 2.4h2C13.7 6.1 15.2 5 17.2 5c3.5 0 5.6 3.4 4.3 6.6C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
        </svg>
      </button>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  );
}

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Guitar({ data }: IGuitar) {
  const Frets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const positions = React.useMemo(() => data?.positions ?? [], [data?.positions]);
  const [position, setPosition] = React.useState(0);

  // a new chord starts again at its first shape
  React.useEffect(() => setPosition(0), [data?.id]);

  const current = positions[position];
  const fretsToUse: number[] | undefined = current?.frets;
  const fingersToUse: number[] | undefined = current?.fingers;
  const baseFret: number = current?.baseFret ?? 1;

  const shapes = React.useMemo(() => positions.map((p: any) => getChordShapeInfo(p)), [positions]);
  const shape = shapes[position];
  const barre = shape?.barres[0];

  const pos = useGetStringNumAndFretNum(fretsToUse as number[], fingersToUse as number[], baseFret);

  const fretObjects = Frets.map((fretNum) => ({
    fretNum,
    fretId: pos.map((item) => item.fretNumber).find((item) => item === fretNum),
  }));

  const goTo = React.useCallback(
    (i: number) => setPosition(Math.max(0, Math.min(positions.length - 1, i))),
    [positions.length]
  );

  // ←/→ step through shapes
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") goTo(position - 1);
      if (e.key === "ArrowRight") goTo(position + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, position]);

  const chordName = formatChordName(data?.key, data?.suffix);
  const chordNotes = React.useMemo(
    () => getChordStringNotes(fretsToUse, baseFret, data?.key),
    [fretsToUse, baseFret, data?.key]
  );
  const mutedStrings = chordNotes.filter((n) => n.midi === null).map((n) => n.stringNumber);
  const [playingStrings, setPlayingStrings] = React.useState<number[]>([]);
  const chordPlayerRef = React.useRef<((stringNum: number) => void) | null>(null);

  const arrowClass =
    "h-9 w-9 shrink-0 rounded-full border border-[#333] flex items-center justify-center text-white transition-colors hover:border-[#1BD79E] hover:text-[#1BD79E] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]";

  return (
    <>
      {/* ── Toolbar: chord name + shape picker ── */}
      <div className="w-full max-w-[1536px] mx-auto px-4 md:px-6 mb-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-Lora text-white text-3xl md:text-4xl leading-tight">{chordName}</h1>
            {isSupabaseConfigured && data?.id && data?.key && (
              <FavoriteButton chordId={data.id} chordKey={data.key} suffix={data.suffix} chordName={chordName} />
            )}
          </div>
          <div className="mt-1 h-5 flex items-center gap-2 font-Inter text-xs text-gray-400">
            {barre ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1BD79E]/10 text-[#1BD79E] px-2.5 py-0.5 font-semibold">
                <span className="h-1.5 w-3 rounded-full bg-[#1BD79E]" aria-hidden />
                Barre at fret {barre.fret} · strings {barre.toString}–{barre.fromString}
              </span>
            ) : (
              <span className="text-gray-500">{shape?.label === "Open" ? "Open position" : `Starts at fret ${baseFret}`}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" role="group" aria-label="Chord shapes">
          <span className="hidden lg:block font-Inter text-[11px] uppercase tracking-wider text-gray-500 mr-1">Shape</span>
          <button onClick={() => goTo(position - 1)} disabled={position === 0} aria-label="Previous shape" className={arrowClass}>
            <Chevron dir="left" />
          </button>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {shapes.map((s, i) => {
              const active = i === position;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-pressed={active}
                  aria-label={`Shape ${i + 1}: ${s.label}`}
                  className={`shrink-0 h-9 rounded-full px-3.5 flex items-center gap-1.5 font-Inter text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
                    active ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#1f1f1f] text-gray-300 hover:bg-[#2a2a2a]"
                  }`}
                >
                  <span className={`text-[10px] ${active ? "text-black/60" : "text-gray-500"}`}>{i + 1}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => goTo(position + 1)}
            disabled={position >= positions.length - 1}
            aria-label="Next shape"
            className={arrowClass}
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <div className="frets z-20 relative">
        <div className="overflow-x-auto flex h-[276px] md:h-[350px] w-full max-w-[1536px] mx-auto pl-6 overflow-y-hidden">
          {fretObjects.map((fret) => (
            <div key={fret.fretNum} className="relative">
              <Fret
                fretsToUse={(fret.fretId === fret.fretNum && fretsToUse) as number[]}
                fingersToUse={fingersToUse}
                fretId={fret.fretId}
                baseFret={baseFret}
                fretIndex={fret.fretNum}
                mutedStrings={mutedStrings}
                playingStrings={playingStrings}
                barre={barre && barre.relativeFret === fret.fretNum ? barre : undefined}
                onStringClick={(stringNum) => chordPlayerRef.current?.(stringNum)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 mb-8">
        <ChordPlayer
          chordName={chordName}
          variation={position + 1}
          totalVariations={positions.length || 1}
          notes={chordNotes}
          playingStrings={playingStrings}
          onPlayingStringsChange={setPlayingStrings}
          playStringRef={chordPlayerRef}
        />
      </div>

      {data?.key && (
        <section className="w-full max-w-[860px] mx-auto px-4 md:px-0 mb-12" aria-label={`${chordName} video tutorial`}>
          <TutorialSection chordKey={data.key} chordSuffix={data.suffix} />
        </section>
      )}
    </>
  );
}
