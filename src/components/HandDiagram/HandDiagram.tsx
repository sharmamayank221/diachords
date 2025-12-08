import React from "react";

interface HandDiagramProps {
  fingers: number[];
  frets: number[];
}

const FINGER_NAMES = ["", "Index", "Middle", "Ring", "Pinky"];
const FINGER_SHORT = ["", "1", "2", "3", "4"];

export default function HandDiagram({ fingers, frets }: HandDiagramProps) {
  // Get unique active fingers (1-4, excluding 0 which means open/muted)
  const activeFingers = new Set(fingers.filter((f) => f > 0 && f <= 4));
  
  // Get the strings and frets each finger plays on
  const fingerInfo: { [key: number]: { strings: number[]; fret: number } } = {};
  fingers.forEach((finger, stringIndex) => {
    if (finger > 0 && finger <= 4) {
      const stringNum = 6 - stringIndex;
      const fretNum = frets[stringIndex];
      if (!fingerInfo[finger]) {
        fingerInfo[finger] = { strings: [], fret: fretNum };
      }
      fingerInfo[finger].strings.push(stringNum);
    }
  });

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-Lora text-white text-sm font-medium">
          Fingering Guide
        </h3>
        <span className="text-[10px] text-gray-500 font-Lora">LEFT HAND</span>
      </div>

      {/* Finger Circles - Horizontal Layout */}
      <div className="flex justify-center items-end gap-1 mb-5">
        {/* Thumb */}
        <div className="flex flex-col items-center mr-2">
          <div className="w-10 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
            <span className="text-gray-500 font-Lora text-sm">T</span>
          </div>
          <span className="text-[9px] text-gray-600 mt-1 font-Lora">Thumb</span>
        </div>

        {/* Fingers 1-4 */}
        {[1, 2, 3, 4].map((finger) => {
          const isActive = activeFingers.has(finger);
          const heights = ["h-14", "h-16", "h-15", "h-12"]; // Different heights for realistic look
          
          return (
            <div key={finger} className="flex flex-col items-center">
              <div
                className={`w-10 ${heights[finger - 1]} rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "bg-[#1BD79E] shadow-lg shadow-[#1BD79E]/30"
                    : "bg-[#1a1a1a] border border-[#333]"
                }`}
              >
                <span
                  className={`font-Lora font-bold text-lg ${
                    isActive ? "text-black" : "text-gray-600"
                  }`}
                >
                  {finger}
                </span>
              </div>
              <span className={`text-[9px] mt-1 font-Lora ${isActive ? "text-[#1BD79E]" : "text-gray-600"}`}>
                {FINGER_NAMES[finger].slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Fingers Detail */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((finger) => {
          const isActive = activeFingers.has(finger);
          const info = fingerInfo[finger];
          
          if (!isActive) return null;
          
          return (
            <div
              key={finger}
              className="flex items-center justify-between bg-[#1BD79E]/5 border border-[#1BD79E]/20 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1BD79E] text-black font-bold text-xs flex items-center justify-center font-Lora">
                  {finger}
                </span>
                <span className="text-white text-sm font-Lora">{FINGER_NAMES[finger]}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-Lora">
                <span className="text-gray-400">
                  Fret <span className="text-[#38DBE5]">{info?.fret || "-"}</span>
                </span>
                <span className="text-gray-400">
                  String <span className="text-[#38DBE5]">{info?.strings.join(", ") || "-"}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* No fingers used message */}
      {activeFingers.size === 0 && (
        <div className="text-center py-4">
          <span className="text-gray-500 text-sm font-Lora">Open chord - no fingers needed</span>
        </div>
      )}
    </div>
  );
}
