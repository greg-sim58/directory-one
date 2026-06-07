import Link from 'next/link';
import { ArrowRight, MapPin, Search, Star, Verified } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getAllCities, getAllCategories } from '@/lib/db/queries';
import { getCategoryIcon } from '@/lib/category-icons';

// Marketing home reads from the DB at request time. Force-dynamic so the
// build doesn't try to prerender without DATABASE_URL.
export const dynamic = 'force-dynamic';

export default async function MarketingHome() {
  const [cities, categories] = await Promise.all([getAllCities(), getAllCategories()]);

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="grid items-end gap-8 lg:grid-cols-[3fr_2fr] lg:gap-16">
            <div className="space-y-6">
              <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
                Local · Trusted · Editorial
              </p>
              <h1 className="font-display max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
                Find the local services worth your time.
              </h1>
              <p className="text-muted-foreground max-w-xl text-lg leading-relaxed sm:text-xl">
                A modern directory for the city you live in. Verified reviews, rich profiles, and
                one-tap connections to the businesses that keep your life running.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {cities.slice(0, 1).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Browse {c.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
                <Link
                  href="/business/claim/sample"
                  className="border-border bg-background hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  Claim your business
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="bg-muted/30 relative aspect-[4/5] overflow-hidden rounded-lg">
                <div className="absolute inset-0 grid place-items-center p-8">
                  <div className="space-y-6 text-center">
                    <div className="font-display text-[8rem] leading-none font-semibold tracking-tighter">
                      01
                    </div>
                    <div className="space-y-1">
                      <p className="font-display text-xl font-medium">Discover</p>
                      <p className="text-muted-foreground text-sm">
                        What&apos;s nearby, what&apos;s open, what&apos;s good.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-border/40 bg-muted/30 border-y">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-muted-foreground mb-10 text-sm font-medium tracking-widest uppercase">
              How it works
            </p>
            <ol className="grid gap-12 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Search or browse',
                  body: 'Filter by category, distance, price, and open hours. The map and list stay in sync.',
                  icon: Search,
                },
                {
                  step: '02',
                  title: 'Read real reviews',
                  body: 'Verified ratings with owner responses. No bots, no pay-to-play, no spam.',
                  icon: Star,
                },
                {
                  step: '03',
                  title: 'Connect in one tap',
                  body: 'Call, get directions, share, or save. No forms, no friction, no phone trees.',
                  icon: Verified,
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.step} className="space-y-3">
                    <div className="flex items-baseline gap-3">
                      <span className="text-muted-foreground font-display text-2xl font-semibold tabular-nums">
                        {s.step}
                      </span>
                      <Icon className="text-muted-foreground h-4 w-4" />
                    </div>
                    <h3 className="font-display text-xl font-semibold tracking-tight">{s.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Categories strip */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-muted-foreground mb-2 text-sm font-medium tracking-widest uppercase">
                  What you&apos;ll find
                </p>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Every category, curated.
                </h2>
              </div>
              {cities[0] && (
                <Link
                  href={`/${cities[0].slug}`}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
                >
                  See all in {cities[0].name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.slug);
                const href = cities[0] ? `/${cities[0].slug}/${cat.slug}` : `/${cat.slug}`;
                return (
                  <Link
                    key={cat.slug}
                    href={href}
                    className="group bg-card hover:border-foreground/30 flex flex-col gap-3 rounded-lg border p-4 transition-colors"
                  >
                    <div className="bg-muted text-foreground group-hover:bg-foreground group-hover:text-background flex h-10 w-10 items-center justify-center rounded-md transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-foreground font-medium">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
