import React, { useRef, useState } from "react";
import { AmpModel, BUILTIN_NAM, CabType, DelayTime, RIG_PRESETS, RigSettings } from "@/jam/rig";
import type { UserTone } from "@/jam/userTones";

type ToneInfo = Omit<UserTone, "data">;

interface Props {
  settings: RigSettings;
  presetId: string | null;
  onPreset: (id: string) => void;
  onChange: (next: RigSettings) => void;
  userTones: ToneInfo[];
  onAddFiles: (files: FileList) => Promise<void>;
  onRemoveTone: (id: string) => void;
  status: string | null; // loading / error message from the amp engine
}

const chip = (active: boolean) =>
  `h-8 px-3 rounded-full font-Inter text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E] ${
    active ? "bg-[#1BD79E] text-black font-semibold" : "bg-[#161616] text-gray-300 hover:bg-[#222]"
  }`;

function Knob({ label, value, onChange, min = 0, max = 1, disabled }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={`flex flex-col gap-1 min-w-0 ${disabled ? "opacity-40" : ""}`}>
      <span className="flex justify-between font-Inter text-[11px] text-gray-400">
        {label}
        <span className="tabular-nums text-gray-500">{min < 0 ? `${value > 0 ? "+" : ""}${Math.round(value * 10)}` : Math.round(value * 10)}</span>
      </span>
      <input
        type="range"
        min={min * 100}
        max={max * 100}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={label}
        className="metronome-range w-full"
        style={{ background: `linear-gradient(to right, #1BD79E ${pct}%, #262626 ${pct}%)` }}
      />
    </label>
  );
}

function Pedal({ name, on, onToggle, children, disabled }: { name: string; on: boolean; onToggle: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 flex flex-col gap-2.5 transition-colors ${on && !disabled ? "border-[#1BD79E]/50 bg-[#1BD79E]/[0.06]" : "border-white/5 bg-[#141414]"} ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-Inter text-sm font-semibold text-white">{name}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${name} ${on ? "on" : "off"}`}
          disabled={disabled}
          onClick={onToggle}
          className={`h-7 w-7 rounded-full border-2 transition-colors ${on ? "border-[#1BD79E] bg-[#1BD79E] shadow-[0_0_10px_#1BD79E]" : "border-[#444] bg-black"}`}
        />
      </div>
      {children}
    </div>
  );
}

