import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { SCALES } from "@/data/scales";
import { loadJamSession, saveJamSession } from "@/utils/jamPracticeHelpers";
import {
  isValidScaleId,
  jamKeyToRootIndex,
  normalizePracticeKey,
  PRACTICE_KEYS,
  PracticeTab,
  rootIndexToJamKey,
  suggestedScaleForJam,
} from "@/utils/practiceKeySync";
import type { Genre } from "@/utils/backingTrackEngine";
import type { BackingTrackGeneratorProps } from "@/components/BackingTrack/BackingTrackGenerator";
import type { ScaleFretboardProps } from "@/components/Scale/ScaleFretboard";

const BackingTrackGenerator = dynamic(
  () => import("@/components/BackingTrack/BackingTrackGenerator"),
  { ssr: false },
) as React.ComponentType<BackingTrackGeneratorProps>;

const ScaleFretboard = dynamic(
  () => import("@/components/Scale/ScaleFretboard"),
  { ssr: false },
) as React.ComponentType<ScaleFretboardProps>;

const VALID_GENRES = new Set<Genre>(["rock", "blues", "jazz", "pop", "funk", "reggae", "country"]);

function tabFromQuery(value: unknown, fallback: PracticeTab): PracticeTab {
  return value === "scales" ? "scales" : value === "jam" ? "jam" : fallback;
}

export interface PracticeStudioProps {
  /** Default tab when `?tab=` is absent (e.g. /jam → jam). */
  defaultTab?: PracticeTab;
}

