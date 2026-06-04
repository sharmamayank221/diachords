import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

interface LoginModalProps {
  onClose: () => void;
}

type View = "sign_in" | "check_email";

export default function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("sign_in");

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setView("check_email");
    }
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl p-7 z-10"
        style={{
          background: "rgba(16,16,16,0.98)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-[#555] hover:text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {view === "check_email" ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1BD79E]/10 border border-[#1BD79E]/20 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1BD79E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" />
              </svg>
            </div>
            <h2 className="font-Space-Grotesk font-bold text-white text-[22px] mb-2">Check your email</h2>
            <p className="font-Manrope text-[#adaaaa] text-[14px] leading-relaxed">
              We sent a magic link to <span className="text-[#1BD79E]">{email}</span>. Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => setView("sign_in")}
              className="mt-6 text-[#555] font-Inter text-[13px] hover:text-[#adaaaa] transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <p className="font-Inter text-[10px] text-[#3f3f46] tracking-[2px] uppercase mb-1">ACCOUNT</p>
              <h2 className="font-Space-Grotesk font-bold text-white text-[22px]">Sign in</h2>
              <p className="font-Manrope text-[#555] text-[13px] mt-1">Sign in or create your free account</p>
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/8 bg-[#1a1a1a] hover:bg-[#222] hover:border-white/15 transition-all mb-4 font-Manrope text-white text-[14px] font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#1a1a1a]" />
              <span className="font-Inter text-[11px] text-[#3f3f46] uppercase tracking-[1px]">or email</span>
              <div className="flex-1 h-px bg-[#1a1a1a]" />
            </div>

            {/* Magic link form */}
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#131313] border border-white/8 text-white placeholder-[#3f3f46] font-Manrope text-[14px] focus:outline-none focus:border-[#1BD79E]/50 focus:ring-1 focus:ring-[#1BD79E]/20 transition-all"
              />
              {error && (
                <p className="text-red-400 font-Inter text-[12px] px-1">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-xl font-Space-Grotesk font-bold text-[14px] text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: loading || !email.trim() ? "#1BD79E80" : "#1BD79E" }}
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>

            <p className="font-Inter text-[11px] text-[#3f3f46] text-center mt-4 leading-relaxed">
              By signing in you agree to our terms. No spam, ever.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
