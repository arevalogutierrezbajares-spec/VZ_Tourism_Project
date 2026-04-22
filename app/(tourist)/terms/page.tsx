import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'VZ Explorer terms of service and conditions of use',
};

export default function TermsPage() {
  return (
    <div className="container px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-base">Last updated: April 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
        <p>By accessing or using VZ Explorer, you agree to be bound by these Terms of Service. If you do not agree, you may not use our services.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">2. Service Description</h2>
        <p>VZ Explorer is an AI-powered travel planning platform that connects travelers with tourism experiences across Venezuela. We facilitate bookings between travelers and local providers.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">3. User Accounts</h2>
        <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating an account and keep it up to date.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">4. Bookings and Payments</h2>
        <p>All bookings are subject to availability and provider confirmation. Cancellation policies vary by provider and will be communicated before booking confirmation.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">5. Limitation of Liability</h2>
        <p>VZ Explorer acts as a platform connecting travelers with providers. We are not responsible for the quality, safety, or legality of experiences offered by third-party providers.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">6. Travel Advisories</h2>
        <p>Users are responsible for reviewing current travel advisories for Venezuela. VZ Explorer provides safety information for guidance purposes only and does not guarantee traveler safety.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">7. Contact</h2>
        <p>For questions about these terms, contact us at <a href="mailto:legal@vzexplorer.com" className="text-primary hover:underline">legal@vzexplorer.com</a>.</p>
      </div>
    </div>
  );
}