export default function PracticeStudio({ defaultTab = "jam" }: PracticeStudioProps) {
  const router = useRouter();
  const hydratedRef = useRef(false);

  const [tab, setTabState] = useState<PracticeTab>(defaultTab);
  const [practiceKey, setPracticeKey] = useState("C");
  const [practiceScale, setPracticeScale] = useState("major");

  useEffect(() => {
    if (!router.isReady || hydratedRef.current) return;
    hydratedRef.current = true;

    const saved = loadJamSession();
    if (saved?.key) setPracticeKey(normalizePracticeKey(saved.key));
    if (saved?.scale && isValidScaleId(saved.scale)) setPracticeScale(saved.scale);
    if (saved?.lastTab) setTabState(saved.lastTab);

    const q = router.query;
    if (typeof q.key === "string") setPracticeKey(normalizePracticeKey(q.key));
    if (typeof q.scale === "string" && isValidScaleId(q.scale)) setPracticeScale(q.scale);
    if (typeof q.root === "string" && typeof q.key !== "string") {
      const idx = parseInt(q.root, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < 12) {
        setPracticeKey(rootIndexToJamKey(idx));
      }
    }

    setTabState(tabFromQuery(q.tab, defaultTab));
  }, [router.isReady, router.query, defaultTab]);

  const persistStudio = useCallback(
    (patch: Partial<{ key: string; scale: string; lastTab: PracticeTab }>) => {
      const saved = loadJamSession();
      saveJamSession({
        key: patch.key ?? practiceKey,
        genre: saved?.genre ?? "rock",
        bpm: saved?.bpm ?? 100,
        preset: saved?.preset ?? 0,
        playbackSpeed: saved?.playbackSpeed ?? 1,
        loopLimit: saved?.loopLimit ?? 0,
        countIn: saved?.countIn ?? true,
        customChords: saved?.customChords,
        scale: patch.scale ?? practiceScale,
        lastTab: patch.lastTab ?? tab,
      });
    },
    [practiceKey, practiceScale, tab],
  );

  const syncUrl = useCallback(
    (next: { tab?: PracticeTab; key?: string; scale?: string }) => {
      const newTab = next.tab ?? tab;
      const newKey = next.key ?? practiceKey;
      const newScale = next.scale ?? practiceScale;
      const query = { ...router.query, tab: newTab, key: newKey, scale: newScale, root: String(jamKeyToRootIndex(newKey)) };
      router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    },
    [router, tab, practiceKey, practiceScale],
  );

  const setTab = (next: PracticeTab) => {
    setTabState(next);
    syncUrl({ tab: next });
    persistStudio({ lastTab: next });
  };

  const setKey = (key: string) => {
    const k = normalizePracticeKey(key);
    setPracticeKey(k);
    syncUrl({ key: k });
    persistStudio({ key: k });
  };

  const setScale = (scaleId: string) => {
    if (!isValidScaleId(scaleId)) return;
    setPracticeScale(scaleId);
    syncUrl({ scale: scaleId });
    persistStudio({ scale: scaleId });
  };

  const suggestScaleFromJam = (genre: Genre) => {
    const id = suggestedScaleForJam(genre, practiceKey);
    setScale(id);
    setTab("scales");
  };

  const scaleLabel = SCALES[practiceScale]?.name ?? "Major";

  const TabBar = (
    <div className="flex gap-1 bg-[#131313] rounded-2xl p-1 border border-white/5 max-w-md">
      {(
        [
          { id: "jam" as const, label: "Backing track", sub: "Jam & progressions" },
          { id: "scales" as const, label: "Scale fretboard", sub: "Patterns & pitch" },
        ] as const
      ).map(item => {
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className="flex-1 flex flex-col items-start px-4 py-3 rounded-xl transition-all text-left"
            style={{
              background: active ? "rgba(27,215,158,0.12)" : "transparent",
              border: active ? "1px solid rgba(27,215,158,0.35)" : "1px solid transparent",
            }}
          >
            <span className="font-Space-Grotesk font-bold text-[13px]" style={{ color: active ? "#1BD79E" : "white" }}>
              {item.label}
            </span>
            <span className="font-Inter text-[10px] text-[#52525b]">{item.sub}</span>
          </button>
        );
      })}
    </div>
  );

  const KeyScaleBar = (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
      <div className="flex flex-col gap-2 min-w-[100px]">
        <label className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">Practice key</label>
        <select
          value={practiceKey}
          onChange={e => setKey(e.target.value)}
          className="bg-[#131313] border border-white/5 text-white font-Space-Grotesk font-bold text-[16px] rounded-xl px-4 py-3 focus:outline-none appearance-none cursor-pointer"
        >
          {PRACTICE_KEYS.map(k => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
        <label className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[2px]">Scale (solo)</label>
        <select
          value={practiceScale}
          onChange={e => setScale(e.target.value)}
          className="bg-[#131313] border border-white/5 text-white font-Space-Grotesk font-bold text-[15px] rounded-xl px-4 py-3 focus:outline-none appearance-none cursor-pointer"
        >
          {Object.entries(SCALES).map(([id, s]) => (
            <option key={id} value={id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <p className="font-Manrope text-[12px] text-[#52525b] sm:max-w-xs sm:pb-1">
        One key for both tabs — jam the progression, then solo with{" "}
        <span className="text-[#38DBE5]">{practiceKey} {scaleLabel}</span> on the fretboard.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8 pt-4 pb-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="font-Inter text-[10px] text-[#1BD79E] uppercase tracking-[2px] mb-2">Practice studio</p>
          <h1 className="font-Space-Grotesk font-bold text-3xl lg:text-4xl text-white tracking-tight">
            Jam &amp; scales, same session
          </h1>
        </div>
        {TabBar}
      </div>

      <div className="bg-[#0b0b0b] rounded-2xl lg:rounded-3xl border border-[#1a1a1a] p-5 lg:p-6">{KeyScaleBar}</div>

      {tab === "jam" ? (
        <BackingTrackGenerator
          practiceKey={practiceKey}
          onPracticeKeyChange={setKey}
          practiceScaleId={practiceScale}
          onSuggestScale={genre => {
            if (VALID_GENRES.has(genre)) suggestScaleFromJam(genre);
          }}
          onOpenScales={() => setTab("scales")}
        />
      ) : (
        <ScaleFretboard
          practiceKey={practiceKey}
          onPracticeKeyChange={setKey}
          practiceScaleId={practiceScale}
          onPracticeScaleChange={setScale}
          onOpenJam={() => setTab("jam")}
        />
      )}
    </div>
  );
}
