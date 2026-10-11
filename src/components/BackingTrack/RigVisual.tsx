/* eslint-disable @next/next/no-img-element -- TONE3000 tone photos are remote */
import React from "react";
import { T3KMark } from "./Tone3000Browser";
import type { RigSettings } from "@/jam/rig";
import type { UserTone } from "@/jam/userTones";

// Our own drawings of the rig (no real brand looks): pedals → amp head → cabinet.

type ToneInfo = Omit<UserTone, "data">;
type PedalKey = "compressor" | "drive" | "chorus" | "delay";

interface Look {
  tolex: string;
  panel: string;
  text: string;
  piping: string;
  label: string;
}

const LOOKS: Record<string, Omit<Look, "label">> = {
  clean: { tolex: "#e6d9b8", panel: "#c9c3b5", text: "#3b2f22", piping: "#8b6b45" },
  crunch: { tolex: "#5b2620", panel: "#c8a24a", text: "#2b1a0c", piping: "#e5c77d" },
  highgain: { tolex: "#141414", panel: "#b9bcc2", text: "#0b0b0b", piping: "#3a3a3a" },
  user: { tolex: "#1d2a44", panel: "#9fb4d6", text: "#0d1526", piping: "#4b6390" },
};

function ampLook(model: string, tones: ToneInfo[]): Look | null {
  if (model === "none") return null;
  if (model === "clean") return { ...LOOKS.clean, label: "CLEAN" };
  if (model === "nam:a2-crunch") return { ...LOOKS.crunch, label: "A2 CRUNCH" };
  if (model === "nam:obsidian") return { ...LOOKS.highgain, label: "OBSIDIAN" };
  const tone = tones.find((t) => `user:${t.id}` === model);
  const type = (tone?.meta?.type ?? "").toLowerCase();
  const base = type.includes("clean") ? LOOKS.clean : type.includes("hi") || type.includes("high") ? LOOKS.highgain : type.includes("crunch") || type.includes("overdrive") ? LOOKS.crunch : LOOKS.user;
  const name = (tone?.name ?? "Your model").toUpperCase();
  return { ...base, label: name.length > 16 ? `${name.slice(0, 15)}…` : name };
}

/** 0..1 → knob pointer angle */
const angle = (v: number) => -135 + Math.max(0, Math.min(1, v)) * 270;

