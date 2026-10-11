import { describe, expect, it } from "vitest";
import { parseChord, romanToChord } from "./theory";
import { STYLES, STYLE_BY_ID, stepsPerBar } from "./styles";
import { generateArrangement, progressionToChords, totalBeats, withCustomChords } from "./arrangement";
import { compilePass, swingBeat } from "./compile";
import { sectionFor } from "./dynamics";

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

describe("theory", () => {
  it("parses chord symbols including slash chords and unknown extensions", () => {
    expect(parseChord("Am7")).toMatchObject({ rootPc: 9, third: 3, fifth: 7, seventh: 10, quality: "min" });
    expect(parseChord("G7")).toMatchObject({ rootPc: 7, third: 4, seventh: 10 });
    expect(parseChord("Cmaj7")).toMatchObject({ seventh: 11 });
    expect(parseChord("Bm7b5")).toMatchObject({ fifth: 6, seventh: 10, quality: "dim" });
    expect(parseChord("D/F#")).toMatchObject({ rootPc: 2, bassPc: 6 });
    expect(parseChord("E5")).toMatchObject({ third: null, quality: "power" });
    expect(parseChord("Emadd11")?.third).toBe(3); // unknown minor extension stays minor
    expect(parseChord("H7")).toBeNull();
  });

  it("turns Roman numerals into correctly spelled chords", () => {
    const c = (r: string, key: number, mode: "major" | "minor" = "major") => romanToChord(r, key, mode);
    expect(["I", "IV", "V7", "vi", "ii7", "Imaj7"].map((r) => c(r, 0))).toEqual(["C", "F", "G7", "Am", "Dm7", "Cmaj7"]);
    expect(["I", "IV", "V", "vi"].map((r) => c(r, 8))).toEqual(["Ab", "Db", "Eb", "Fm"]);
    expect(["i", "bVII", "bVI", "iv"].map((r) => c(r, 9, "minor"))).toEqual(["Am", "G", "F", "Dm"]);
    expect(["i", "bVII", "bVI", "bIII"].map((r) => c(r, 0, "minor"))).toEqual(["Cm", "Bb", "Ab", "Eb"]);
    expect(c("iiø7", 0, "minor")).toBe("Dø7");
    expect(c("i5", 4, "minor")).toBe("E5");
    expect(c("bVII5", 4, "minor")).toBe("D5");
  });

  it("splits bars with |", () => {
    expect(progressionToChords("ii7|V7 Imaj7", 0, "major", 4)).toEqual([
      { chord: "Dm7", beats: 2 },
      { chord: "G7", beats: 2 },
      { chord: "Cmaj7", beats: 4 },
    ]);
  });
});

describe("styles", () => {
  it.each(STYLES.map((s) => [s.id]))("%s has grids that fit its meter", (id) => {
    const st = STYLE_BY_ID[id];
    const n = stepsPerBar(st);
    for (const bar of [...st.drums.bars, st.drums.fill]) for (const [piece, pat] of Object.entries(bar)) expect(pat.length, `${id} ${piece}`).toBe(n);
    if (st.guitar.pattern) expect(st.guitar.pattern.length, `${id} guitar`).toBe(n);
    if (st.keys.pattern) expect(st.keys.pattern.length, `${id} keys`).toBe(n);
    if (Array.isArray(st.bass)) for (const slot of st.bass) expect(slot.step).toBeLessThan(n);
    expect(st.tempo.default).toBeGreaterThanOrEqual(st.tempo.min);
    expect(st.tempo.default).toBeLessThanOrEqual(st.tempo.max);
  });
});

