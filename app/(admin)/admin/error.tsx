'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Admin Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h2>
        {error.message && (
          <p className="max-w-md text-sm text-muted-foreground">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={reset}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="rounded-lg px-4 py-2 text-sm font-medium bg-muted text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
