import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
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

  
  return (
    <div className="relative" ref={ref}>
      {/* avatar only: the email lives in the menu, so the header keeps room for search */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Account menu for ${user?.email ?? "you"}`}
        aria-expanded={open}
        title={user?.email}
        className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-[#1BD79E]/15 border border-[#1BD79E]/40 hover:bg-[#1BD79E]/25 transition-colors focus-visible:ring-2 focus-visible:ring-[#1BD79E]"
      >
        <span className="font-Inter font-bold text-[#1BD79E] text-xs">{initials}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-56 rounded-2xl z-50 overflow-hidden"
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
            <Link
              href="/library"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left font-Manrope text-[#adaaaa] text-[13px] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.4 3.3 5 6.8 5c2 0 3.5 1.1 4.2 2.4h2C13.7 6.1 15.2 5 17.2 5c3.5 0 5.6 3.4 4.3 6.6C19.5 16.4 12 21 12 21z" />
              </svg>
              My library
            </Link>
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
