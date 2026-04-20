import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for VZ Explorer',
};

export default function PrivacyPolicyPage() {
  return (
    <div
      className="min-h-screen py-16 px-4"
      style={{ background: '#0D1017', color: '#F0F4F8' }}
    >
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block text-sm mb-8 hover:opacity-80 transition-opacity"
          style={{ color: '#F0A500' }}
        >
          &larr; Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
        <p
          className="text-sm mb-8"
          style={{ color: 'rgba(240,244,248,0.5)' }}
        >
          Last updated: April 2026
        </p>
        <div
          className="rounded-2xl border p-8 text-center"
          style={{
            background: '#161C27',
            borderColor: 'rgba(240,244,248,0.1)',
            color: 'rgba(240,244,248,0.6)',
          }}
        >
          <p className="text-lg font-medium mb-2" style={{ color: '#F0F4F8' }}>
            Full policy coming soon
          </p>
          <p className="text-sm">
            We are finalising our privacy policy. In the meantime, please contact us at{' '}
            <a
              href="mailto:privacy@vz-explorer.com"
              className="hover:opacity-80"
              style={{ color: '#F0A500' }}
            >
              privacy@vz-explorer.com
            </a>{' '}
            with any questions about how we handle your personal data.
          </p>
        </div>
        <div className="mt-8 space-y-6 text-sm" style={{ color: 'rgba(240,244,248,0.7)' }}>
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#F0F4F8' }}>
              What data we collect
            </h2>
            <p>
              We collect information you provide when creating an account, making a booking, or using
              our AI itinerary planner. This includes your name, email address, travel preferences, and
              booking details.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#F0F4F8' }}>
              How we use your data
            </h2>
            <p>
              Your data is used to provide the VZ Explorer service, process bookings, send booking
              confirmations, and improve our platform. We do not sell personal data to third parties.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#F0F4F8' }}>
              Contact
            </h2>
            <p>
              For privacy-related requests, email{' '}
              <a href="mailto:privacy@vz-explorer.com" style={{ color: '#F0A500' }}>
                privacy@vz-explorer.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