function Knob({ x, y, r, v, fill = "#111", pointer = "#fff" }: { x: number; y: number; r: number; v: number; fill?: string; pointer?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle(v)})`} style={{ transition: "transform 150ms" }}>
      <circle r={r} fill={fill} stroke="#000" strokeOpacity={0.4} />
      <line y1={-r * 0.25} y2={-r * 0.9} stroke={pointer} strokeWidth={r * 0.22} strokeLinecap="round" />
    </g>
  );
}

function AmpHead({ look, s, loading }: { look: Look; s: RigSettings; loading: boolean }) {
  const knobs = [s.amp.gain, (s.amp.bass + 1) / 2, (s.amp.mid + 1) / 2, (s.amp.treble + 1) / 2, s.amp.master];
  return (
    <svg viewBox="0 0 220 96" className="w-full block" aria-hidden>
      <rect x="1" y="1" width="218" height="94" rx="10" fill={look.tolex} stroke={look.piping} strokeWidth="2" />
      {/* handle */}
      <rect x="85" y="-2" width="50" height="7" rx="3.5" fill="#0a0a0a" />
      {/* valve window */}
      <rect x="14" y="12" width="192" height="26" rx="4" fill="#0a0a0a" />
      {[26, 46, 174, 194].map((x, i) => (
        <g key={i} transform={`translate(${x} 25)`}>
          <rect x="-7" y="-10" width="14" height="20" rx="6" fill="#2a1a10" />
          <ellipse rx="4" ry="7" fill="#ff8a2b" opacity={loading ? 0.35 : 0.8}>
            {loading && <animate attributeName="opacity" values="0.15;0.9;0.15" dur="1.1s" begin={`${i * 0.18}s`} repeatCount="indefinite" />}
          </ellipse>
        </g>
      ))}
      <text x="110" y="28.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={look.label.length > 12 ? 7 : 9} fontWeight="800" letterSpacing="2" fill="#fff" opacity="0.9">
        {loading ? "WARMING UP…" : look.label}
      </text>
      {/* control panel */}
      <rect x="10" y="46" width="200" height="40" rx="5" fill={look.panel} />
      {knobs.map((v, i) => (
        <Knob key={i} x={36 + i * 30} y={63} r={8.5} v={v} />
      ))}
      {["GAIN", "BASS", "MID", "TREB", "MSTR"].map((l, i) => (
        <text key={l} x={36 + i * 30} y={82} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="5.5" fontWeight="700" fill={look.text}>
          {l}
        </text>
      ))}
      {/* pilot lamp */}
      <circle cx="194" cy="63" r="6" fill={loading ? "#4a1010" : "#ff3b30"} stroke="#000" strokeOpacity={0.5} />
      {!loading && <circle cx="194" cy="63" r="10" fill="#ff3b30" opacity="0.25" />}
    </svg>
  );
}

function Cabinet({ cab, look }: { cab: RigSettings["cab"]; look: Look }) {
  const isIr = cab.startsWith("user:");
  const kind = isIr ? "ir" : cab;
  const h = kind === "4x12" ? 200 : 116;
  const speakers: [number, number][] = kind === "4x12" ? [[63, 58], [157, 58], [63, 144], [157, 144]] : kind === "2x12" ? [[63, 58], [157, 58]] : [[110, 58]];
  return (
    <svg viewBox={`0 0 220 ${h}`} className="w-full block" aria-hidden>
      <defs>
        <pattern id="grille" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#1b1b1b" />
          <path d="M0 4L4 0" stroke="#2c2c2c" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="218" height={h - 2} rx="10" fill={look.tolex} stroke={look.piping} strokeWidth="2" />
      <rect x="10" y="10" width="200" height={h - 20} rx="6" fill="url(#grille)" />
      {speakers.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} opacity={0.75}>
          <circle r="38" fill="#141414" />
          <circle r="30" fill="#0e0e0e" stroke="#262626" />
          <circle r="11" fill="#1c1c1c" stroke="#333" />
        </g>
      ))}
      <text x="110" y={h - 15} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" letterSpacing="2" fill="#9ca3af">
        {isIr ? "IMPULSE RESPONSE" : kind.replace("x", "×")}
      </text>
    </svg>
  );
}

const PEDALS: { key: PedalKey; name: string; color: string; knobs: (s: RigSettings) => number[] }[] = [
  { key: "compressor", name: "COMP", color: "#2563eb", knobs: (s) => [s.compressor.amount] },
  { key: "drive", name: "DRIVE", color: "#16a34a", knobs: (s) => [s.drive.drive, s.drive.tone, s.drive.level] },
  { key: "chorus", name: "CHORUS", color: "#7c3aed", knobs: (s) => [s.chorus.depth, s.chorus.rate] },
  { key: "delay", name: "DELAY", color: "#9aa3ae", knobs: (s) => [s.delay.mix, s.delay.feedback] },
];

function Stompbox({ name, color, on, knobs, disabled, onClick }: { name: string; color: string; on: boolean; knobs: number[]; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={`${name.toLowerCase()} pedal ${on ? "on" : "off"}`}
      className={`w-[58px] sm:w-[66px] shrink-0 rounded-lg transition-[opacity,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E] disabled:cursor-not-allowed ${on && !disabled ? "" : "opacity-40 saturate-[.35]"}`}
    >
      <svg viewBox="0 0 66 100" className="w-full block" aria-hidden>
        <rect x="1" y="1" width="64" height="98" rx="7" fill={color} stroke="#000" strokeOpacity="0.35" />
        <circle cx="33" cy="10" r="3.2" fill={on && !disabled ? "#ff3b30" : "#3a0d0d"} />
        {on && !disabled && <circle cx="33" cy="10" r="6.5" fill="#ff3b30" opacity="0.35" />}
        {knobs.map((v, i) => (
          <Knob key={i} x={knobs.length === 1 ? 33 : knobs.length === 2 ? 20 + i * 26 : 14 + i * 19} y={27} r={knobs.length === 3 ? 6.5 : 8} v={v} />
        ))}
        <rect x="8" y="44" width="50" height="14" rx="2" fill="#000" opacity="0.18" />
        <text x="33" y="54" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="800" letterSpacing="1" fill="#fff">
          {name}
        </text>
        <circle cx="33" cy="80" r="11" fill="#c9ccd1" stroke="#6b7280" />
        <circle cx="33" cy="80" r="7" fill="#e5e7eb" />
      </svg>
    </button>
  );
}

/** Photo of a TONE3000 capture, with the credit their terms ask for. */
function GearPhoto({ tone, loading, compact }: { tone: ToneInfo; loading?: boolean; compact?: boolean }) {
  const t = tone.t3k!;
  return (
    <figure className="relative rounded-xl overflow-hidden border border-white/10 bg-[#111]">
      <img src={t.image!} alt={t.title} className={`w-full object-cover ${compact ? "h-24" : "h-36"} ${loading ? "opacity-40" : ""}`} />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2 font-Inter text-xs font-semibold text-white">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-[#ff8a2b] border-t-transparent animate-spin" /> Warming up…
        </span>
      )}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2.5 pt-6 pb-1.5 flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate font-Inter text-[11px] font-semibold text-white">{t.title}</span>
          <span className="block truncate font-Inter text-[10px] text-gray-300">by {t.creator}</span>
        </span>
        <T3KMark className="h-3 shrink-0" />
      </figcaption>
    </figure>
  );
}

interface Props {
  settings: RigSettings;
  userTones: ToneInfo[];
  loading: boolean;
  onTogglePedal: (key: PedalKey) => void;
}

export default function RigVisual({ settings: s, userTones, loading, onTogglePedal }: Props) {
  const acoustic = s.guitar === "acoustic";
  const look = acoustic ? null : ampLook(s.amp.model, userTones);
  const cabLook = look ?? { ...LOOKS.highgain, label: "" };
  const ampTone = userTones.find((t) => `user:${t.id}` === s.amp.model && t.t3k?.image);
  const cabTone = userTones.find((t) => `user:${t.id}` === s.cab && t.t3k?.image);
  return (
    <div className="rounded-xl bg-gradient-to-b from-[#1a1a1a] to-[#0b0b0b] border border-white/5 px-4 pt-4 pb-3 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-center gap-5 sm:gap-10 lg:gap-20">
        {/* pedalboard */}
        <div className="min-w-0">
          <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start rounded-lg bg-[#0a0a0a] p-2.5 border border-white/5 w-fit mx-auto sm:mx-0">
            {PEDALS.map((p) => (
              <Stompbox key={p.key} name={p.name} color={p.color} on={s[p.key].on} knobs={p.knobs(s)} disabled={acoustic && p.key === "drive"} onClick={() => onTogglePedal(p.key)} />
            ))}
          </div>
          <p className="mt-2 font-Inter text-[11px] text-gray-500 text-center sm:text-left">Tap a pedal to switch it on or off</p>
        </div>

        {/* amp + cab */}
        <div className="w-[190px] sm:w-[240px] mx-auto sm:mx-0 shrink-0" aria-live="polite">
          {look ? (
            <>
              {ampTone ? <GearPhoto tone={ampTone} loading={loading} /> : <AmpHead look={look} s={s} loading={loading} />}
              {s.cab !== "off" && <div className="mt-1">{cabTone ? <GearPhoto tone={cabTone} compact /> : <Cabinet cab={s.cab} look={cabLook} />}</div>}
            </>
          ) : (
            <div className="h-24 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-1 text-center px-3">
              <span className="font-Inter text-xs font-semibold text-gray-300">{acoustic ? "Acoustic guitar" : "No amp (DI)"}</span>
              <span className="font-Inter text-[11px] text-gray-500">{acoustic ? "Mic’d straight into the mix" : "Clean signal straight into the mix"}</span>
            </div>
          )}
          <p className="sr-only">{loading ? "Loading amp model" : look ? `Amp: ${look.label}. Cabinet: ${s.cab}` : ""}</p>
        </div>
      </div>
    </div>
  );
}
