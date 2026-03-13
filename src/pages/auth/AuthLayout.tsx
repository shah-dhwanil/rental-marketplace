import type { ReactNode } from "react";
import { Link } from "react-router";

interface AuthLayoutProps {
  children: ReactNode;
  /** Right-panel feature highlights. Falls back to a default set. */
  highlights?: { icon: string; title: string; desc: string }[];
}

const DEFAULT_HIGHLIGHTS = [
  {
    icon: "📷",
    title: "Rent Premium Gear",
    desc: "Access top-tier electronics without the hefty price tag.",
  },
  {
    icon: "🔒",
    title: "100% Secure",
    desc: "Every transaction protected with bank-grade encryption.",
  },
  {
    icon: "🚀",
    title: "Same-Day Delivery",
    desc: "Get your rental delivered within hours in select cities.",
  },
  {
    icon: "✨",
    title: "Hassle-Free Returns",
    desc: "Schedule a pickup — we handle the rest.",
  },
];

export function AuthLayout({ children, highlights }: AuthLayoutProps) {
  const items = highlights ?? DEFAULT_HIGHLIGHTS;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* ── Left panel: form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 lg:px-12">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1 font-bold text-2xl text-primary dark:text-purple-400 tracking-tighter mb-10"
        >
          <span className="text-3xl">R</span>ental
          <span className="text-purple-600 dark:text-purple-500">Mkt</span>
          <span className="h-2 w-2 bg-amber-400 rounded-full mt-3 ml-0.5" />
        </Link>

        {/* Card */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          {children}
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center max-w-xs">
          By continuing you agree to our{" "}
          <span className="underline cursor-pointer hover:text-primary">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="underline cursor-pointer hover:text-primary">
            Privacy Policy
          </span>
          .
        </p>
      </div>

      {/* ── Right panel: promo (hidden on mobile) ───────────────────────── */}
      <div className="hidden lg:flex w-[420px] xl:w-[500px] bg-gradient-to-br from-primary via-purple-700 to-violet-900 text-white flex-col justify-center px-12 py-16 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute bottom-10 -left-16 w-48 h-48 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Rent Electronics
            <br />
            <span className="text-amber-300">Smarter & Cheaper</span>
          </h2>
          <p className="text-white/70 text-sm mb-10">
            Join over 50,000 happy customers who rent instead of buying.
          </p>

          <div className="space-y-5">
            {items.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="text-2xl bg-white/10 rounded-xl w-11 h-11 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-4 text-xs text-white/50">
            <span>⭐⭐⭐⭐⭐</span>
            <span>&ldquo;Best rental platform in India!&rdquo; — TrustPilot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
