type Params = Promise<{ city: string; category: string }>;

export default async function CategoryPage({ params }: { params: Params }) {
  const { city, category } = await params;
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {categoryName} in {city}
      </h1>
      <div className="text-muted-foreground mt-12 rounded-lg border border-dashed p-12 text-center text-sm">
        Category page — Phase 4 wires Meilisearch results, FilterPanel, and split-view map.
      </div>
    </div>
  );
}
