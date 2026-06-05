import Link from 'next/link';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/db/schema';

type Props = {
  citySlug: string;
  categories: Category[];
  counts: Record<string, number>;
};

export function CategoryGrid({ citySlug, categories, counts }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.slug);
        const count = counts[cat.slug] ?? 0;
        return (
          <Link
            key={cat.slug}
            href={`/${citySlug}/${cat.slug}`}
            className="group bg-card hover:border-foreground/30 flex flex-col gap-3 rounded-lg border p-4 transition-colors"
          >
            <div className="bg-muted text-foreground group-hover:bg-foreground group-hover:text-background flex h-10 w-10 items-center justify-center rounded-md transition-colors">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-medium">{cat.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {count} {count === 1 ? 'business' : 'businesses'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
