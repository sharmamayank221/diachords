import React from "react";
import { A } from "@/types/chord.types";
import { initAudio, playNote } from "@/utils/audioUtils";

// frets[0] = string 6 (low E), frets[5] = string 1 (high e)
const STRING_NAMES     = ["E", "A", "D", "G", "B", "e"];
const STRING_BASE_MIDI = [40, 45, 50, 55, 59, 64];

interface IGuitar {
  data?: A;
  positionOverride?: number;
  onPositionChange?: (pos: number) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getPositionData(data: A | undefined, position: number) {
  const p = data?.positions?.[position];
  return {
    frets:    (p?.frets    ?? []) as number[],
    fingers:  (p?.fingers  ?? []) as number[],
    baseFret: (p?.baseFret ?? 1)  as number,
    barres:   (p?.barres   ?? []) as number[],
  };
}

// ── sub-components ────────────────────────────────────────────────────────────

const FingerDot = ({
  finger, isPlaying, onClick, size = 36,
}: { finger: number; isPlaying: boolean; onClick: () => void; size?: number }) => (
  <button
    onClick={onClick}
    className="absolute left-1/2 top-1/2 rounded-full flex items-center justify-center z-10 transition-all active:scale-95 focus:outline-none"
    style={{
      width: size, height: size,
      background: "#1BD79E",
      boxShadow: isPlaying ? "0 0 18px #1BD79E, 0 0 36px #1BD79E55" : "0 2px 8px rgba(0,0,0,.4)",
      transform: isPlaying
        ? "translate(-50%,-50%) scale(1.15)"
        : "translate(-50%,-50%) scale(1)",
    }}
    aria-label={`Finger ${finger}`}
  >
    <span className="font-bold text-white leading-none" style={{ fontSize: size < 32 ? 11 : 14 }}>
      {finger || ""}
    </span>
  </button>
);

// ── LANDSCAPE CHORD DIAGRAM ───────────────────────────────────────────────────
// Strings as horizontal rows (low E top → high e bottom)
// Frets as vertical columns with labels at the bottom: "FRET 1", "FRET 2"…
// Left column: X (muted) / O (open) / · (fretted) indicators
// Thick nut border on left edge of Fret 1 column

function LandscapeChordDiagram({
  frets, fingers, baseFret, barres = [],
  playingString, onStringClick, compact = false,
}: {
  frets: number[]; fingers: number[]; baseFret: number; barres?: number[];
  playingString: number | null; onStringClick: (i: number) => void;
  compact?: boolean;
}) {
  const SHOW_FRETS   = 5;
  const ROW_H        = compact ? 42 : 56;
  const INDICATOR_W  = compact ? 28 : 40;
  const NAME_COL_W   = compact ? 26 : 36;
  const DOT_SIZE     = compact ? 28 : 36;
  const LABEL_H      = compact ? 26 : 32;

  const fretCols = Array.from({ length: SHOW_FRETS }, (_, i) => baseFret + i);
  const barreSet = new Set(barres);

  // Display order: high E (frets[5]) at top → low E (frets[0]) at bottom,
  // matching standard TAB / original fretboard orientation.
  const displayRows = frets
    .map((fret, originalIdx) => ({
      fret,
      finger:      fingers[originalIdx] ?? 0,
      name:        STRING_NAMES[originalIdx],
      originalIdx,
      // string thickness: high E thin (idx5→display row0) → low E thick (idx0→display row5)
      lineH:       originalIdx === 0 ? 2 : originalIdx === 1 ? 1.5 : originalIdx < 4 ? 1.5 : 1,
    }))
    .reverse(); // high E first

  return (
    <div className="w-full select-none flex flex-col">
      <div className="flex w-full">

        {/* ── String name + number labels ── */}
        <div className="flex flex-col flex-shrink-0" style={{ width: NAME_COL_W }}>
          {displayRows.map(({ originalIdx }) => {
            const stringNum = 6 - originalIdx;
            return (
              <div key={originalIdx}
                className="flex flex-col items-end justify-center pr-1.5 gap-0.5"
                style={{ height: ROW_H }}>
                <span className="font-bold leading-none" style={{ color: "#1BD79E", fontSize: compact ? 10 : 12 }}>
                  {STRING_NAMES[originalIdx]}
                </span>
                <span className="text-gray-600 leading-none" style={{ fontSize: compact ? 8 : 9 }}>{stringNum}</span>
              </div>
            );
          })}
          <div style={{ height: LABEL_H }} />
        </div>

        {/* ── X / O / · indicators ── */}
        <div className="flex flex-col flex-shrink-0" style={{ width: INDICATOR_W }}>
          {displayRows.map(({ fret, originalIdx }) => {
            const isMuted = fret === -1;
            const isOpen  = fret === 0;
            return (
              <div key={originalIdx}
                className="flex items-center justify-center"
                style={{ height: ROW_H }}>
                {isMuted ? (
                  <span className="text-red-400 font-bold leading-none" style={{ fontSize: compact ? 13 : 15 }}>X</span>
                ) : isOpen ? (
                  <span className="font-bold leading-none" style={{ color: "#1BD79E", fontSize: compact ? 13 : 15 }}>O</span>
                ) : (
                  <span className="text-[#3a3a3a] leading-none" style={{ fontSize: compact ? 11 : 13 }}>·</span>
                )}
              </div>
            );
          })}
          <div style={{ height: LABEL_H }} />
        </div>

        {/* ── Fret columns ── */}
        <div className="flex flex-1">
          {fretCols.map((absoluteFret, colIdx) => {
            const isFirst    = colIdx === 0;
            const isLast     = colIdx === SHOW_FRETS - 1;
            // frets in JSON are 1-based relative to baseFret; barres array also uses relative frets
            const relativeFret = colIdx + 1;
            const isBarre    = barreSet.has(relativeFret);

            // Barre spans the consecutive strings with finger=1 at this relative fret
            const barreOriginalIdxs = isBarre
              ? frets.reduce<number[]>((acc, f, si) => {
                  if (f === relativeFret && fingers[si] === 1) acc.push(si);
                  return acc;
                }, [])
              : [];
            // In display order (reversed), map to display row indices
            const barreDisplayIdxs = barreOriginalIdxs
              .map(oi => displayRows.findIndex(r => r.originalIdx === oi))
              .sort((a, b) => a - b);
            const barreDispTop    = barreDisplayIdxs[0]   ?? -1;
            const barreDispBottom = barreDisplayIdxs[barreDisplayIdxs.length - 1] ?? -1;

            return (
              <div key={absoluteFret} className="flex-1 flex flex-col relative">
                {displayRows.map(({ fret, finger, originalIdx, lineH }, dispIdx) => {
                  const isPressed = fret === relativeFret;
                  const isPlaying = playingString === originalIdx && isPressed;
                  const isMuted   = fret === -1;
                  const inBarre   = isBarre && dispIdx >= barreDispTop && dispIdx <= barreDispBottom;

                  return (
                    <div key={originalIdx}
                      className="relative flex items-center justify-center"
                      style={{
                        height: ROW_H,
                        borderLeft:  isFirst ? "3px solid #555" : "1px solid #222",
                        borderRight: isLast  ? "1px solid #222" : "none",
                      }}>
                      {/* String line */}
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ height: lineH, background: isMuted ? "#1a1a1a" : "#2d2d2d" }} />

                      {/* Barre vertical bar (drawn once from top string) */}
                      {isBarre && dispIdx === barreDispTop && barreDisplayIdxs.length > 1 && (
                        <div className="absolute left-1/2 -translate-x-1/2 z-10 rounded-full pointer-events-none"
                          style={{
                            width: compact ? 20 : 26,
                            top: ROW_H / 2,
                            height: (barreDispBottom - barreDispTop) * ROW_H,
                            background: "linear-gradient(180deg,#1BD79E 0%,#15c48e 100%)",
                            boxShadow: "0 0 14px rgba(27,215,158,0.45)",
                          }} />
                      )}

                      {/* Finger dot */}
                      {isPressed && !(inBarre && finger === 1 && dispIdx !== barreDispTop) && (
                        <FingerDot
                          finger={finger}
                          isPlaying={isPlaying}
                          onClick={() => onStringClick(originalIdx)}
                          size={DOT_SIZE}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Fret label */}
                <div className="flex items-center justify-center"
                  style={{ height: LABEL_H, borderLeft: isFirst ? "3px solid #555" : "1px solid #222", borderRight: isLast ? "1px solid #222" : "none" }}>
                  <span className="font-Inter text-gray-500 uppercase"
                    style={{ fontSize: compact ? 9 : 10, letterSpacing: compact ? "1px" : "2px" }}>
                    {compact ? absoluteFret : `Fret ${absoluteFret}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Guitar component ─────────────────────────────────────────────────────

export default function Guitar({ data, positionOverride, onPositionChange }: IGuitar) {
  const [position, setPosition] = React.useState(positionOverride ?? 0);
  const [playingString, setPlayingString] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (positionOverride !== undefined) setPosition(positionOverride);
  }, [positionOverride]);

  React.useEffect(() => { initAudio(); }, []);

  const { frets, fingers, baseFret, barres } = getPositionData(data, position);

  const handleStringClick = React.useCallback((stringIdx: number) => {
    const fret = frets[stringIdx];
    if (fret === -1) return;
    const midi = STRING_BASE_MIDI[stringIdx] + fret;
    setPlayingString(stringIdx);
    playNote(midi);
    setTimeout(() => setPlayingString(null), 600);
  }, [frets]);

  const sharedDiagramProps = { frets, fingers, baseFret, barres, playingString, onStringClick: handleStringClick };

  return (
    <>
      {/* ── MOBILE: compact landscape ── */}
      <div className="lg:hidden w-full">
        <LandscapeChordDiagram {...sharedDiagramProps} compact />
      </div>

      {/* ── DESKTOP: full landscape ── */}
      <div className="hidden lg:block w-full">
        <LandscapeChordDiagram {...sharedDiagramProps} />
      </div>
    </>
  );
}
