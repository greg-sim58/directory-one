import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Business, Category } from '@/lib/db/schema';

type Props = {
  citySlug: string;
  categorySlug: string;
  businesses: Business[];
  category: Category | undefined;
};

export function FeaturedBusinesses({ citySlug, categorySlug, businesses, category }: Props) {
  if (businesses.length === 0) return null;
  const Icon = getCategoryIcon(categorySlug);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {category?.name ?? 'Featured'}
        </h2>
        <Link
          href={`/${citySlug}/${categorySlug}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          See all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((b) => (
          <li key={b.id}>
            <Link
              href={`/${citySlug}/${categorySlug}/${b.slug}`}
              className="bg-card hover:border-foreground/30 flex flex-col gap-2 rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-foreground line-clamp-1 font-medium">{b.name}</span>
                <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {b.description}
              </p>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{b.address}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
