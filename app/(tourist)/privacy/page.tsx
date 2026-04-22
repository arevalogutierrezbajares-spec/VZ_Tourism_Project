import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'VZ Explorer privacy policy and data handling practices',
};

export default function PrivacyPage() {
  return (
    <div className="container px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-base">Last updated: April 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">1. Information We Collect</h2>
        <p>We collect information you provide directly when creating an account, making bookings, or contacting us. This includes your name, email address, phone number, and travel preferences.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">2. How We Use Your Information</h2>
        <p>We use your information to provide and improve our travel planning services, process bookings, communicate with you about your trips, and personalize your experience.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">3. Data Sharing</h2>
        <p>We share your information with tourism providers only when you make a booking. We do not sell your personal data to third parties.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">4. Data Security</h2>
        <p>We implement industry-standard security measures to protect your personal information. All data is encrypted in transit and at rest.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">5. Your Rights</h2>
        <p>You can access, update, or delete your personal information at any time through your account settings. You may also contact us to request data export or account deletion.</p>

        <h2 className="text-lg font-semibold text-foreground mt-8">6. Contact</h2>
        <p>For privacy-related inquiries, please contact us at <a href="mailto:privacy@vzexplorer.com" className="text-primary hover:underline">privacy@vzexplorer.com</a>.</p>
      </div>
    </div>
  );
}
