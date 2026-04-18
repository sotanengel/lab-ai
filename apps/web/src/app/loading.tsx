export default function RootLoading() {
  return (
    <div className="px-6 py-10 max-w-6xl mx-auto w-full space-y-4">
      <div className="h-8 w-1/3 rounded-md bg-white/10 animate-pulse" />
      <div className="h-4 w-2/3 rounded-md bg-white/5 animate-pulse" />
      <div className="mt-6 space-y-2">
        <div className="h-16 rounded-md bg-white/5 animate-pulse" />
        <div className="h-16 rounded-md bg-white/5 animate-pulse" />
        <div className="h-16 rounded-md bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}