export default function GuitarRigPanel({ settings: s, presetId, onPreset, onChange, userTones, onAddFiles, onRemoveTone, status }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const acoustic = s.guitar === "acoustic";
  const set = <K extends keyof RigSettings>(k: K, v: RigSettings[K]) => onChange({ ...s, [k]: v });
  const namTones = userTones.filter((t) => t.kind === "nam");
  const irTones = userTones.filter((t) => t.kind === "ir");

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setAdding(true);
    setAddError(null);
    try {
      await onAddFiles(files);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Couldn’t add that file.");
    } finally {
      setAdding(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className="rounded-2xl bg-[#0f0f0f] border border-white/5 p-5 flex flex-col gap-5" aria-label="Guitar rig">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-Inter text-xs font-semibold uppercase tracking-wider text-gray-400">Guitar rig</h3>
        {status && <p className="font-Inter text-xs text-[#f59e0b]" role="status">{status}</p>}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Rig presets">
        {Object.entries(RIG_PRESETS).map(([id, p]) => (
          <button key={id} type="button" onClick={() => onPreset(id)} aria-pressed={presetId === id} className={chip(presetId === id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="font-Inter text-sm text-gray-300 w-16">Guitar</span>
        {(["acoustic", "electric"] as const).map((g) => (
          <button key={g} type="button" onClick={() => set("guitar", g)} aria-pressed={s.guitar === g} className={chip(s.guitar === g)}>
            {g === "acoustic" ? "Acoustic" : "Electric"}
          </button>
        ))}
      </div>

      {/* pedalboard */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        <Pedal name="Compressor" on={s.compressor.on} onToggle={() => set("compressor", { ...s.compressor, on: !s.compressor.on })}>
          <Knob label="Squash" value={s.compressor.amount} onChange={(v) => set("compressor", { ...s.compressor, amount: v })} />
        </Pedal>
        <Pedal name="Overdrive" on={s.drive.on} disabled={acoustic} onToggle={() => set("drive", { ...s.drive, on: !s.drive.on })}>
          <Knob label="Drive" value={s.drive.drive} onChange={(v) => set("drive", { ...s.drive, drive: v })} disabled={acoustic} />
          <Knob label="Tone" value={s.drive.tone} onChange={(v) => set("drive", { ...s.drive, tone: v })} disabled={acoustic} />
          <Knob label="Level" value={s.drive.level} onChange={(v) => set("drive", { ...s.drive, level: v })} disabled={acoustic} />
        </Pedal>
        <Pedal name="Chorus" on={s.chorus.on} onToggle={() => set("chorus", { ...s.chorus, on: !s.chorus.on })}>
          <Knob label="Depth" value={s.chorus.depth} onChange={(v) => set("chorus", { ...s.chorus, depth: v })} />
          <Knob label="Rate" value={s.chorus.rate} onChange={(v) => set("chorus", { ...s.chorus, rate: v })} />
        </Pedal>
        <Pedal name="Delay" on={s.delay.on} onToggle={() => set("delay", { ...s.delay, on: !s.delay.on })}>
          <div className="flex gap-1">
            {(["1/4", "1/8.", "1/8"] as DelayTime[]).map((t) => (
              <button key={t} type="button" onClick={() => set("delay", { ...s.delay, time: t })} aria-pressed={s.delay.time === t} className={`flex-1 h-7 rounded-full font-Inter text-xs ${s.delay.time === t ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"}`}>
                {t}
              </button>
            ))}
          </div>
          <Knob label="Mix" value={s.delay.mix} onChange={(v) => set("delay", { ...s.delay, mix: v })} />
          <Knob label="Repeats" value={s.delay.feedback} onChange={(v) => set("delay", { ...s.delay, feedback: v })} />
        </Pedal>
      </div>

      {/* amp + cab */}
      <div className={`grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 ${acoustic ? "opacity-50" : ""}`}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-Inter text-sm text-gray-300">Amp</span>
            <select
              value={s.amp.model}
              disabled={acoustic}
              onChange={(e) => set("amp", { ...s.amp, model: e.target.value as AmpModel })}
              className="h-10 rounded-xl bg-[#161616] border border-white/10 px-3 font-Inter text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            >
              <option value="none">No amp (DI)</option>
              <option value="clean">Clean · built-in</option>
              {Object.entries(BUILTIN_NAM).map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label}
                </option>
              ))}
              {namTones.length > 0 && (
                <optgroup label="Your NAM models">
                  {namTones.map((t) => (
                    <option key={t.id} value={`user:${t.id}`}>
                      {t.name}
                      {t.meta?.gear === "pedal" ? " (pedal)" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <div className="grid grid-cols-5 gap-2">
            <Knob label="Gain" value={s.amp.gain} onChange={(v) => set("amp", { ...s.amp, gain: v })} disabled={acoustic || s.amp.model === "none"} />
            <Knob label="Bass" value={s.amp.bass} min={-1} onChange={(v) => set("amp", { ...s.amp, bass: v })} disabled={acoustic} />
            <Knob label="Mid" value={s.amp.mid} min={-1} onChange={(v) => set("amp", { ...s.amp, mid: v })} disabled={acoustic} />
            <Knob label="Treble" value={s.amp.treble} min={-1} onChange={(v) => set("amp", { ...s.amp, treble: v })} disabled={acoustic} />
            <Knob label="Master" value={s.amp.master} onChange={(v) => set("amp", { ...s.amp, master: v })} disabled={acoustic || s.amp.model === "none"} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-Inter text-sm text-gray-300">Cabinet</span>
            <select
              value={s.cab}
              disabled={acoustic}
              onChange={(e) => set("cab", e.target.value as CabType)}
              className="h-10 rounded-xl bg-[#161616] border border-white/10 px-3 font-Inter text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
            >
              <option value="off">No cabinet</option>
              <option value="1x12">1×12 open back</option>
              <option value="2x12">2×12 combo</option>
              <option value="4x12">4×12 closed back</option>
              {irTones.length > 0 && (
                <optgroup label="Your impulse responses">
                  {irTones.map((t) => (
                    <option key={t.id} value={`user:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <Knob label="Room reverb" value={s.reverb} onChange={(v) => set("reverb", v)} />
        </div>
      </div>

      {/* your own tones */}
      <div className="rounded-xl border border-dashed border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-Inter text-sm font-semibold text-white">Your tones</p>
            <p className="font-Inter text-xs text-gray-500 mt-0.5">
              Load any Neural Amp Modeler <b>.nam</b> amp or pedal (A1 or A2) or a cabinet <b>.wav</b> IR. Thousands are free on{" "}
              <a href="https://www.tone3000.com" target="_blank" rel="noreferrer" className="text-[#1BD79E] hover:underline">
                TONE3000
              </a>
              . Files stay in this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={adding}
            className="h-9 px-4 rounded-full border border-[#1BD79E]/50 text-[#1BD79E] font-Inter text-sm font-semibold hover:bg-[#1BD79E]/10 disabled:opacity-50"
          >
            {adding ? "Adding…" : "+ Load .nam or IR"}
          </button>
          <input ref={fileRef} type="file" accept=".nam,.wav,.aif,.aiff,.flac" multiple hidden onChange={(e) => pickFiles(e.target.files)} />
        </div>
        {addError && (
          <p role="alert" className="mt-2 font-Inter text-xs text-[#f59e0b]">
            {addError}
          </p>
        )}
        {userTones.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {userTones.map((t) => (
              <li key={t.id} className="inline-flex items-center gap-2 h-8 pl-3 pr-1 rounded-full bg-[#161616] font-Inter text-xs text-gray-200">
                <span className="text-gray-500 uppercase">{t.kind === "nam" ? (t.meta?.architecture === "SlimmableContainer" ? "A2" : "NAM") : "IR"}</span>
                {t.name}
                <button type="button" onClick={() => onRemoveTone(t.id)} aria-label={`Remove ${t.name}`} className="h-6 w-6 rounded-full text-gray-500 hover:text-white hover:bg-white/10">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
