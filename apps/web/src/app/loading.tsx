export default function RootLoading() {
  return (
    <div className="px-6 py-10 max-w-6xl mx-auto w-full space-y-6 relative z-10">
      {/* Header skeleton */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-72 rounded-lg bg-white/[0.03] animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-white/[0.06] animate-pulse" />
      </div>

      {/* Card skeletons */}
      <div className="mt-8 space-y-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5 flex items-center gap-4"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="w-4 h-4 rounded bg-white/[0.06] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-white/[0.03] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
