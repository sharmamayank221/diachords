import { useState, useEffect } from "react";
import { initAudio, playChord } from "../../utils/audioUtils";

interface AudioPlayerProps {
  midiNotes: number[];
}

function AudioPlayer({ midiNotes }: AudioPlayerProps): JSX.Element {
  const [playing, setPlaying] = useState<boolean>(false);

  useEffect(() => {
    initAudio();
  }, []);

  function play(): void {
    if (!playing) {
      setPlaying(true);
      playChord(midiNotes);
      setTimeout(() => {
        setPlaying(false);
      }, 2000); // Match the duration in audioUtils.ts
    }
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-white mb-4">Chord Player</h1>
      <div className="flex justify-center">
        <button
          onClick={play}
          className={`px-8 py-3 rounded-full font-semibold text-lg text-white transition-colors ${
            playing
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-[#1BD79E] hover:bg-[#5ebca0]"
          }`}
          disabled={playing}
        >
          {playing ? "Playing..." : "Play Chord"}
        </button>
      </div>
    </div>
  );
}

export default AudioPlayer;
