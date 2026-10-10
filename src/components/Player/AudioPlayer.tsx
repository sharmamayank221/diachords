import { useState, useEffect } from "react";
import { initAudio, playChord } from "../../utils/audioUtils";

interface AudioPlayerProps {
  midiNotes: number[];
  individualNotes?: number[];
  frets?: number[];
  fingers?: number[];
}

function AudioPlayer({ midiNotes }: AudioPlayerProps): JSX.Element {
  const [playing, setPlaying] = useState<boolean>(false);

  useEffect(() => {
    initAudio();
  }, []);

  function playChordHandler(): void {
    if (!playing) {
      setPlaying(true);
      playChord(midiNotes);
      setTimeout(() => {
        setPlaying(false);
      }, 2000);
    }
  }

  return (
    <div className="flex justify-center">
      <button
        onClick={playChordHandler}
        className={`px-8 py-3 rounded-full font-Lora font-semibold text-lg transition-all duration-300 ${
          playing
            ? "bg-gray-700 text-gray-400 cursor-not-allowed scale-95"
            : "bg-[#1BD79E] text-black hover:bg-[#15c48e] hover:scale-105 active:scale-95"
        }`}
        disabled={playing}
      >
        {playing ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-ping" />
            Playing...
          </span>
        ) : (
          "▶ Strum All"
        )}
      </button>
    </div>
  );
}

export default AudioPlayer;
