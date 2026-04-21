export default function ListingLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6 space-y-2">
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-md bg-muted" />
          <div className="h-6 w-16 rounded-md bg-muted" />
        </div>
        <div className="h-8 w-2/3 rounded-md bg-muted" />
        <div className="h-4 w-48 rounded-md bg-muted" />
      </div>

      {/* Gallery skeleton */}
      <div className="mb-8 grid grid-cols-2 gap-2">
        <div className="aspect-square rounded-2xl bg-muted row-span-2" />
        <div className="grid grid-rows-2 gap-2">
          <div className="aspect-square rounded-2xl bg-muted" />
          <div className="aspect-square rounded-2xl bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-6 w-48 rounded-md bg-muted" />
            <div className="h-4 w-full rounded-md bg-muted" />
            <div className="h-4 w-5/6 rounded-md bg-muted" />
            <div className="h-4 w-4/5 rounded-md bg-muted" />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-4">
          <div className="h-96 rounded-2xl bg-muted border" />
          <div className="h-12 rounded-lg bg-muted" />
          <div className="h-48 rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
