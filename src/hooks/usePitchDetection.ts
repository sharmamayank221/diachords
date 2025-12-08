import { useState, useEffect, useRef, useCallback } from "react";
import * as Pitchfinder from "pitchfinder";

export const usePitchDetection = () => {
  const [isListening, setIsListening] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [detectedMidi, setDetectedMidi] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize pitch finder (YIN algorithm is generally good for guitar)
  const detectPitchRef = useRef<any>(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      if (!detectPitchRef.current) {
        // AMDF is a good middle ground. Optimizing frequency range for guitar (Drop D to high frets)
        detectPitchRef.current = Pitchfinder.AMDF({ 
          sampleRate: audioContext.sampleRate,
          minFrequency: 70, // Below Low E (82Hz) / Drop D (73Hz)
          maxFrequency: 1200 // Above High E 20th fret
        });
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      setIsListening(true);
      detectPitchLoop();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
    setDetectedPitch(null);
    setDetectedNote(null);
    setDetectedMidi(null);
  }, []);

  const detectPitchLoop = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    // Reuse buffer if possible, or create new one of correct size
    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const pitch = detectPitchRef.current(buffer);

    if (pitch) {
      setDetectedPitch(pitch);
      
      // Convert frequency to MIDI note
      // MIDI note = 69 + 12 * log2(freq / 440)
      const midi = Math.round(69 + 12 * Math.log2(pitch / 440));
      setDetectedMidi(midi);

      // Convert MIDI to note name
      const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const noteName = noteNames[midi % 12];
      setDetectedNote(noteName);
      
      // console.log(`Detected: ${pitch.toFixed(2)} Hz -> MIDI ${midi} (${noteName})`);
    } else {
      // Optional: clear if no pitch detected for a while? 
      // For now, let's keep the last detected note or maybe clear it if confidence is low (pitchfinder returns null if low confidence usually)
      // setDetectedPitch(null);
    }

    rafIdRef.current = requestAnimationFrame(detectPitchLoop);
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    detectedPitch,
    detectedNote,
    detectedMidi
  };
};
