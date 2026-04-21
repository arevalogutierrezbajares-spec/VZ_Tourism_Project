export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded-lg" />
          <div className="h-4 w-32 bg-muted/60 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-muted rounded-lg" />
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-background rounded-xl p-4 border">
            <div className="h-9 w-9 bg-muted/60 rounded-lg mb-3" />
            <div className="h-6 w-16 bg-muted rounded mb-1" />
            <div className="h-3 w-20 bg-muted/60 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-background rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="w-10 h-10 bg-muted/60 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted/60 rounded" />
              </div>
              <div className="h-5 w-16 bg-muted/60 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
