import { describe, expect, it } from "vitest";
import { spellScale } from "./scaleSpelling";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

describe("scale spelling", () => {
  it.each([
    ["F major", 5, MAJOR, undefined, "F G A Bb C D E", "1 2 3 4 5 6 7"],
    ["Eb major", 3, MAJOR, undefined, "Eb F G Ab Bb C D", "1 2 3 4 5 6 7"],
    ["F# major", 6, MAJOR, undefined, "F# G# A# B C# D# E#", "1 2 3 4 5 6 7"],
    ["D natural minor", 2, [0, 2, 3, 5, 7, 8, 10], undefined, "D E F G A Bb C", "1 2 ♭3 4 5 ♭6 ♭7"],
    ["A harmonic minor", 9, [0, 2, 3, 5, 7, 8, 11], undefined, "A B C D E F G#", "1 2 ♭3 4 5 ♭6 7"],
    ["C lydian", 0, [0, 2, 4, 6, 7, 9, 11], undefined, "C D E F# G A B", "1 2 3 ♯4 5 6 7"],
    ["B locrian", 11, [0, 1, 3, 5, 6, 8, 10], undefined, "B C D E F G A", "1 ♭2 ♭3 4 ♭5 ♭6 ♭7"],
    ["A minor pentatonic", 9, [0, 3, 5, 7, 10], "pentatonic_minor", "A C D E G", "1 ♭3 4 5 ♭7"],
    ["A blues", 9, [0, 3, 5, 6, 7, 10], "blues", "A C D Eb E G", "1 ♭3 4 ♭5 5 ♭7"],
    ["Bb major pentatonic", 10, [0, 2, 4, 7, 9], "pentatonic_major", "Bb C D F G", "1 2 3 5 6"],
  ])("%s", (_label, root, intervals, id, names, degrees) => {
    const s = spellScale(root, intervals, id);
    expect(s.names.join(" ")).toBe(names);
    expect(s.degrees.join(" ")).toBe(degrees);
  });

  it("never uses double sharps or flats for any major or natural minor key", () => {
    for (let root = 0; root < 12; root++) {
      for (const intervals of [MAJOR, [0, 2, 3, 5, 7, 8, 10]]) {
        const { names } = spellScale(root, intervals);
        expect(names.some((n) => /##|bb/.test(n)), `root ${root}: ${names.join(" ")}`).toBe(false);
        expect(new Set(names.map((n) => n[0])).size, `one of each letter, root ${root}`).toBe(7);
      }
    }
  });
});
