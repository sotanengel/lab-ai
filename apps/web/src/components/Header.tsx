import Link from "next/link";

const links = [
  { href: "/", label: "ホーム" },
  { href: "/experiments/new", label: "取込" },
  { href: "/compare", label: "比較" },
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/context", label: "コンテキスト" },
] as const;

export function Header() {
  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-wide">
          Lab AI
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="opacity-80 hover:opacity-100">
              {link.label}
            </Link>
          ))}
          <span
            aria-hidden
            className="hidden md:inline-flex items-center rounded-md border border-white/10 px-2 py-0.5 text-[10px] opacity-60"
            title="⌘K でコマンドパレット"
          >
            ⌘K
          </span>
        </nav>
      </div>
    </header>
  );
}
