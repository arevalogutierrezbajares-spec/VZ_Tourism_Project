import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for VZ Explorer',
};

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
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
            Full terms coming soon
          </p>
          <p className="text-sm">
            We are finalising our terms of service. Please contact us at{' '}
            <a
              href="mailto:legal@vz-explorer.com"
              className="hover:opacity-80"
              style={{ color: '#F0A500' }}
            >
              legal@vz-explorer.com
            </a>{' '}
            with any questions.
          </p>
        </div>
        <div className="mt-8 space-y-6 text-sm" style={{ color: 'rgba(240,244,248,0.7)' }}>
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#F0F4F8' }}>
              Use of the platform
            </h2>
            <p>
              VZ Explorer provides a marketplace connecting travellers with tourism providers in
              Venezuela. By using our platform, you agree to use it lawfully and in accordance with
              our guidelines.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#F0F4F8' }}>
              Bookings and payments
            </h2>
            <p>
              Bookings are confirmed once payment is processed. Cancellation policies vary by provider.
              VZ Explorer charges a service fee on each booking as disclosed at checkout.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#F0F4F8' }}>
              Liability
            </h2>
            <p>
              VZ Explorer is a marketplace platform. Providers are responsible for delivering the
              services listed. Please review individual listing details and cancellation policies before
              booking.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: '#F0F4F8' }}>
              Contact
            </h2>
            <p>
              For legal enquiries, email{' '}
              <a href="mailto:legal@vz-explorer.com" style={{ color: '#F0A500' }}>
                legal@vz-explorer.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
