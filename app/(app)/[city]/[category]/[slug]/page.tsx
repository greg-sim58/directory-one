type Params = Promise<{ city: string; category: string; slug: string }>;

export default async function BusinessProfilePage({ params }: { params: Params }) {
  const { city, category, slug } = await params;
  const businessName = slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-muted-foreground text-sm">
        {city} / {category}
      </p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">{businessName}</h1>
      <div className="text-muted-foreground mt-12 rounded-lg border border-dashed p-12 text-center text-sm">
        Business profile — Phase 6 wires NAPW, gallery, hours, reviews, and OneTapBar.
      </div>
    </article>
  );
}
