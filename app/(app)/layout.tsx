import { LocationProvider } from '@/components/providers/LocationProvider';
import { SWRProvider } from '@/components/providers/SWRProvider';
import { MapSyncProvider } from '@/components/map/MapSyncProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRProvider>
      <LocationProvider>
        <MapSyncProvider>
          <div className="flex min-h-full flex-1 flex-col">
            <Header />
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-16 z-30 border-b backdrop-blur sm:hidden">
              <div className="flex items-center justify-end gap-1 px-4 py-2">
                <ThemeToggle />
              </div>
            </div>
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </MapSyncProvider>
      </LocationProvider>
    </SWRProvider>
  );
}
