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
  const [opacity, setOpacity] = useState(0.7);
  const [scale, setScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Use back camera
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

    // Cleanup
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Calculate fret positions to display (show 5 frets)
  const startFret = Math.max(0, baseFret - 1);
  const displayFrets = [0, 1, 2, 3, 4].map((i) => startFret + i);

  // Get finger positions for the overlay
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-Lora text-2xl font-bold">{chordName}</h2>
            <p className="text-gray-400 text-sm font-Lora">Align your guitar with the overlay</p>
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
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200"
              style={{
                top: `calc(50% + ${offsetY}px)`,
                transform: `translateX(-50%) translateY(-50%) scale(${scale})`,
                opacity: opacity,
              }}
            >
              {/* Fretboard Container */}
              <div className="relative">
                {/* Nut (if showing open position) */}
                {startFret === 0 && (
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-white/90 rounded-l-sm" />
                )}

                {/* Frets */}
                <div className="flex">
                  {displayFrets.map((fretNum, fretIdx) => (
                    <div
                      key={fretNum}
                      className="relative"
                      style={{ width: "70px", height: "200px" }}
                    >
                      {/* Fret number */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white font-Lora text-sm font-bold">
                        {fretNum === 0 ? "Open" : fretNum}
                      </div>

                      {/* Fret wire */}
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/60" />

                      {/* Fret background */}
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 to-amber-800/30 border-r border-white/20" />

                      {/* Strings */}
                      {[0, 1, 2, 3, 4, 5].map((stringIdx) => {
                        const stringThickness = [1, 1.5, 2, 2.5, 3, 3.5][stringIdx];
                        const yPos = 15 + stringIdx * 34;
                        
                        return (
                          <div
                            key={stringIdx}
                            className="absolute left-0 right-0"
                            style={{
                              top: `${yPos}px`,
                              height: `${stringThickness}px`,
                              backgroundColor: STRING_COLORS[stringIdx],
                              opacity: 0.8,
                            }}
                          />
                        );
                      })}

                      {/* Finger positions on this fret */}
                      {fingerPositions
                        .filter((pos) => pos.fret === fretNum)
                        .map((pos) => {
                          const yPos = 15 + pos.string * 34;
                          return (
                            <div
                              key={`${pos.string}-${pos.fret}`}
                              className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#1BD79E] flex items-center justify-center shadow-lg shadow-[#1BD79E]/50 animate-pulse"
                              style={{ top: `${yPos - 16}px` }}
                            >
                              <span className="text-black font-Lora font-bold text-lg">
                                {pos.finger}
                              </span>
                            </div>
                          );
                        })}

                      {/* Fret markers */}
                      {[3, 5, 7, 9, 12].includes(fretNum) && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/40" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Open/Muted string indicators */}
                <div className="absolute -left-10 top-0 flex flex-col" style={{ height: "200px" }}>
                  {frets.map((fret, idx) => {
                    const yPos = 15 + idx * 34 - 10;
                    return (
                      <div
                        key={idx}
                        className="absolute text-white font-Lora font-bold text-lg"
                        style={{ top: `${yPos}px` }}
                      >
                        {fret === 0 ? "○" : fret === -1 ? "✕" : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
        {/* Opacity Control */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs font-Lora block mb-2">
            Overlay Opacity
          </label>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full accent-[#1BD79E]"
          />
        </div>

        {/* Scale Control */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs font-Lora block mb-2">
            Size
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-[#1BD79E]"
          />
        </div>

        {/* Position Control */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs font-Lora block mb-2">
            Vertical Position
          </label>
          <input
            type="range"
            min="-200"
            max="200"
            step="10"
            value={offsetY}
            onChange={(e) => setOffsetY(parseInt(e.target.value))}
            className="w-full accent-[#1BD79E]"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-sm font-Lora">
          <span className="text-white flex items-center gap-1">
            <span className="w-6 h-6 rounded-full bg-[#1BD79E] flex items-center justify-center text-black text-xs font-bold">1</span>
            = Finger number
          </span>
          <span className="text-white">○ = Open</span>
          <span className="text-white">✕ = Muted</span>
        </div>
      </div>
    </div>
  );
}

