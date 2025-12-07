import React, { useState, useEffect } from "react";
import data from "@/chrods.json";

interface ChordPosition {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  midi: number[];
}

interface ChordData {
  key: string;
  suffix: string;
  positions: ChordPosition[];
}

interface ChordTooltipProps {
  chordName: string;
  searchId: string;
  children: React.ReactNode;
  isHighlighted?: boolean;
}

// Parse searchId to get key and suffix
function parseSearchId(searchId: string): { key: string; suffix: string } | null {
  // Handle sharp notes (e.g., "csharpmajor" -> "C#", "major")
  const sharpMatch = searchId.match(/^([a-g])sharp(.*)$/i);
  if (sharpMatch) {
    return {
      key: sharpMatch[1].toUpperCase() + "#",
      suffix: sharpMatch[2] || "major",
    };
  }
  
  // Handle flat notes - convert to sharp equivalent for lookup
  const flatMatch = searchId.match(/^([a-g])flat(.*)$/i);
  if (flatMatch) {
    const flatToSharp: Record<string, string> = {
      Db: "C#", Eb: "Eb", Gb: "F#", Ab: "Ab", Bb: "Bb"
    };
    const flatKey = flatMatch[1].toUpperCase() + "b";
    return {
      key: flatToSharp[flatKey] || flatKey,
      suffix: flatMatch[2] || "major",
    };
  }
  
  // Handle regular notes (e.g., "cmajor" -> "C", "major")
  const regularMatch = searchId.match(/^([a-g])(.*)$/i);
  if (regularMatch) {
    return {
      key: regularMatch[1].toUpperCase(),
      suffix: regularMatch[2] || "major",
    };
  }
  
  return null;
}

// Find chord in data
function findChord(searchId: string): ChordData | null {
  const parsed = parseSearchId(searchId);
  if (!parsed) return null;
  
  const { key, suffix } = parsed;
  
  // Try to find the chord in the data
  const chords = data.chords as Record<string, ChordData[]>;
  
  // Try exact key match first
  let keyChords = chords[key];
  
  // If not found, try alternate key names
  if (!keyChords) {
    const keyAliases: Record<string, string> = {
      "C#": "C#", "Db": "C#",
      "D#": "Eb", "Eb": "Eb",
      "F#": "F#", "Gb": "F#",
      "G#": "Ab", "Ab": "Ab",
      "A#": "Bb", "Bb": "Bb",
    };
    const aliasKey = keyAliases[key];
    if (aliasKey) {
      keyChords = chords[aliasKey];
    }
  }
  
  if (!keyChords) return null;
  
  // Find the chord with matching suffix
  const chord = keyChords.find(c => c.suffix === suffix);
  return chord || null;
}

export default function ChordTooltip({ chordName, searchId, children, isHighlighted }: ChordTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [chordData, setChordData] = useState<ChordData | null>(null);
  
  useEffect(() => {
    const chord = findChord(searchId);
    setChordData(chord);
  }, [searchId]);
  
  const position = chordData?.positions[0]; // Use first position
  
  // String names from low to high (reversed for display)
  const stringNames = ["E", "A", "D", "G", "B", "e"];
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Tooltip */}
      {isHovered && position && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 shadow-2xl min-w-[140px]">
            {/* Chord Name */}
            <div className="text-center mb-2">
              <span className="font-Lora text-[#1BD79E] font-bold text-sm">{chordName}</span>
            </div>
            
            {/* Mini Fretboard */}
            <div className="relative">
              {/* Base fret indicator */}
              {position.baseFret > 1 && (
                <div className="absolute -left-4 top-2 text-gray-500 text-xs font-Lora">
                  {position.baseFret}fr
                </div>
              )}
              
              {/* Fretboard grid */}
              <div className="flex flex-col gap-0.5">
                {/* Nut (if base fret is 1) */}
                {position.baseFret === 1 && (
                  <div className="h-1 bg-gray-400 rounded-full mb-1" />
                )}
                
                {/* Frets (4 frets shown) */}
                {[0, 1, 2, 3].map((fretRow) => (
                  <div key={fretRow} className="flex items-center gap-1">
                    {/* Strings */}
                    {position.frets.map((fret, stringIdx) => {
                      const fingerNum = position.fingers[stringIdx];
                      const isOpen = fret === 0 && fretRow === 0;
                      const isMuted = fret === -1 && fretRow === 0;
                      const isPressed = fret === fretRow + position.baseFret - (position.baseFret - 1);
                      const showFinger = fret > 0 && fret - position.baseFret + 1 === fretRow + 1;
                      
                      return (
                        <div
                          key={stringIdx}
                          className="relative w-4 h-5 flex items-center justify-center"
                        >
                          {/* String line */}
                          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-600 -translate-x-1/2" />
                          
                          {/* Fret line */}
                          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-500" />
                          
                          {/* Open string indicator */}
                          {isOpen && (
                            <div className="absolute -top-1 w-2.5 h-2.5 rounded-full border border-gray-400" />
                          )}
                          
                          {/* Muted string indicator */}
                          {isMuted && (
                            <span className="absolute -top-1 text-gray-400 text-xs font-bold">×</span>
                          )}
                          
                          {/* Finger position */}
                          {showFinger && (
                            <div className="absolute w-3 h-3 rounded-full bg-[#1BD79E] flex items-center justify-center z-10">
                              <span className="text-black text-[8px] font-bold">
                                {fingerNum > 0 ? fingerNum : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              {/* String names */}
              <div className="flex gap-1 mt-1 justify-center">
                {stringNames.map((name, idx) => (
                  <span key={idx} className="w-4 text-center text-gray-500 text-[8px] font-Lora">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Click hint */}
            <div className="text-center mt-2 text-gray-500 text-[9px] font-Lora">
              Click for full view
            </div>
          </div>
          
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#1a1a1a] border-r border-b border-[#333] transform rotate-45" />
        </div>
      )}
    </div>
  );
}

