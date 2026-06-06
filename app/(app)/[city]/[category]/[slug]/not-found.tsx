import Link from 'next/link';

type Params = Promise<{ city: string; category: string; slug: string }>;

export default async function BusinessProfileNotFound({ params }: { params: Params }) {
  const { city, category } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Business not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        We couldn’t find that business. It may have been removed, or the link might be wrong.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href={`/${city}/${category}`}
          className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium"
        >
          Back to {category}
        </Link>
        <Link
          href={`/${city}`}
          className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium"
        >
          Back to {city}
        </Link>
      </div>
    </div>
  );
}
