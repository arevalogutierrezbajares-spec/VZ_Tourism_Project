import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-4"
      style={{ background: '#0D1017', color: '#F0F4F8' }}
    >
      <p
        className="text-8xl font-bold mb-6"
        style={{ color: '#F0A500', lineHeight: 1 }}
      >
        404
      </p>
      <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
      <p
        className="text-base max-w-sm mb-8"
        style={{ color: 'rgba(240,244,248,0.6)' }}
      >
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/explore"
        className="inline-block px-6 py-3 rounded-xl font-medium text-sm transition-opacity hover:opacity-80"
        style={{ background: '#F0A500', color: '#0D1017' }}
      >
        Explore Venezuela
      </Link>
    </div>
  );
}
