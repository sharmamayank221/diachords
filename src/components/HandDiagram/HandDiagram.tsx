import React from "react";

interface HandDiagramProps {
  fingers: number[]; // Array of finger numbers used (1-4)
  frets: number[]; // Corresponding fret positions
}

// Finger names for accessibility
const FINGER_NAMES = ["", "Index", "Middle", "Ring", "Pinky"];

export default function HandDiagram({ fingers, frets }: HandDiagramProps) {
  // Get unique active fingers (1-4, excluding 0 which means open/muted)
  const activeFingers = new Set(fingers.filter((f) => f > 0 && f <= 4));
  
  // Get the strings each finger plays on
  const fingerStrings: { [key: number]: number[] } = {};
  fingers.forEach((finger, stringIndex) => {
    if (finger > 0 && finger <= 4) {
      if (!fingerStrings[finger]) fingerStrings[finger] = [];
      fingerStrings[finger].push(6 - stringIndex); // Convert to string number (6-1)
    }
  });

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4">
      <h3 className="font-Lora text-[#1BD79E] text-sm mb-3 text-center">
        Finger Positions
      </h3>
      
      {/* Hand SVG */}
      <div className="relative w-full max-w-[180px] mx-auto">
        <svg
          viewBox="0 0 200 280"
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Palm */}
          <path
            d="M40 280 L40 180 Q40 150 60 140 L60 100 Q60 85 75 85 L85 85 Q90 85 90 90 L90 140 
               L100 90 Q100 75 115 75 L120 75 Q130 75 130 85 L130 140 
               L140 80 Q140 65 155 65 L160 65 Q170 65 170 75 L170 140 
               L175 100 Q175 90 185 90 L190 90 Q200 90 200 100 L200 180 
               Q200 220 180 250 L180 280 Z"
            fill="#1a1a1a"
            stroke="#333"
            strokeWidth="2"
          />
          
          {/* Index finger (1) */}
          <g className="finger-1">
            <ellipse
              cx="75"
              cy="110"
              rx="18"
              ry="22"
              fill={activeFingers.has(1) ? "#1BD79E" : "#2a2a2a"}
              stroke={activeFingers.has(1) ? "#1BD79E" : "#444"}
              strokeWidth="2"
            />
            <text
              x="75"
              y="116"
              textAnchor="middle"
              className="font-Lora font-bold"
              fill={activeFingers.has(1) ? "#000" : "#666"}
              fontSize="16"
            >
              1
            </text>
          </g>

          {/* Middle finger (2) */}
          <g className="finger-2">
            <ellipse
              cx="115"
              cy="100"
              rx="18"
              ry="22"
              fill={activeFingers.has(2) ? "#1BD79E" : "#2a2a2a"}
              stroke={activeFingers.has(2) ? "#1BD79E" : "#444"}
              strokeWidth="2"
            />
            <text
              x="115"
              y="106"
              textAnchor="middle"
              className="font-Lora font-bold"
              fill={activeFingers.has(2) ? "#000" : "#666"}
              fontSize="16"
            >
              2
            </text>
          </g>

          {/* Ring finger (3) */}
          <g className="finger-3">
            <ellipse
              cx="155"
              cy="95"
              rx="18"
              ry="22"
              fill={activeFingers.has(3) ? "#1BD79E" : "#2a2a2a"}
              stroke={activeFingers.has(3) ? "#1BD79E" : "#444"}
              strokeWidth="2"
            />
            <text
              x="155"
              y="101"
              textAnchor="middle"
              className="font-Lora font-bold"
              fill={activeFingers.has(3) ? "#000" : "#666"}
              fontSize="16"
            >
              3
            </text>
          </g>

          {/* Pinky finger (4) */}
          <g className="finger-4">
            <ellipse
              cx="188"
              cy="120"
              rx="15"
              ry="20"
              fill={activeFingers.has(4) ? "#1BD79E" : "#2a2a2a"}
              stroke={activeFingers.has(4) ? "#1BD79E" : "#444"}
              strokeWidth="2"
            />
            <text
              x="188"
              y="126"
              textAnchor="middle"
              className="font-Lora font-bold"
              fill={activeFingers.has(4) ? "#000" : "#666"}
              fontSize="14"
            >
              4
            </text>
          </g>

          {/* Thumb (T) - shown but not numbered */}
          <ellipse
            cx="35"
            cy="200"
            rx="20"
            ry="30"
            fill="#2a2a2a"
            stroke="#444"
            strokeWidth="2"
          />
          <text
            x="35"
            y="206"
            textAnchor="middle"
            className="font-Lora"
            fill="#666"
            fontSize="14"
          >
            T
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-1">
        {[1, 2, 3, 4].map((finger) => {
          const isActive = activeFingers.has(finger);
          const strings = fingerStrings[finger];
          
          return (
            <div
              key={finger}
              className={`flex items-center justify-between text-xs font-Lora px-2 py-1 rounded ${
                isActive ? "bg-[#1BD79E]/10 text-[#1BD79E]" : "text-gray-600"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? "bg-[#1BD79E] text-black" : "bg-[#2a2a2a] text-gray-500"
                  }`}
                >
                  {finger}
                </span>
                <span>{FINGER_NAMES[finger]}</span>
              </span>
              {isActive && strings && (
                <span className="text-gray-400">
                  String {strings.join(", ")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <p className="mt-3 text-center text-gray-500 text-xs font-Lora">
        Green = fingers used for this chord
      </p>
    </div>
  );
}

