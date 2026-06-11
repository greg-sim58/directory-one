import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCityBySlug } from '@/lib/db/queries';
import { searchBusinesses } from '@/lib/search/queries';
import { SearchBar } from '@/components/search/SearchBar';
import { ResultCard } from '@/components/search/ResultCard';

type Params = Promise<{ city: string }>;
type SearchParams = Promise<{
  q?: string;
  price?: string;
  amenities?: string;
  sort?: string;
}>;

// City-level free-text search across all categories. Reads the search layer
// (no `category` filter). force-dynamic so the build doesn't try to
// prerender without a DB.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { city } = await params;
  const sp = await searchParams;
  const cityRow = await getCityBySlug(city);
  if (!cityRow) return { title: 'Not found' };
  const q = (sp.q ?? '').trim();
  const title = q ? `${q} in ${cityRow.name}` : `Search ${cityRow.name}`;
  return {
    title,
    description: `Search local services in ${cityRow.name}. Find trusted businesses across every category.`,
  };
}

export default async function CitySearchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { city } = await params;
  const sp = await searchParams;

  const cityRow = await getCityBySlug(city);
  if (!cityRow) notFound();

  const initialQ = sp.q ?? '';
  const data = await searchBusinesses({ ...sp, city });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {initialQ.trim() ? (
            <>
              Results for “{initialQ.trim()}” in {cityRow.name}
            </>
          ) : (
            <>Search {cityRow.name}</>
          )}
        </h1>
        <p className="text-muted-foreground text-sm">
          {data.total} {data.total === 1 ? 'business' : 'businesses'} found
        </p>
      </header>

      <div className="mt-4 max-w-xl">
        <SearchBar initialQ={initialQ} placeholder={`Search ${cityRow.name}…`} />
      </div>

      <div className="mt-6">
        {data.total === 0 ? (
          <div className="bg-card ring-foreground/10 rounded-xl p-8 text-center text-sm ring-1">
            <p className="text-foreground font-medium">No results</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Try a different search term or browse by category.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.hits.map((b) => (
              <li key={b.id}>
                <ResultCard citySlug={city} categorySlug={b.categorySlug} business={b} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
