import Link from 'next/link';
import { headers } from 'next/headers';
import { getAllCities } from '@/lib/db/queries';
import { readDisplayLocation, readResolvedLocation } from '@/lib/location';
import { LocationPicker } from '@/components/layout/LocationPicker';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export async function Header() {
  const [headerStore, cities, location, display] = await Promise.all([
    headers(),
    getAllCities(),
    readResolvedLocation(),
    readDisplayLocation(),
  ]);
  // The URL is forwarded by the proxy for downstream consumers; we just
  // touch it so this layout reads consistently with city-page reads.
  void headerStore.get('x-current-path');

  const label = display.source === 'geo' ? display.displayName : location.cityName;
  const isGeoLabel = display.source === 'geo';

  return (
    <header className="border-border/40 bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-foreground font-display text-xl font-semibold tracking-tight"
        >
          Directory
        </Link>
        <nav className="text-muted-foreground hidden flex-1 items-center gap-6 text-sm md:flex">
          {cities.slice(0, 3).map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LocationPicker
            currentCityName={location.cityName}
            currentCitySlug={location.citySlug}
            displayName={label}
            isGeoLabel={isGeoLabel}
            cities={cities.map((c) => ({ slug: c.slug, name: c.name, state: c.state }))}
          />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
