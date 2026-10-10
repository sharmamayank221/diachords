import React from "react";
import { useRouter } from "next/router";
import {
  CATEGORY_ORDER,
  searchChords,
  searchTools,
} from "@/helpers/chordSearch";

const EXAMPLES = ["Am", "G7", "F#m7", "Cmaj7", "D/F#"];
export const OPEN_SEARCH_EVENT = "chord-search:open";

export default function Searchbar() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const result = React.useMemo(() => searchChords(query), [query]);
  const tools = React.useMemo(() => searchTools(query), [query]);

  // Visual groups; flat order (used for keyboard nav) follows the rendered order
  const groups = React.useMemo(() => {
    if (result.mode !== "browse") return [{ title: null as string | null, items: result.items }];
    return CATEGORY_ORDER.map((cat) => ({
      title: cat as string | null,
      items: result.items.filter((i) => i.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [result]);
  // tools render first, so they come first in keyboard order too
  const flatItems = React.useMemo<{ href: string }[]>(
    () => [...tools, ...groups.flatMap((g) => g.items)],
    [tools, groups]
  );

  React.useEffect(() => setActiveIndex(0), [query]);

  // other parts of the page can open search with: window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))
  React.useEffect(() => {
    const open = () => {
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener(OPEN_SEARCH_EVENT, open);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, open);
  }, []);

  // "/" focuses the search from anywhere
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // keep the highlighted chip in view while arrowing through a long list
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const go = (item: { href: string }) => {
    setQuery("");
    close();
    if (router.asPath !== item.href) router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (query) setQuery("");
      else close();
      return;
    }
    if (!flatItems.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      if (e.key === "ArrowRight" && inputRef.current?.selectionStart !== query.length) return;
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      if (e.key === "ArrowLeft" && inputRef.current?.selectionStart !== query.length) return;
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flatItems[activeIndex] ?? flatItems[0]);
    }
  };

  const showPanel = open && query.trim().length > 0;
  const activeId = flatItems[activeIndex] ? `chord-opt-${activeIndex}` : undefined;
  let runningIndex = -1;

  return (
    <div className="h-full">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
          onMouseDown={close}
          aria-hidden
        />
      )}

      <form
        role="search"
        className="relative z-50 flex w-full"
        onSubmit={(e) => e.preventDefault()}
      >
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="chord-search-results"
          aria-activedescendant={showPanel ? activeId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          className={`h-[48px] md:h-[60px] w-full rounded-full border border-transparent bg-[#2D2D2D] pl-11 pr-10 md:pr-20 font-Lora text-base md:text-lg text-white placeholder:text-gray-500 outline-none transition-colors focus:border-[#1BD79E]/60 ${
            open ? "bg-[#1f1f1f]" : ""
          }`}
          placeholder="Search chords & tools"
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          ) : (
            <kbd className="hidden md:flex h-6 min-w-[24px] items-center justify-center rounded-md border border-[#444] px-1.5 font-Inter text-xs text-gray-500">
              /
            </kbd>
          )}
        </div>

        {showPanel && (
          <div
            id="chord-search-results"
            ref={listRef}
            role="listbox"
            aria-label="Search results"
            className="fixed inset-x-4 top-20 md:absolute md:inset-x-0 md:top-full mt-3 max-h-[70vh] overflow-y-auto rounded-[20px] border border-[#333] bg-[#1a1a1a] p-4 md:p-5 shadow-2xl shadow-black/60"
          >
            {result.mode === "none" && tools.length === 0 ? (
              <div className="py-6 text-center">
                <p className="font-Lora text-white text-lg">
                  No chord matches &ldquo;{query.trim()}&rdquo;
                </p>
                <p className="mt-2 font-Inter text-sm text-gray-500">Start with a root note, like</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setQuery(ex);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-[#333] px-3 py-1 font-Lora text-sm text-gray-300 hover:border-[#1BD79E] hover:text-white"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {tools.length > 0 && (
                  <div className={result.mode === "none" ? "" : "mb-5"}>
                    <p className="mb-2 font-Inter text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tools</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tools.map((tool) => {
                        runningIndex += 1;
                        const index = runningIndex;
                        const isActive = index === activeIndex;
                        return (
                          <button
                            key={tool.href}
                            id={`chord-opt-${index}`}
                            data-index={index}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => go(tool)}
                            className={`rounded-xl px-4 py-2.5 text-left transition-colors ${
                              isActive ? "bg-[#1BD79E] text-black" : "bg-[#262626] text-white hover:bg-[#303030]"
                            }`}
                          >
                            <span className="block font-Lora text-[15px]">{tool.display}</span>
                            <span className={`block font-Inter text-xs ${isActive ? "text-black/70" : "text-gray-400"}`}>
                              {tool.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {result.mode !== "none" && (
                <p className="mb-3 font-Inter text-xs uppercase tracking-wider text-gray-500">
                  {result.mode === "browse"
                    ? `Chords in ${result.rootLabel} · ${result.items.length}`
                    : `${result.items.length} chord match${result.items.length === 1 ? "" : "es"}`}
                </p>
                )}
                <div className="flex flex-col gap-4">
                  {groups.map((group) => (
                    <div key={group.title ?? "matches"}>
                      {group.title && (
                        <p className="mb-2 font-Inter text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          {group.title}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item) => {
                          runningIndex += 1;
                          const index = runningIndex;
                          const isActive = index === activeIndex;
                          return (
                            <button
                              key={item.href}
                              id={`chord-opt-${index}`}
                              data-index={index}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              title={item.fullName}
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => go(item)}
                              className={`rounded-full px-3.5 py-1.5 font-Lora text-[15px] transition-colors ${
                                isActive
                                  ? "bg-[#1BD79E] text-black"
                                  : "bg-[#262626] text-white hover:bg-[#303030]"
                              }`}
                            >
                              {item.display}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 hidden md:block font-Inter text-[11px] text-gray-600">
                  ↑↓ to move · Enter to open · Esc to close
                </p>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
