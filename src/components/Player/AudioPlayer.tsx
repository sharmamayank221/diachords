import { useState } from "react";

function AudioPlayer(): JSX.Element {
  const [midiOutput, setMidiOutput] = useState<MIDIOutput | null>(null);
  const [notes, setNotes] = useState<number[]>([48, 55, 60, 64, 67]);
  const [currentNote, setCurrentNote] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);

  function playMidiNote(noteNumber: number): void {
    if (midiOutput === null) {
      console.log("No MIDI output available");
      return;
    }

    const NOTE_ON = 0x90;
    const NOTE_VELOCITY = 127;

    midiOutput.send([NOTE_ON, noteNumber, NOTE_VELOCITY]);
  }

  function stopMidiNote(noteNumber: number): void {
    if (midiOutput === null) {
      console.log("No MIDI output available");
      return;
    }

    const NOTE_OFF = 0x80;

    midiOutput.send([NOTE_OFF, noteNumber, 0]);
  }

  function play(): void {
    if (!playing) {
      setPlaying(true);
      setCurrentNote(0);
      playNextNote();
    }
  }

  function playNextNote(): void {
    if (currentNote < notes.length) {
      const noteNumber = notes[currentNote];
      playMidiNote(noteNumber);
      setTimeout(() => {
        stopMidiNote(noteNumber);
        setCurrentNote(currentNote + 1);
        playNextNote();
      }, 500);
    } else {
      setPlaying(false);
    }
  }

  function stop(): void {
    setPlaying(false);
    stopMidiNote(notes[currentNote]);
    setCurrentNote(0);
  }

  function initMidi(): void {
    navigator.requestMIDIAccess({ sysex: true }).then((midiAccess) => {
      midiAccess.onstatechange = () => {
        console.log("MIDI state changed:", midiAccess);
      };

      // Get the first output port
      const output = midiAccess.outputs.values().next().value;
      setMidiOutput(output);
    });
  }

  return (
    <div>
      <h1>Play MIDI Notes</h1>
      <button onClick={play} className="text-white">
        Play
      </button>
      <button onClick={stop} className="text-white">
        Stop
      </button>
      {midiOutput === null && <div>No MIDI output available</div>}
    </div>
  );
}

export default AudioPlayer;
