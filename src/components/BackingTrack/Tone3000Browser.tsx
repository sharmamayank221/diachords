/* eslint-disable @next/next/no-img-element -- TONE3000 tone images and avatars are remote, user-uploaded */
import React, { useState } from "react";
import { browseTone3000, downloadTone3000Model, GEAR_LABEL, LICENSE_LABEL, T3KArchitecture, T3KKind, T3KModel, T3KSource, T3KTone, TONE3000_KEY } from "@/jam/tone3000";

const SPLASH_KEY = "t3k-splash-seen";

interface Props {
  onAdd: (file: File, source: T3KSource) => Promise<void>;
}

export function T3KMark({ className = "h-3.5" }: { className?: string }) {
  return <img src="/brand/t3k-mark.svg" alt="T3K" className={`${className} w-auto`} />;
}

export default function Tone3000Browser({ onAdd }: Props) {
  const [arch, setArch] = useState<T3KArchitecture>("2");
  const [splashFor, setSplashFor] = useState<T3KKind | null>(null);
  const [busy, setBusy] = useState<"browsing" | "loading" | null>(null);
  const [picked, setPicked] = useState<{ tone: T3KTone; models: T3KModel[]; kind: T3KKind } | null>(null);
  const [loadedIds, setLoadedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!TONE3000_KEY) return null;

  const load = async (tone: T3KTone, model: T3KModel, kind: T3KKind) => {
    setBusy("loading");
    setError(null);
    try {
      const { file, source } = await downloadTone3000Model(tone, model, kind);
      await onAdd(file, source);
      setLoadedIds((ids) => [...ids, model.id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load that tone.");
    } finally {
      setBusy(null);
    }
  };

  const browse = async (kind: T3KKind) => {
    setSplashFor(null);
    setError(null);
    setBusy("browsing");
    try {
      const res = await browseTone3000(kind, arch);
      if (!res) return;
      if (!res.models.length) {
        setError(kind === "nam" ? `That tone has no ${arch === "2" ? "A2" : "A1"} models. Try switching the model type.` : "That tone has no IR files.");
        return;
      }
      setPicked({ ...res, kind });
      setLoadedIds([]);
      if (res.models.length === 1) await load(res.tone, res.models[0], kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t reach TONE3000.");
    } finally {
      setBusy((b) => (b === "browsing" ? null : b));
    }
  };

  const start = (kind: T3KKind) => {
    let seen = false;
    try {
      seen = localStorage.getItem(SPLASH_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (seen) browse(kind);
    else setSplashFor(kind);
  };

  const continueSplash = () => {
    try {
      localStorage.setItem(SPLASH_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    if (splashFor) browse(splashFor);
  };

  const t3kButton = "inline-flex items-center gap-2 h-9 px-4 whitespace-nowrap rounded-full bg-white text-black font-Inter text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]";

  return (
    <div className="rounded-xl border border-white/10 bg-[#121212] p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <img src="/brand/tone3000-logo.svg" alt="TONE3000" className="h-5 w-auto" />
        <label className="flex items-center gap-2 font-Inter text-xs text-gray-400">
          Model type
          <select value={arch} onChange={(e) => setArch(e.target.value as T3KArchitecture)} className="h-8 rounded-lg bg-[#1a1a1a] border border-white/10 px-2 text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]">
            <option value="2">A2 (newest)</option>
            <option value="1">A1 (classic, biggest library)</option>
          </select>
        </label>
      </div>
      <p className="font-Inter text-xs text-gray-400">Pick from thousands of free amp, pedal and cabinet captures of real gear, made by players around the world. Preview them, then load one straight into your rig.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={t3kButton} disabled={!!busy} onClick={() => start("nam")}>
          <T3KMark /> Browse TONE3000 <span className="hidden sm:inline font-normal text-gray-600">amps &amp; pedals</span>
        </button>
        <button type="button" className={t3kButton} disabled={!!busy} onClick={() => start("ir")}>
          <T3KMark /> Cabinet IRs
        </button>
      </div>
      {busy && (
        <p role="status" className="font-Inter text-xs text-gray-400 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-[#1BD79E] border-t-transparent animate-spin" />
          {busy === "browsing" ? "Pick a tone in the TONE3000 window…" : "Loading tone from TONE3000…"}
        </p>
      )}
      {error && (
        <p role="alert" className="font-Inter text-xs text-[#f59e0b]">
          {error}
        </p>
      )}

      {picked && (
        <div className="rounded-xl bg-[#0b0b0b] border border-white/5 p-3 flex flex-col sm:flex-row gap-3">
          {picked.tone.images?.[0] && <img src={picked.tone.images[0]} alt="" className="w-full sm:w-28 h-28 rounded-lg object-cover shrink-0 bg-[#1a1a1a]" />}
          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <div>
              <a href={picked.tone.url} target="_blank" rel="noreferrer" className="font-Inter text-sm font-semibold text-white hover:underline">
                {picked.tone.title}
              </a>
              <p className="font-Inter text-xs text-gray-500 mt-0.5">
                {GEAR_LABEL[picked.tone.gear] ?? picked.tone.gear} · {picked.tone.format.toUpperCase()} · {LICENSE_LABEL[picked.tone.license] ?? picked.tone.license}
              </p>
              <a href={picked.tone.user.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 font-Inter text-xs text-gray-300 hover:underline">
                {picked.tone.user.avatar_url && <img src={picked.tone.user.avatar_url} alt="" className="h-4 w-4 rounded-full" />}
                {picked.tone.user.display_name || picked.tone.user.username}
              </a>
            </div>
            {picked.models.length > 1 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Models in this tone">
                {picked.models.map((m) => {
                  const done = loadedIds.includes(m.id);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={!!busy || done}
                        onClick={() => load(picked.tone, m, picked.kind)}
                        className={`h-8 px-3 rounded-full font-Inter text-xs ${done ? "bg-[#1BD79E]/15 text-[#1BD79E]" : "bg-[#1a1a1a] text-gray-200 hover:bg-[#262626]"} disabled:cursor-default`}
                      >
                        {done ? "✓ " : "+ "}
                        {m.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {splashFor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="t3k-splash-title" onClick={() => setSplashFor(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-[#121212] border border-white/10 p-6 flex flex-col gap-4 text-center" onClick={(e) => e.stopPropagation()}>
            <img src="/brand/tone3000-logo.svg" alt="TONE3000" className="h-7 w-auto mx-auto" />
            <h2 id="t3k-splash-title" className="font-Inter text-base font-semibold text-white">
              Find your tone on TONE3000
            </h2>
            <p className="font-Inter text-sm text-gray-400">
              ChordsofGuitar has partnered with TONE3000 to give you access to a massive library of Neural Amp Modeler (NAM) captures and IRs of real analog gear, created by a global community of musicians.
            </p>
            <button type="button" autoFocus onClick={continueSplash} className="h-10 rounded-full bg-white text-black font-Inter text-sm font-semibold hover:bg-gray-200">
              Continue
            </button>
            <button type="button" onClick={() => setSplashFor(null)} className="font-Inter text-xs text-gray-500 hover:text-white">
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
