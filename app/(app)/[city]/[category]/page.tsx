import type { Metadata } from 'next';
import { Suspense } from 'react';

import { getCategoryBySlug, getCityBySlug, countBusinesses } from '@/lib/db/queries';
import { searchBusinesses } from '@/lib/search/queries';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterPanel } from '@/components/search/FilterPanel';
import { ResultsList } from '@/components/search/ResultsList';
import {
  FilterPanelSkeleton,
  MapRegionSkeleton,
  ResultsListSkeleton,
} from '@/components/search/skeletons';
import { MapClient } from '@/components/map/MapClient';
import type { LngLatBounds } from '@/lib/map/bounds';

type Params = Promise<{ city: string; category: string }>;
type SearchParams = Promise<{
  q?: string;
  price?: string;
  amenities?: string;
  sort?: string;
  near?: string;
}>;

// The category page reads the DB (counts) and the search layer
// (results). force-dynamic so the build doesn't try to prerender
// without a DB.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { city, category } = await params;
  const sp = await searchParams;
  const [cityRow, categoryRow] = await Promise.all([
    getCityBySlug(city),
    getCategoryBySlug(category),
  ]);
  if (!cityRow || !categoryRow) return { title: 'Not found' };
  const q = (sp.q ?? '').trim();
  const title = q
    ? `${q} — ${categoryRow.name} in ${cityRow.name}`
    : `${categoryRow.name} in ${cityRow.name}`;
  return {
    title,
    description: `Browse ${categoryRow.name.toLowerCase()} in ${cityRow.name}. Search, filter, and find trusted local services.`,
  };
}

function parseList(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const SORT_VALUES = ['relevance', 'newest', 'name', 'distance'] as const;
type Sort = (typeof SORT_VALUES)[number];
const isSort = (s: string | undefined): s is Sort =>
  !!s && (SORT_VALUES as readonly string[]).includes(s);

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { city, category } = await params;
  const sp = await searchParams;

  // Validate the route slugs before we render anything; if either is
  // missing, hand off to not-found.
  const [cityRow, categoryRow, total] = await Promise.all([
    getCityBySlug(city),
    getCategoryBySlug(category),
    countBusinesses(city, category),
  ]);

  if (!cityRow || !categoryRow) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We couldn’t find that city or category.
        </p>
      </div>
    );
  }

  const initialQ = sp.q ?? '';
  const initialPrice = parseList(sp.price);
  const initialAmenities = parseList(sp.amenities);
  const initialSort: Sort = isSort(sp.sort) ? sp.sort : 'relevance';

  const cityBounds: LngLatBounds | undefined = cityRow.bbox
    ? [
        [cityRow.bbox.minLon, cityRow.bbox.minLat],
        [cityRow.bbox.maxLon, cityRow.bbox.maxLat],
      ]
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {categoryRow.name} in {cityRow.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {total} {total === 1 ? 'business' : 'businesses'} listed
        </p>
      </header>

      <div className="mt-4 max-w-xl">
        <SearchBar initialQ={initialQ} placeholder={`Search ${categoryRow.name.toLowerCase()}…`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={<FilterPanelSkeleton />}>
            <FilterPanelRegion
              citySlug={city}
              categorySlug={category}
              sp={sp}
              initialPrice={initialPrice}
              initialAmenities={initialAmenities}
              initialSort={initialSort}
            />
          </Suspense>
        </aside>

        <div className="flex flex-col gap-4">
          <Suspense fallback={<ResultsListSkeleton />}>
            <ResultsRegion citySlug={city} categorySlug={category} sp={sp} />
          </Suspense>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)]">
          <Suspense fallback={<MapRegionSkeleton className="h-72 xl:h-[calc(100vh-8rem)]" />}>
            <MapRegion
              citySlug={city}
              categorySlug={category}
              sp={sp}
              fallbackBounds={cityBounds}
              className="h-72 xl:h-[calc(100vh-8rem)]"
            />
          </Suspense>
        </div>
      </div>

      <div className="mt-6 lg:hidden">
        <Suspense fallback={<MapRegionSkeleton className="h-72" />}>
          <MapRegion
            citySlug={city}
            categorySlug={category}
            sp={sp}
            fallbackBounds={cityBounds}
            className="h-72"
          />
        </Suspense>
      </div>
    </div>
  );
}

// ----- async server regions -----

async function FilterPanelRegion({
  citySlug,
  categorySlug,
  sp,
  initialPrice,
  initialAmenities,
  initialSort,
}: {
  citySlug: string;
  categorySlug: string;
  sp: Awaited<SearchParams>;
  initialPrice: string[];
  initialAmenities: string[];
  initialSort: Sort;
}) {
  const data = await searchBusinesses({ ...sp, city: citySlug, category: categorySlug });
  return (
    <FilterPanel
      initialSort={initialSort}
      initialPrice={initialPrice}
      initialAmenities={initialAmenities}
      facets={data.facets}
    />
  );
}

async function ResultsRegion({
  citySlug,
  categorySlug,
  sp,
}: {
  citySlug: string;
  categorySlug: string;
  sp: Awaited<SearchParams>;
}) {
  const data = await searchBusinesses({ ...sp, city: citySlug, category: categorySlug });
  return (
    <ResultsList
      citySlug={citySlug}
      categorySlug={categorySlug}
      hits={data.hits}
      total={data.total}
    />
  );
}

async function MapRegion({
  citySlug,
  categorySlug,
  sp,
  fallbackBounds,
  className,
}: {
  citySlug: string;
  categorySlug: string;
  sp: Awaited<SearchParams>;
  fallbackBounds?: LngLatBounds;
  className?: string;
}) {
  // Same React.cache-deduped call as ResultsRegion — one DB roundtrip
  // per request serves both regions.
  const data = await searchBusinesses({ ...sp, city: citySlug, category: categorySlug });
  return (
    <MapClient
      hits={data.hits}
      citySlug={citySlug}
      categorySlug={categorySlug}
      fallbackBounds={fallbackBounds}
      className={className}
    />
  );
}
