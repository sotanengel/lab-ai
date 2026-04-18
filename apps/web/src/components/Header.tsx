"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/experiments/new", label: "取込", icon: "📥" },
  { href: "/compare", label: "比較", icon: "⚖️" },
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
  { href: "/context", label: "コンテキスト", icon: "📚" },
] as const;

export function Header() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[var(--background)]/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-base tracking-tight group"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-bold shadow-sm shadow-indigo-500/20">
            AI
          </span>
          <span className="text-white/90 group-hover:text-white transition-colors">Lab AI</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "text-white bg-white/[0.08]"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
              >
                <span className="hidden md:inline mr-1.5">{link.icon}</span>
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--accent)] translate-y-[9px]" />
                )}
              </Link>
            );
          })}
          <div className="ml-3 hidden md:flex">
            <span
              aria-hidden
              className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/30 font-mono"
              title="⌘K でコマンドパレット"
            >
              ⌘K
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}
