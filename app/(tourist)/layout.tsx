import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { MyTripFab } from '@/components/itinerary/MyTripFab';

export default function TouristLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <MyTripFab />
    </>
  );
}
