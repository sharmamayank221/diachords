import React from "react";
import type { ChordPosition } from "@/helpers/chordSearch";

interface ChordDiagramProps {
  position?: ChordPosition;
  size?: number; // rendered width in px
  showFingers?: boolean;
  highlightStrings?: number[]; // string numbers (6 = low E) to glow
  className?: string;
  title?: string;
}

const FRETS_SHOWN = 4;
const GREEN = "#1BD79E";

// Classic vertical chord box: low E on the left, nut (or fret number) on top.
export default function ChordDiagram({
  position,
  size = 120,
  showFingers = true,
  highlightStrings = [],
  className,
  title,
}: ChordDiagramProps) {
  if (!position) return null;
  const { frets, fingers, baseFret = 1, barres = [] } = position;

  const W = 100;
  const padX = 16;
  const top = 26;
  const gridW = W - padX * 2;
  const gridH = 96;
  const colGap = gridW / 5;
  const rowGap = gridH / FRETS_SHOWN;
  const H = top + gridH + 8;
  const dotR = Math.min(colGap, rowGap) * 0.36;
  const xOf = (idx: number) => padX + idx * colGap; // idx 0 = string 6
  const yOf = (fret: number) => top + (fret - 0.5) * rowGap;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      className={className}
      role="img"
      aria-label={title}
    >
      {title && <title>{title}</title>}

      {/* nut or starting fret */}
      {baseFret === 1 ? (
        <rect x={padX - 1} y={top - 4} width={gridW + 2} height={4} rx={1} fill="#e8e8e8" />
      ) : (
        <text x={padX - 5} y={yOf(1) + 3} textAnchor="end" fontSize={9} fill="#9ca3af" fontFamily="Inter, sans-serif">
          {baseFret}
        </text>
      )}

      {/* frets */}
      {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
        <line key={`f${i}`} x1={padX} x2={padX + gridW} y1={top + i * rowGap} y2={top + i * rowGap} stroke="#3f3f46" strokeWidth={1} />
      ))}
      {/* strings: thicker toward low E */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`s${i}`} x1={xOf(i)} x2={xOf(i)} y1={top} y2={top + gridH} stroke="#71717a" strokeWidth={1.6 - i * 0.18} />
      ))}

      {/* open / muted markers */}
      {frets.map((f, i) =>
        f === 0 ? (
          <circle key={`o${i}`} cx={xOf(i)} cy={top - 12} r={4} fill="none" stroke={GREEN} strokeWidth={1.4} />
        ) : f < 0 ? (
          <g key={`x${i}`} stroke="#71717a" strokeWidth={1.4} strokeLinecap="round">
            <line x1={xOf(i) - 3.5} y1={top - 15.5} x2={xOf(i) + 3.5} y2={top - 8.5} />
            <line x1={xOf(i) + 3.5} y1={top - 15.5} x2={xOf(i) - 3.5} y2={top - 8.5} />
          </g>
        ) : null
      )}

      {/* barres */}
      {barres.map((b) => {
        const idxs = frets.map((f, i) => (f === b ? i : -1)).filter((i) => i >= 0);
        if (idxs.length < 2) return null;
        const x1 = xOf(Math.min(...idxs));
        const x2 = xOf(Math.max(...idxs));
        return (
          <rect key={`b${b}`} x={x1 - dotR} y={yOf(b) - dotR} width={x2 - x1 + dotR * 2} height={dotR * 2} rx={dotR} fill={GREEN} />
        );
      })}

      {/* finger dots */}
      {frets.map((f, i) => {
        if (f <= 0 || f > FRETS_SHOWN) return null;
        const glow = highlightStrings.includes(6 - i);
        return (
          <g key={`d${i}`}>
            <circle cx={xOf(i)} cy={yOf(f)} r={glow ? dotR * 1.15 : dotR} fill={GREEN} style={glow ? { filter: `drop-shadow(0 0 4px ${GREEN})` } : undefined} />
            {showFingers && fingers?.[i] > 0 && (
              <text x={xOf(i)} y={yOf(f) + 3.2} textAnchor="middle" fontSize={dotR * 1.25} fontWeight={700} fill="#000" fontFamily="Inter, sans-serif">
                {fingers[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
