import { DemoNav } from './_components/DemoNav';
import { DemoHero } from './_components/DemoHero';
import { HowItWorks } from './_components/HowItWorks';
import { PlatformDemo } from './_components/PlatformDemo';
import { SafetySection } from './_components/SafetySection';
import { BookingCategories } from './_components/BookingCategories';
import { CreatorProgram } from './_components/CreatorProgram';
import { PosadaOwners } from './_components/PosadaOwners';
import { SocialProof } from './_components/SocialProof';
import { MobileTeaser } from './_components/MobileTeaser';
import { FinalCTA } from './_components/FinalCTA';
import { DemoFooter } from './_components/DemoFooter';

export default function DemoPage() {
  return (
    <main className="min-h-svh">
      <DemoNav />
      <DemoHero />
      <HowItWorks />
      <PlatformDemo />
      <SafetySection />
      <BookingCategories />
      <CreatorProgram />
      <PosadaOwners />
      <SocialProof />
      <MobileTeaser />
      <FinalCTA />
      <DemoFooter />
    </main>
  );
}
