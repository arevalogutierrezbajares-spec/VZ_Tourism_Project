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
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: '#FEE2E2' }}
        >
          <AlertTriangle className="h-6 w-6" style={{ color: '#DC2626' }} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Something went wrong
        </h2>
        {error.message && (
          <p className="max-w-md text-sm text-gray-500">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={reset}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ background: '#3B82F6' }}
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ background: '#F3F4F6' }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