describe("compile", () => {
  it("every style compiles in every key and mode with sane events", () => {
    for (const st of STYLES) {
      for (const key of KEYS) {
        for (const mode of ["major", "minor"] as const) {
          const arr = generateArrangement({ style: st.id, key, mode, seed: 42 });
          for (const cycle of [0, 1]) {
            const pass = compilePass(arr, cycle);
            expect(pass.lengthBeats).toBe(totalBeats(arr));
            for (const ev of pass.events) {
              const where = `${st.id} ${key} ${mode} ${ev.part}`;
              expect(Number.isFinite(ev.beat), where).toBe(true);
              expect(ev.beat, where).toBeGreaterThanOrEqual(0);
              expect(ev.beat, where).toBeLessThan(pass.lengthBeats);
              expect(ev.vel, where).toBeGreaterThan(0);
              expect(ev.vel, where).toBeLessThanOrEqual(1);
              if (ev.part === "bass") expect(ev.midi!, where).toBeGreaterThanOrEqual(26);
              if (ev.part === "bass") expect(ev.midi!, where).toBeLessThanOrEqual(56);
              if (ev.part === "guitar" || ev.part === "keys") expect(ev.midi, where).toBeDefined();
            }
          }
        }
      }
    }
  });

  it("bass lands on the chord's bass note at each chord change (non-walking styles)", () => {
    for (const st of STYLES.filter((s) => Array.isArray(s.bass))) {
      const arr = generateArrangement({ style: st.id, key: "A", seed: 7 });
      const pass = compilePass(arr, 0);
      let beat = 0;
      for (const slot of arr.chords) {
        const chordBass = parseChord(slot.chord)!.bassPc;
        const first = pass.events.find((e) => e.part === "bass" && Math.abs(e.beat - beat) < 1e-6);
        if (first) expect(((first.midi! % 12) + 12) % 12, `${st.id} ${slot.chord} at ${beat}`).toBe(chordBass);
        beat += slot.beats;
      }
    }
  });

  it("walking bass hits the root on beat 1 and approaches the next chord by a half step", () => {
    const arr = { ...generateArrangement({ style: "jazz", key: "C", seed: 3 }), chords: [{ chord: "Dm7", beats: 4 }, { chord: "G7", beats: 4 }, { chord: "Cmaj7", beats: 8 }] };
    const bass = compilePass(arr, 0).events.filter((e) => e.part === "bass");
    expect(bass).toHaveLength(16);
    expect(bass[0].midi! % 12).toBe(2); // D
    expect(bass[4].midi! % 12).toBe(7); // G
    expect(Math.abs(bass[4].midi! - bass[3].midi!)).toBe(1); // half-step approach into G
  });

  it("uses the slash note in the bass", () => {
    const arr = withCustomChords(generateArrangement({ style: "pop", key: "D", seed: 1 }), ["D", "D/F#", "G", "A"]);
    const bass = compilePass(arr, 0).events.filter((e) => e.part === "bass");
    expect(bass.find((e) => Math.abs(e.beat - 4) < 1e-6)!.midi! % 12).toBe(6); // F#
  });

  it("is deterministic for the same seed and pass, and varies between passes", () => {
    const arr = generateArrangement({ style: "funk", key: "E", seed: 99 });
    expect(compilePass(arr, 3)).toEqual(compilePass(arr, 3));
    const a = compilePass(arr, 0).events.map((e) => e.offsetMs);
    const b = compilePass(arr, 1).events.map((e) => e.offsetMs);
    expect(a).not.toEqual(b);
  });

  it("swings the off-beat toward the triplet position and leaves downbeats alone", () => {
    const lofi = STYLE_BY_ID.lofi; // 0.62 on 16ths
    expect(swingBeat(1, lofi)).toBe(1);
    expect(swingBeat(1.25, lofi)).toBeCloseTo(1 + 0.62 * 0.5, 6);
    expect(swingBeat(1.25, STYLE_BY_ID.rock)).toBe(1.25); // straight style untouched
  });
});

