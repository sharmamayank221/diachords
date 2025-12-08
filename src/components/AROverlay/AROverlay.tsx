import React, { useRef, useState, useEffect } from "react";

interface AROverlayProps {
  chordName: string;
  fingers: number[];
  frets: number[];
  baseFret: number;
  onClose: () => void;
}

const STRING_COLORS = [
  "#38DBE5", // 6th string (low E)
  "#C65151", // 5th string (A)
  "#C2D934", // 4th string (D)
  "#F642EF", // 3rd string (G)
  "#EA9E2D", // 2nd string (B)
  "#9c70e7", // 1st string (high E)
];

export default function AROverlay({
  chordName,
  fingers,
  frets,
  baseFret,
  onClose,
}: AROverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.75);
  const [scale, setScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isVertical, setIsVertical] = useState(true); // Default to vertical for portrait

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Could not access camera. Please allow camera permissions.");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Calculate fret positions
  const startFret = Math.max(0, baseFret - 1);
  const displayFrets = [0, 1, 2, 3, 4].map((i) => startFret + i);

  // Get finger positions
  const getFingerPositions = () => {
    const positions: { string: number; fret: number; finger: number }[] = [];
    frets.forEach((fret, stringIndex) => {
      if (fret > 0 && fingers[stringIndex] > 0) {
        positions.push({
          string: stringIndex,
          fret: fret,
          finger: fingers[stringIndex],
        });
      }
    });
    return positions;
  };

  const fingerPositions = getFingerPositions();

  // Vertical Fretboard (for portrait mode - guitar standing)
  const VerticalFretboard = () => (
    <div className="relative">
      {/* Nut */}
      {startFret === 0 && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-white/90 rounded-t-sm" />
      )}

      {/* Frets container - vertical */}
      <div className="flex flex-col">
        {displayFrets.map((fretNum) => (
          <div
            key={fretNum}
            className="relative"
            style={{ width: "180px", height: "50px" }}
          >
            {/* Fret number - on the left */}
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-white font-Lora text-xs font-bold">
              {fretNum === 0 ? "0" : fretNum}
            </div>

            {/* Fret wire - horizontal */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/60" />

            {/* Fret background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 to-amber-800/20 border-b border-white/20" />

            {/* Strings - vertical lines */}
            {[0, 1, 2, 3, 4, 5].map((stringIdx) => {
              const stringThickness = [3.5, 3, 2.5, 2, 1.5, 1][stringIdx];
              const xPos = 15 + stringIdx * 28;
              
              return (
                <div
                  key={stringIdx}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${xPos}px`,
                    width: `${stringThickness}px`,
                    backgroundColor: STRING_COLORS[stringIdx],
                    opacity: 0.9,
                  }}
                />
              );
            })}

            {/* Finger positions */}
            {fingerPositions
              .filter((pos) => pos.fret === fretNum)
              .map((pos) => {
                const xPos = 15 + pos.string * 28;
                return (
                  <div
                    key={`${pos.string}-${pos.fret}`}
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1BD79E] flex items-center justify-center shadow-lg shadow-[#1BD79E]/50 animate-pulse"
                    style={{ left: `${xPos - 12}px` }}
                  >
                    <span className="text-black font-Lora font-bold text-sm">
                      {pos.finger}
                    </span>
                  </div>
                );
              })}

            {/* Fret markers */}
            {[3, 5, 7, 9, 12].includes(fretNum) && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/40" />
            )}
          </div>
        ))}
      </div>

      {/* Open/Muted indicators - at top */}
      <div className="absolute -top-6 left-0 flex" style={{ width: "180px" }}>
        {frets.map((fret, idx) => {
          const xPos = 15 + idx * 28 - 6;
          return (
            <div
              key={idx}
              className="absolute text-white font-Lora font-bold text-sm"
              style={{ left: `${xPos}px` }}
            >
              {fret === 0 ? "○" : fret === -1 ? "✕" : ""}
            </div>
          );
        })}
      </div>

      {/* String labels at bottom */}
      <div className="absolute -bottom-6 left-0 flex" style={{ width: "180px" }}>
        {["E", "A", "D", "G", "B", "e"].map((note, idx) => {
          const xPos = 15 + idx * 28 - 4;
          return (
            <div
              key={idx}
              className="absolute text-xs font-Lora"
              style={{ left: `${xPos}px`, color: STRING_COLORS[idx] }}
            >
              {note}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Horizontal Fretboard (for landscape mode)
  const HorizontalFretboard = () => (
    <div className="relative">
      {startFret === 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/90 rounded-l-sm" />
      )}

      <div className="flex">
        {displayFrets.map((fretNum) => (
          <div
            key={fretNum}
            className="relative"
            style={{ width: "55px", height: "160px" }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white font-Lora text-xs font-bold">
              {fretNum === 0 ? "0" : fretNum}
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-amber-800/20 border-r border-white/20" />

            {[0, 1, 2, 3, 4, 5].map((stringIdx) => {
              const stringThickness = [1, 1.5, 2, 2.5, 3, 3.5][stringIdx];
              const yPos = 12 + stringIdx * 27;
              
              return (
                <div
                  key={stringIdx}
                  className="absolute left-0 right-0"
                  style={{
                    top: `${yPos}px`,
                    height: `${stringThickness}px`,
                    backgroundColor: STRING_COLORS[stringIdx],
                    opacity: 0.9,
                  }}
                />
              );
            })}

            {fingerPositions
              .filter((pos) => pos.fret === fretNum)
              .map((pos) => {
                const yPos = 12 + pos.string * 27;
                return (
                  <div
                    key={`${pos.string}-${pos.fret}`}
                    className="absolute left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#1BD79E] flex items-center justify-center shadow-lg shadow-[#1BD79E]/50 animate-pulse"
                    style={{ top: `${yPos - 11}px` }}
                  >
                    <span className="text-black font-Lora font-bold text-xs">
                      {pos.finger}
                    </span>
                  </div>
                );
              })}

            {[3, 5, 7, 9, 12].includes(fretNum) && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/40" />
            )}
          </div>
        ))}
      </div>

      <div className="absolute -left-6 top-0 flex flex-col" style={{ height: "160px" }}>
        {frets.map((fret, idx) => {
          const yPos = 12 + idx * 27 - 8;
          return (
            <div
              key={idx}
              className="absolute text-white font-Lora font-bold text-sm"
              style={{ top: `${yPos}px` }}
            >
              {fret === 0 ? "○" : fret === -1 ? "✕" : ""}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-Lora text-xl font-bold">{chordName}</h2>
            <p className="text-gray-400 text-xs font-Lora">Align overlay with your guitar</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-white font-Lora text-lg mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-[#1BD79E] text-black rounded-xl font-Lora font-semibold"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Fretboard Overlay */}
            <div
              className="absolute pointer-events-none transition-all duration-200"
              style={{
                left: `calc(50% + ${offsetX}px)`,
                top: `calc(50% + ${offsetY}px)`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity: opacity,
              }}
            >
              {isVertical ? <VerticalFretboard /> : <HorizontalFretboard />}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-4 pb-8 safe-area-bottom">
        {/* Orientation Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setIsVertical(true)}
            className={`px-4 py-2 rounded-lg font-Lora text-sm transition-all ${
              isVertical
                ? "bg-[#1BD79E] text-black"
                : "bg-white/10 text-white"
            }`}
          >
            📱 Portrait
          </button>
          <button
            onClick={() => setIsVertical(false)}
            className={`px-4 py-2 rounded-lg font-Lora text-sm transition-all ${
              !isVertical
                ? "bg-[#1BD79E] text-black"
                : "bg-white/10 text-white"
            }`}
          >
            📱 Landscape
          </button>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="text-gray-400 text-[10px] font-Lora block mb-1">Opacity</label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-[#1BD79E] h-1"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-Lora block mb-1">Size</label>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-[#1BD79E] h-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="text-gray-400 text-[10px] font-Lora block mb-1">↔ Horizontal</label>
            <input
              type="range"
              min="-150"
              max="150"
              step="5"
              value={offsetX}
              onChange={(e) => setOffsetX(parseInt(e.target.value))}
              className="w-full accent-[#38DBE5] h-1"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-Lora block mb-1">↕ Vertical</label>
            <input
              type="range"
              min="-200"
              max="200"
              step="5"
              value={offsetY}
              onChange={(e) => setOffsetY(parseInt(e.target.value))}
              className="w-full accent-[#38DBE5] h-1"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] font-Lora text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-[#1BD79E] flex items-center justify-center text-black text-[8px] font-bold">1</span>
            Finger
          </span>
          <span>○ Open</span>
          <span>✕ Muted</span>
        </div>
      </div>
    </div>
  );
}
