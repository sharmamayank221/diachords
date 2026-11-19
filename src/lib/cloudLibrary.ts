// The iOS app's chord library. It lives in the user's iCloud key-value storage, so it syncs across
// their Apple devices without an account. A localStorage copy covers devices signed out of iCloud.
import { NativeShell } from "@/lib/native";

export interface SavedChord {
  id: string;
  chord_id: string;
  chord_key: string;
  chord_suffix: string;
  created_at: string;
}

const KEY = "library.savedChords";

type Listener = (chords: SavedChord[]) => void;
const listeners = new Set<Listener>();
let current: SavedChord[] | null = null;
let loading: Promise<SavedChord[]> | null = null;

function parse(raw: string | null | undefined): SavedChord[] | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

async function readCloud(): Promise<SavedChord[] | null> {
  try {
    return parse((await NativeShell.cloudGet({ key: KEY })).value);
  } catch {
    return null;
  }
}

function emit(chords: SavedChord[]) {
  current = chords;
  listeners.forEach((fn) => fn(chords));
}

function load(): Promise<SavedChord[]> {
  loading ??= (async () => {
    const chords = (await readCloud()) ?? parse(localStorage.getItem(KEY)) ?? [];
    current = chords;
    NativeShell.addListener("cloudChanged", async ({ keys }) => {
      if (!keys.includes(KEY)) return;
      const next = (await readCloud()) ?? [];
      localStorage.setItem(KEY, JSON.stringify(next));
      emit(next);
    }).catch(() => {});
    return chords;
  })();
  return loading;
}

/** Calls `fn` with the saved chords now and whenever they change (here or on another device). */
export function watchSavedChords(fn: Listener): () => void {
  listeners.add(fn);
  load().then(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function setChordSaved(chord: Omit<SavedChord, "id" | "created_at">, saved: boolean): Promise<void> {
  const chords = current ?? (await load());
  const rest = chords.filter((c) => c.chord_id !== chord.chord_id);
  const next = saved ? [{ ...chord, id: chord.chord_id, created_at: new Date().toISOString() }, ...rest] : rest;
  const json = JSON.stringify(next);
  localStorage.setItem(KEY, json);
  emit(next);
  await NativeShell.cloudSet({ key: KEY, value: json }).catch(() => {});
}
