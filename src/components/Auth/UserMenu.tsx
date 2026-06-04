import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  const emailLabel = user?.email
    ? user.email.length > 22 ? user.email.slice(0, 22) + "…" : user.email
    : "";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded-full bg-[#1BD79E]/10 border border-[#1BD79E]/30 hover:bg-[#1BD79E]/20 transition-all"
        title={user?.email}
      >
        <div className="w-6 h-6 rounded-full bg-[#1BD79E]/20 flex items-center justify-center flex-shrink-0">
          <span className="font-Space-Grotesk font-bold text-[#1BD79E] text-[10px]">{initials}</span>
        </div>
        <span className="font-Manrope text-[13px] text-[#1BD79E] font-medium pr-1">{emailLabel}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-52 rounded-2xl z-50 overflow-hidden"
          style={{
            background: "rgba(16,16,16,0.98)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          }}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <p className="font-Inter text-[10px] text-[#3f3f46] uppercase tracking-[1.5px]">Signed in as</p>
            <p className="font-Manrope text-white text-[13px] font-medium mt-0.5 truncate">{user?.email}</p>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={async () => { setOpen(false); await signOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-red-400 transition-colors">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="font-Manrope text-[#adaaaa] text-[13px] group-hover:text-red-400 transition-colors">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
