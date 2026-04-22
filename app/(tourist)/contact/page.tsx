import type { Metadata } from 'next';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the VZ Explorer team',
};

export default function ContactPage() {
  return (
    <div className="container px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-8 text-pretty">
        Have questions about planning your Venezuela trip? We&apos;re here to help.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="mailto:hello@vzexplorer.com"
              className="text-sm text-primary hover:underline"
            >
              hello@vzexplorer.com
            </a>
            <p className="text-xs text-muted-foreground mt-1">We respond within 24 hours</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="https://wa.me/message"
              className="text-sm text-primary hover:underline"
            >
              Send us a message
            </a>
            <p className="text-xs text-muted-foreground mt-1">Available Mon-Sat, 9am-6pm VET</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Based in Miami, FL with a team across Venezuela.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 rounded-xl bg-muted/50 border">
        <p className="text-sm text-muted-foreground text-pretty">
          <strong className="text-foreground">Tourism providers:</strong> Want to list your experience on VZ Explorer?{' '}
          <a href="/provider-register" className="text-primary hover:underline">Register as a provider</a>.
        </p>
      </div>
    </div>
  );
}
