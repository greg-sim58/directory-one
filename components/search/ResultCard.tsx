'use client';

import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';

import { categoryIconMap, WrenchFallback } from '@/lib/category-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMapSync } from '@/components/map/MapSyncProvider';
import { cn } from '@/lib/utils';
import type { BusinessDoc } from '@/lib/validation';

const PRICE_LABEL: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$' };

type Props = {
  citySlug: string;
  categorySlug: string;
  business: BusinessDoc;
};

// Client Component (was RSC): Phase 5 wires list ↔ map pin
// highlight sync via the MapSyncProvider Context. The card sets
// `selectedId` on hover/focus and reads it back to apply a ring.
// The whole card stays a single navigable target — the inner
// <button> for map sync would have created a nested-focus problem.

export function ResultCard({ citySlug, categorySlug, business }: Props) {
  const href = `/${citySlug}/${categorySlug}/${business.slug}`;
  // Pulled from the static map (module-level) so the lint rule that
  // bans component creation during render is satisfied; the fallback
  // ensures we never render an undefined component.
  const Icon = categoryIconMap[categorySlug] ?? WrenchFallback;
  const { selectedId, setSelectedId } = useMapSync();
  const isSelected = selectedId === business.id;

  return (
    <Card
      size="sm"
      data-selected={isSelected || undefined}
      className={cn(
        'transition-colors',
        isSelected
          ? 'ring-foreground/40 border-foreground/30 ring-2'
          : 'hover:border-foreground/30',
      )}
    >
      <Link
        href={href}
        onMouseEnter={() => setSelectedId(business.id)}
        onMouseLeave={() => setSelectedId(null)}
        onFocus={() => setSelectedId(business.id)}
        onBlur={() => setSelectedId(null)}
        aria-current={isSelected ? 'true' : undefined}
        className="flex flex-col gap-2 px-3 py-2.5"
      >
        <CardContent className="flex flex-col gap-2 p-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-foreground line-clamp-1 font-medium">{business.name}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              {business.priceTier ? (
                <Badge variant="outline" className="text-[10px]">
                  {PRICE_LABEL[business.priceTier]}
                </Badge>
              ) : null}
              <Icon className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
          {business.description ? (
            <p className="text-muted-foreground line-clamp-2 text-xs">{business.description}</p>
          ) : null}
          <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <MapPin className="h-3 w-3" aria-hidden />
            <span className="truncate">{business.address}</span>
            <ArrowUpRight className="ml-auto h-3 w-3 shrink-0" aria-hidden />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
