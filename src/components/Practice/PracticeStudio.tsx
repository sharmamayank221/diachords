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
import { STYLE_BY_ID } from "@/jam/styles";
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

  const suggestScaleFromJam = (style: string, mode: "major" | "minor") => {
    const id = suggestedScaleForJam(style, practiceKey, mode);
    setScale(id);
    setTab("scales");
  };

  const scaleLabel = SCALES[practiceScale]?.name ?? "Major";

  const TabBar = (
    <div className="flex rounded-full bg-[#131313] p-1 border border-white/5" role="group" aria-label="Practice view">
      {(
        [
          { id: "jam" as const, label: "Jam & solo" },
          { id: "scales" as const, label: "Scales only" },
        ] as const
      ).map(item => {
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={active}
            className={`h-10 px-4 rounded-full font-Inter text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
              active ? "bg-[#1BD79E] text-black font-semibold" : "text-gray-300 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const selectClass =
    "h-11 bg-[#161616] border border-white/10 text-white font-Lora text-lg rounded-xl px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E] cursor-pointer";
  const KeyScaleBar = (
    <div className="flex items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="font-Inter text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Key</span>
        <select value={practiceKey} onChange={e => setKey(e.target.value)} className={`${selectClass} w-[84px]`}>
          {PRACTICE_KEYS.map(k => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 min-w-0 flex-1 sm:flex-none">
        <span className="font-Inter text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Scale</span>
        <select value={practiceScale} onChange={e => setScale(e.target.value)} className={`${selectClass} w-full sm:w-[220px]`}>
          {Object.entries(SCALES).map(([id, s]) => (
            <option key={id} value={id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4 md:px-6 pt-6 pb-12 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="font-Inter text-xs font-semibold text-[#1BD79E] uppercase tracking-wider mb-2">Practice studio</p>
          <h1 className="font-Lora text-3xl lg:text-4xl text-white">
            {tab === "scales" ? "Guitar scale explorer" : "Jam & solo"}
          </h1>
          <p className="font-Inter text-sm text-gray-400 mt-1">
            {tab === "scales"
              ? "See every scale on the neck, hear it, and check your playing by ear."
              : `A real band plays in ${practiceKey}. Solo over it with ${practiceKey} ${scaleLabel} right below.`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          {KeyScaleBar}
          {TabBar}
        </div>
      </div>

      {tab === "jam" ? (
        <BackingTrackGenerator
          practiceKey={practiceKey}
          onPracticeKeyChange={setKey}
          practiceScaleId={practiceScale}
          onSuggestScale={(style, mode) => {
            if (STYLE_BY_ID[style]) suggestScaleFromJam(style, mode);
          }}
          onOpenScales={() => setTab("scales")}
          renderSolo={chord => (
            <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-4 md:p-5" aria-label="Solo scale">
              <ScaleFretboard compact currentChord={chord} practiceKey={practiceKey} practiceScaleId={practiceScale} onPracticeScaleChange={setScale} />
            </section>
          )}
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
