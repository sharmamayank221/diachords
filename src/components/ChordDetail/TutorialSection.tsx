import React, { useEffect, useState } from "react";
import type { YoutubeTutorialResult } from "@/pages/api/youtube-tutorial";

interface Props {
  chordKey:   string; // e.g. "C"
  chordSuffix: string; // e.g. "major"
}

function PlayIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="rgba(27,215,158,0.15)" />
      <circle cx="24" cy="24" r="18" fill="rgba(27,215,158,0.25)" stroke="#1BD79E" strokeWidth="1.5" />
      <polygon points="20,16 34,24 20,32" fill="#1BD79E" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
      <rect width="20" height="14" rx="3" fill="#FF0000" />
      <polygon points="8,4 14,7 8,10" fill="white" />
    </svg>
  );
}

export default function TutorialSection({ chordKey, chordSuffix }: Props) {
  const [data, setData]       = useState<YoutubeTutorialResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  const chordName = `${chordKey} ${chordSuffix}`.trim();
  const chordSlug = `${chordKey}${chordSuffix}`.toLowerCase().replace(/\s+/g, "");

  useEffect(() => {
    setLoading(true);
    setPlaying(false);
    setData(null);
    fetch(`/api/youtube-tutorial?chord=${encodeURIComponent(chordName)}`)
      .then(r => r.json())
      .then((d: YoutubeTutorialResult) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [chordName]);

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to play ${chordName} guitar chord`)}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <YoutubeIcon />
          <h3 className="font-Space-Grotesk font-bold text-white text-[16px]">
            Video Tutorial
          </h3>
        </div>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-Inter text-[11px] text-[#52525b] hover:text-[#1BD79E] transition-colors"
        >
          More on YouTube →
        </a>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="w-full aspect-video rounded-2xl bg-[#111] border border-[#1a1a1a] animate-pulse" />
      )}

      {/* Video found — show thumbnail then embed on click */}
      {!loading && data?.videoId && !playing && (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full group rounded-2xl overflow-hidden border border-[#1a1a1a] hover:border-[#1BD79E]/30 transition-all"
          style={{ aspectRatio: "16/9" }}
          aria-label={`Play tutorial: ${data.title}`}
        >
          {/* Thumbnail */}
          {data.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.thumbnail}
              alt={data.title ?? "Tutorial thumbnail"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#111] flex items-center justify-center">
              <YoutubeIcon />
            </div>
          )}

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all" />

          {/* Play button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="transform group-hover:scale-110 transition-transform drop-shadow-lg">
              <PlayIcon />
            </div>
            {data.title && (
              <p className="font-Manrope font-semibold text-white text-[13px] text-center max-w-[80%] drop-shadow leading-tight line-clamp-2">
                {data.title}
              </p>
            )}
          </div>

          {/* Bottom bar: channel + duration */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between"
            style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
            {data.channel && (
              <span className="font-Inter text-[11px] text-gray-300">{data.channel}</span>
            )}
            {data.duration && (
              <span className="font-Inter text-[11px] text-gray-300 bg-black/50 px-2 py-0.5 rounded">
                {data.duration}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Playing — embed the video */}
      {!loading && data?.videoId && playing && (
        <div className="w-full rounded-2xl overflow-hidden border border-[#1BD79E]/20"
          style={{ aspectRatio: "16/9" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${data.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={data.title ?? `${chordName} tutorial`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {/* Fallback: no API key or no result */}
      {!loading && !data?.videoId && (
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 w-full rounded-2xl border border-[#1a1a1a] bg-[#0b0b0b] px-5 py-4 hover:border-[#1BD79E]/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#131313] border border-[#222] flex items-center justify-center flex-shrink-0 group-hover:border-[#1BD79E]/30 transition-all">
            <YoutubeIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-Space-Grotesk font-bold text-white text-[14px]">
              How to play {chordName}
            </p>
            <p className="font-Manrope text-[12px] text-[#52525b] mt-0.5">
              Search guitar tutorials on YouTube
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      )}

      {/* Pro tip */}
      <p className="font-Inter text-[10px] text-[#3f3f46] leading-relaxed">
        💡 Watch at 0.5× speed to catch the finger placement frame-by-frame.
      </p>
    </div>
  );
}
