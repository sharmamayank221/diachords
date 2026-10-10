import { describe, expect, it } from "vitest";
import { getScalePositions, notesInPosition, type PositionSystem } from "./scalePositions";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
const MINOR_PENT = [0, 3, 5, 7, 10];
const MAJOR_PENT = [0, 2, 4, 7, 9];
const BLUES = [0, 3, 5, 6, 7, 10];
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // high e → low E
const SYSTEMS: PositionSystem[] = ["positions", "caged"];

// frets on each string, low E first — how guitarists read shape charts
const shape = (root: number, intervals: number[], pos: ReturnType<typeof getScalePositions>[number]) =>
  [5, 4, 3, 2, 1, 0].map((s) => notesInPosition(root, intervals, pos, s).join(","));

describe("scale positions", () => {
  it("A minor pentatonic gives the five standard boxes in both systems", () => {
    const standard = [
      ["5,8", "5,7", "5,7", "5,7", "5,8", "5,8"],
      ["8,10", "7,10", "7,10", "7,9", "8,10", "8,10"],
      ["10,12", "10,12", "10,12", "9,12", "10,13", "10,12"],
      ["12,15", "12,15", "12,14", "12,14", "13,15", "12,15"],
      ["15,17", "15,17", "14,17", "14,17", "15,17", "15,17"],
    ];
    for (const system of SYSTEMS) {
      expect(getScalePositions(9, MINOR_PENT, system).map((p) => shape(9, MINOR_PENT, p))).toEqual(standard);
    }
  });

  it("labels CAGED shapes E-D-C-A-G up the neck", () => {
    expect(getScalePositions(9, MINOR_PENT, "caged").map((p) => `${p.label} ${p.from}-${p.to}`)).toEqual([
      "E 5-8", "D 7-10", "C 9-13", "A 12-15", "G 14-17",
    ]);
    expect(getScalePositions(0, MAJOR, "caged").map((p) => `${p.label} ${p.from}-${p.to}`)).toEqual([
      "E 7-10", "D 9-13", "C 12-15", "A 14-17", "G 17-20",
    ]);
  });

  it("C major E shape is the standard 7th-position fingering", () => {
    const eShape = getScalePositions(0, MAJOR, "caged")[0];
    expect(eShape.label).toBe("E");
    expect(shape(0, MAJOR, eShape)).toEqual(["7,8,10", "7,8,10", "7,9,10", "7,9,10", "8,10", "7,8,10"]);
  });

  it("every pentatonic box in all 12 keys has exactly two notes per string", () => {
    for (let root = 0; root < 12; root++) {
      for (const intervals of [MINOR_PENT, MAJOR_PENT]) {
        for (const system of SYSTEMS) {
          for (const pos of getScalePositions(root, intervals, system)) {
            const counts = shape(root, intervals, pos).map((frets) => frets.split(",").length);
            expect(counts, `root ${root} ${system} ${pos.label} (frets ${pos.from}-${pos.to})`).toEqual([2, 2, 2, 2, 2, 2]);
          }
        }
      }
    }
  });

  it("keeps the open E minor pentatonic box at the nut but moves boxes that would need notes below it", () => {
    expect(getScalePositions(4, MINOR_PENT, "positions")[0]).toMatchObject({ from: 0, to: 3 });
    // E major pentatonic would need frets below the nut, so its first shape starts higher
    expect(getScalePositions(4, MAJOR_PENT, "positions").every((p) => p.from >= 1)).toBe(true);
  });

  it("every shape contains every note of the scale and stays playable (≤ 6 frets)", () => {
    for (let root = 0; root < 12; root++) {
      for (const intervals of [MAJOR, NATURAL_MINOR, BLUES, MINOR_PENT]) {
        for (const system of SYSTEMS) {
          for (const pos of getScalePositions(root, intervals, system)) {
            const pcs = new Set<number>();
            OPEN_MIDI.forEach((open, s) => notesInPosition(root, intervals, pos, s).forEach((f) => pcs.add((open + f) % 12)));
            const where = `root ${root} [${intervals}] ${system} ${pos.label}`;
            expect(pcs.size, where).toBe(intervals.length);
            expect(pos.to - pos.from + 1, where).toBeLessThanOrEqual(6);
          }
        }
      }
    }
  });
});
