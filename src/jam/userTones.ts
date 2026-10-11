// Your own amp/pedal models (.nam) and cabinet impulse responses (.wav), kept in this
// browser's IndexedDB. Nothing is uploaded anywhere.
import type { T3KSource } from "./tone3000";

export interface UserTone {
  id: string;
  kind: "nam" | "ir";
  name: string;
  size: number;
  addedAt: number;
  data: string | ArrayBuffer; // .nam JSON text, or IR file bytes
  meta?: { gear?: string; type?: string; architecture?: string };
  /** where it came from, kept for attribution (TONE3000 tones) */
  t3k?: T3KSource;
}

const DB = "diachords-tones";
const STORE = "tones";
const MAX_NAM_BYTES = 8 * 1024 * 1024;
const MAX_IR_BYTES = 4 * 1024 * 1024;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listUserTones(): Promise<Omit<UserTone, "data">[]> {
  try {
    const all = await tx<UserTone[]>("readonly", (s) => s.getAll());
    return all.map(({ data: _data, ...rest }) => rest).sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    return [];
  }
}

export async function getUserTone(id: string): Promise<UserTone | null> {
  try {
    return (await tx<UserTone | undefined>("readonly", (s) => s.get(id))) ?? null;
  } catch {
    return null;
  }
}

export async function removeUserTone(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

/** Validates and stores a dropped file. Throws a user-readable Error when it's not usable. */
export async function addUserTone(file: File, t3k?: T3KSource): Promise<Omit<UserTone, "data">> {
  const lower = file.name.toLowerCase();
  let tone: UserTone;
  if (lower.endsWith(".nam")) {
    if (file.size > MAX_NAM_BYTES) throw new Error("That .nam file is too large (max 8 MB).");
    const text = await file.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("That file isn’t a valid .nam model.");
    }
    if (!json || typeof json !== "object" || !json.architecture || !(json.weights || json.config)) throw new Error("That file isn’t a valid .nam model.");
    const md = json.metadata ?? {};
    tone = {
      id: `nam-${Date.now().toString(36)}`,
      kind: "nam",
      name: t3k?.title || md.name || [md.gear_make, md.gear_model].filter(Boolean).join(" ") || file.name.replace(/\.nam$/i, ""),
      size: file.size,
      addedAt: Date.now(),
      data: text,
      meta: { gear: md.gear_type ?? t3k?.gear, type: md.tone_type, architecture: json.architecture },
      t3k,
    };
  } else if (/\.(wav|aiff?|flac|ogg|mp3)$/.test(lower)) {
    if (file.size > MAX_IR_BYTES) throw new Error("That impulse response is too large (max 4 MB).");
    tone = { id: `ir-${Date.now().toString(36)}`, kind: "ir", name: t3k?.title || file.name.replace(/\.[^.]+$/, ""), size: file.size, addedAt: Date.now(), data: await file.arrayBuffer(), t3k };
  } else {
    throw new Error("Use a .nam amp/pedal model or a .wav cabinet impulse response.");
  }
  await tx("readwrite", (s) => s.put(tone));
  const { data: _data, ...rest } = tone;
  return rest;
}
