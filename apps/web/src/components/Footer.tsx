export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-black/20">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-[8px] font-bold">
            AI
          </span>
          <span>Lab AI</span>
        </div>
        <p>Researcher Experiment Analysis Platform</p>
        <div className="flex items-center gap-4">
          <a href="/" className="hover:text-white/60 transition-colors">
            ホーム
          </a>
          <a href="/experiments/new" className="hover:text-white/60 transition-colors">
            取込
          </a>
          <a href="/dashboard" className="hover:text-white/60 transition-colors">
            ダッシュボード
          </a>
        </div>
      </div>
    </footer>
  );
}
