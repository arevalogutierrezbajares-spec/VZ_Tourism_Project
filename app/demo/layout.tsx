import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Demo for Posada Owners',
  description:
    'See how VZ Explorer connects international travelers with Venezuelan posadas. Browse experiences, curated itineraries, safety zones, and more.',
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
