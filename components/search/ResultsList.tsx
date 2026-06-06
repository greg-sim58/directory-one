import { ResultCard } from './ResultCard';
import type { BusinessDoc } from '@/lib/validation';

type Props = {
  citySlug: string;
  categorySlug: string;
  hits: BusinessDoc[];
  total: number;
};

// RSC list. The parent page already called searchBusinesses() and
// passed the DTO hits down. No DB queries here.

export function ResultsList({ citySlug, categorySlug, hits, total }: Props) {
  if (total === 0) {
    return (
      <div className="bg-card ring-foreground/10 rounded-xl p-8 text-center text-sm ring-1">
        <p className="text-foreground font-medium">No results</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Try clearing filters or broadening the search.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {hits.map((b) => (
        <li key={b.id}>
          <ResultCard citySlug={citySlug} categorySlug={categorySlug} business={b} />
        </li>
      ))}
    </ul>
  );
}