describe("dynamics", () => {
  const sane = (id: string, energy: "auto" | "chill" | "groove" | "drive", cycle: number) => {
    const arr = { ...generateArrangement({ style: id, key: "F#", seed: 11 }), energy, parts: { drums: true, bass: true, guitar: true, keys: true } };
    const pass = compilePass(arr, cycle);
    for (const ev of pass.events) {
      const where = `${id} ${energy} pass ${cycle} ${ev.part}`;
      expect(ev.beat, where).toBeGreaterThanOrEqual(0);
      expect(ev.beat, where).toBeLessThan(pass.lengthBeats);
      expect(ev.vel, where).toBeGreaterThan(0);
      expect(ev.vel, where).toBeLessThanOrEqual(1);
      if (ev.part === "bass") expect(ev.midi!, where).toBeGreaterThanOrEqual(26);
      if (ev.part === "bass") expect(ev.midi!, where).toBeLessThanOrEqual(56);
    }
    return pass;
  };

  it("every style compiles cleanly through a whole song cycle and in every energy mode", () => {
    for (const st of STYLES) {
      for (let cycle = 0; cycle < 8; cycle++) sane(st.id, "auto", cycle);
      for (const mode of ["chill", "groove", "drive"] as const) for (const cycle of [0, 1]) sane(st.id, mode, cycle);
    }
  });

  it("walks through song sections and reports them", () => {
    expect([0, 3, 5, 7].map((c) => sectionFor("auto", c).name)).toEqual(["Verse", "Chorus", "Breakdown", "Chorus"]);
    expect(sectionFor("chill", 3).name).toBe("Chill");
    expect(compilePass(generateArrangement({ style: "rock", key: "C", seed: 1 }), 3).section.name).toBe("Chorus");
  });

  it("plays a chorus louder and busier than a breakdown", () => {
    for (const id of ["rock", "pop", "funk", "country", "soul"]) {
      const arr = generateArrangement({ style: id, key: "C", seed: 5 });
      const chorus = compilePass(arr, 3).events;
      const breakdown = compilePass(arr, 5).events;
      const loud = (evs: typeof chorus) => evs.filter((e) => e.part === "drums").reduce((n, e) => n + e.vel, 0);
      expect(loud(chorus), id).toBeGreaterThan(loud(breakdown) * 1.3);
      const guitar = (evs: typeof chorus) => evs.filter((e) => e.part === "guitar").reduce((n, e) => n + e.vel, 0);
      expect(guitar(chorus), id).toBeGreaterThan(guitar(breakdown));
    }
  });

  it("breaks down to sidestick and quarter-note hats", () => {
    const drums = compilePass(generateArrangement({ style: "rock", key: "C", seed: 5 }), 5).events.filter((e) => e.part === "drums");
    const body = drums.filter((e) => e.beat < 12); // ignore the build fill at the end
    expect(body.some((e) => e.piece === "snare")).toBe(false);
    expect(body.some((e) => e.piece === "sidestick")).toBe(true);
    for (const e of body.filter((e) => e.piece === "hihat")) expect(e.beat % 1).toBe(0);
  });

  it("jazz drops to a two-feel when it's chill", () => {
    const arr = { ...generateArrangement({ style: "jazz", key: "C", seed: 3 }), energy: "chill" as const };
    const bass = compilePass(arr, 0).events.filter((e) => e.part === "bass");
    expect(bass.every((e) => e.beat % 2 === 0)).toBe(true);
    expect(bass.length).toBe(totalBeats(arr) / 2);
  });

  it("adds walk-ups into the next chord when the band is driving", () => {
    const arr = { ...generateArrangement({ style: "rock", key: "C", seed: 8 }), energy: "drive" as const };
    let found = false;
    for (let cycle = 0; cycle < 6 && !found; cycle++) {
      const bass = compilePass(arr, cycle).events.filter((e) => e.part === "bass");
      found = bass.some((e) => Math.abs(((e.beat % 4) + 4) % 4 - 3.5) < 1e-6) && bass.some((e) => Math.abs(((e.beat % 4) + 4) % 4 - 3) < 1e-6);
    }
    expect(found).toBe(true);
  });
});

