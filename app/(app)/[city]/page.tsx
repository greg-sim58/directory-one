import { notFound } from 'next/navigation';
import { Search } from 'lucide-react';
import { getAllCategories, getCategoryCountsByCity, getFeaturedBusinesses } from '@/lib/db/queries';
import { CategoryGrid } from '@/components/business/CategoryGrid';

type Params = Promise<{ city: string }>;

// City home reads counts + featured from the DB at request time. Force-dynamic
// so the build doesn't try to prerender without DATABASE_URL.
export const dynamic = 'force-dynamic';

export default async function CityHomePage({ params }: { params: Params }) {
  const { city } = await params;

  const [categories, counts, featured] = await Promise.all([
    getAllCategories(),
    getCategoryCountsByCity(city),
    getFeaturedBusinesses(city, 6),
  ]);

  if (categories.length === 0) {
    notFound();
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const topCategory = featured[0]?.categorySlug ?? categories[0]!.slug;
  const topCategoryName =
    categories.find((c) => c.slug === topCategory)?.name ?? categories[0]!.name;
  const topCategoryFeatured = featured.filter((b) => b.categorySlug === topCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <section className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
            {totalCount} local businesses
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight capitalize sm:text-7xl">
            {prettyCitySlug(city)}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
            Discover trusted local services, read verified reviews, and one-tap connect with the
            businesses that keep your life running.
          </p>
          <form
            action={`/${city}`}
            method="get"
            className="bg-card flex max-w-md items-center gap-2 rounded-lg border px-3 py-2"
            suppressHydrationWarning
          >
            <Search className="text-muted-foreground h-4 w-4" />
            <input
              type="search"
              name="q"
              placeholder="Search plumbers, restaurants, dentists…"
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
              suppressHydrationWarning
            />
          </form>
          <p className="text-muted-foreground text-xs">
            Tip: press <kbd className="bg-muted rounded px-1.5 py-0.5">/</kbd> to focus search
            (coming soon).
          </p>
        </div>
        <div className="bg-muted/30 relative hidden overflow-hidden rounded-lg lg:block">
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                Featured this week
              </p>
              <p className="font-display text-2xl font-medium">{topCategoryName}</p>
              <p className="text-muted-foreground text-sm">
                {topCategoryFeatured.length} new listings
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Browse by category</h2>
          <p className="text-muted-foreground text-sm">{categories.length} categories</p>
        </div>
        <CategoryGrid citySlug={city} categories={categories} counts={counts} />
      </section>
    </div>
  );
}

function prettyCitySlug(slug: string): string {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
