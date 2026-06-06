'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FacetCounts } from '@/lib/validation';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'A–Z' },
  { value: 'distance', label: 'Distance' },
] as const;

const PRICE_LABELS: Record<string, string> = { '1': '$', '2': '$$', '3': '$$$' };

const COMMON_AMENITIES = [
  'delivery',
  'wifi',
  'parking',
  'wheelchair_accessible',
  'accepts_cards',
  'outdoor_seating',
];

type Props = {
  initialSort: 'relevance' | 'newest' | 'name' | 'distance';
  initialPrice: string[];
  initialAmenities: string[];
  facets: FacetCounts;
  className?: string;
};

// URL is the source of truth: this component reads via useSearchParams
// and writes back with router.replace + startTransition (Vercel rule
// 5.13), so the RSC tree re-fetches and ResultsList re-renders.

export function FilterPanel({
  initialSort,
  initialPrice,
  initialAmenities,
  facets,
  className,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(sp.toString());
    mutate(params);
    params.delete('offset');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function togglePrice(p: string) {
    update((params) => {
      const current = parseList(params.get('price'));
      const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
      if (next.length > 0) params.set('price', next.join(','));
      else params.delete('price');
    });
  }

  function toggleAmenity(a: string) {
    update((params) => {
      const current = parseList(params.get('amenities'));
      const next = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
      if (next.length > 0) params.set('amenities', next.join(','));
      else params.delete('amenities');
    });
  }

  function setSort(s: string) {
    update((params) => {
      if (s === 'relevance') params.delete('sort');
      else params.set('sort', s);
    });
  }

  function clearAll() {
    update((params) => {
      params.delete('price');
      params.delete('amenities');
      params.delete('sort');
    });
  }

  const hasActive =
    initialPrice.length > 0 || initialAmenities.length > 0 || initialSort !== 'relevance';

  // Build a sorted amenity list: ones we have facet counts for first,
  // then the common ones we track but didn't get a count for.
  const amenityEntries = Object.entries(facets.amenities)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => ({ slug, count }));
  const known = new Set(amenityEntries.map((e) => e.slug));
  const extras = COMMON_AMENITIES.filter((a) => !known.has(a)).map((slug) => ({ slug, count: 0 }));

  return (
    <aside
      className={cn(
        'bg-card ring-foreground/10 flex flex-col gap-5 rounded-xl p-4 text-sm ring-1',
        className,
      )}
      data-pending={isPending || undefined}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filters
        </h2>
        {hasActive && (
          <Button type="button" variant="ghost" size="xs" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </header>

      <section className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Sort</h3>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const active = initialSort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                aria-pressed={active}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'border-foreground/30 bg-foreground text-background'
                    : 'border-border hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Price</h3>
        <div className="flex flex-wrap gap-1.5">
          {(['1', '2', '3'] as const).map((p) => {
            const active = initialPrice.includes(p);
            const count = facets.priceTier[p] ?? 0;
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePrice(p)}
                aria-pressed={active}
                disabled={count === 0 && !active}
                className={cn(
                  'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'border-foreground/30 bg-foreground text-background'
                    : 'border-border hover:bg-muted disabled:opacity-40',
                )}
              >
                {PRICE_LABELS[p]}
                <span className="text-muted-foreground tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Amenities
        </h3>
        <div className="flex flex-col gap-1">
          {[...amenityEntries, ...extras].map(({ slug, count }) => {
            const active = initialAmenities.includes(slug);
            return (
              <label
                key={slug}
                className="hover:bg-muted flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleAmenity(slug)}
                    className="accent-foreground size-3.5"
                  />
                  <span className="text-xs capitalize">{slug.replace(/_/g, ' ')}</span>
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {count}
                </Badge>
              </label>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

function parseList(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
