import { useState, useEffect } from "react";
import { initAudio, playChord, playNote } from "../../utils/audioUtils";

interface AudioPlayerProps {
  midiNotes: number[];
  individualNotes: number[];
}

function AudioPlayer({ midiNotes }: AudioPlayerProps): JSX.Element {
  const [playing, setPlaying] = useState<boolean>(false);
  const [playingNote, setPlayingNote] = useState<number | null>(null);

  useEffect(() => {
    initAudio();
  }, []);

  function playChordHandler(): void {
    if (!playing) {
      setPlaying(true);
      playChord(midiNotes);
      setTimeout(() => {
        setPlaying(false);
      }, 2000); // Match the duration in audioUtils.ts
    }
  }

  function playNoteHandler(note: number): void {
    if (!playingNote) {
      setPlayingNote(note);
      playNote(note);
      setTimeout(() => {
        setPlayingNote(null);
      }, 500); // Adjust duration as needed
    }
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-white mb-4">Chord and Note Player</h1>
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={playChordHandler}
          className={`px-8 py-3 rounded-full font-semibold text-lg text-white transition-colors ${
            playing
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-[#1BD79E] hover:bg-[#5ebca0]"
          }`}
          disabled={playing}
        >
          {playing ? "Playing Chord..." : "Play Chord"}
        </button>
        <div className="flex flex-wrap justify-center gap-2">
           {midiNotes.map((note) => (
            <button
              key={note}
              onClick={() => playNoteHandler(note)}
              className={`px-4 py-2 rounded font-semibold text-white transition-colors ${
                playingNote === note
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-[#1BD79E] hover:bg-[#5ebca0]"
              }`}
              disabled={playingNote === note}
            >
              {playingNote === note ? "Playing..." : `Note ${note}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
