import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { MobileTabBar } from '@/components/common/MobileTabBar';
import { MyTripFab } from '@/components/itinerary/MyTripFab';

export default function TouristLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer className="hidden md:block" />
      <MobileTabBar />
      <MyTripFab />
    </>
  );
}
