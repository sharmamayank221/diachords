import React, { useEffect, useState } from "react";
import Link from "next/link";
import SEO from "@/components/SEO";
import LoginModal from "@/components/Auth/LoginModal";
import { useDeleteAccount } from "@/components/Auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { IS_NATIVE_APP, openExternal } from "@/lib/native";

const TOOLS = [
  { href: "/metronome", label: "Metronome", hint: "Tempo trainer, odd meters, tap tempo" },
  { href: "/ear-training", label: "Ear training", hint: "Recognise chords and intervals by ear" },
  { href: "/chord-recognition", label: "Chord detect", hint: "Play a chord, see its name" },
  { href: "/scales", label: "Scale explorer", hint: "Patterns, intervals and pitch practice" },
  { href: "/search", label: "Search", hint: "Find any chord, scale or tool" },
];

const ABOUT = [
  { href: "/support", label: "Help & support" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
];

function Row({ href, label, hint, onClick }: { href?: string; label: string; hint?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex-1 min-w-0">
        <span className="block font-Inter text-[15px] text-white">{label}</span>
        {hint && <span className="block font-Inter text-xs text-gray-500 mt-0.5">{hint}</span>}
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600" aria-hidden>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3.5 active:bg-white/5 text-left w-full";
  return href ? (
    <Link href={href} className={cls}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{body}</button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="px-4 mb-2 font-Inter text-[11px] uppercase tracking-[1.5px] text-gray-500">{title}</h2>
      <div className="rounded-2xl bg-[#111] border border-white/5 divide-y divide-white/5 overflow-hidden">{children}</div>
    </section>
  );
}

export default function MorePage() {
  const { user, signOut } = useAuth();
  const { deleting, deleteAccount } = useDeleteAccount();
  const [loginOpen, setLoginOpen] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!IS_NATIVE_APP) return;
    import("@capacitor/app")
      .then(({ App }) => App.getInfo())
      .then((info) => setVersion(`${info.version} (${info.build})`))
      .catch(() => {});
  }, []);

  return (
    <>
      <SEO title="More tools" description="Metronome, ear training, chord detection, your library and settings." canonical="/more" noIndex />
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10">
        <h1 className="font-Space-Grotesk font-bold text-3xl text-white mb-6 px-1">More</h1>

        {IS_NATIVE_APP && (
          <Group title="Library">
            <Row href="/library" label="My library" hint="Saved chords sync with iCloud across your devices" />
          </Group>
        )}

        {isSupabaseConfigured && (
          <Group title="Account">
            {user ? (
              <>
                <div className="px-4 py-3.5">
                  <p className="font-Inter text-xs text-gray-500">Signed in as</p>
                  <p className="font-Inter text-[15px] text-white truncate">{user.email ?? "Apple ID"}</p>
                </div>
                <Row href="/library" label="My library" hint="Your saved chords" />
                <Row label="Sign out" onClick={() => signOut()} />
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="w-full px-4 py-3.5 text-left font-Inter text-[15px] text-red-400 active:bg-white/5 disabled:opacity-50"
                >
                  {deleting ? "Deleting account…" : "Delete account"}
                </button>
              </>
            ) : (
              <Row label="Sign in" hint="Save chords to your library and sync across devices" onClick={() => setLoginOpen(true)} />
            )}
          </Group>
        )}

        <Group title="Tools">
          {TOOLS.map((t) => (
            <Row key={t.href} {...t} />
          ))}
        </Group>

        <Group title="About">
          {ABOUT.map((a) => (
            <Row key={a.href} {...a} />
          ))}
          <Row label="Contact us" hint="chordsofguitar@gmail.com" onClick={() => openExternal("mailto:chordsofguitar@gmail.com")} />
        </Group>

        <p className="text-center font-Inter text-xs text-gray-600">
          ChordsofGuitar{version ? ` · v${version}` : ""}
        </p>
      </div>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  );
}
