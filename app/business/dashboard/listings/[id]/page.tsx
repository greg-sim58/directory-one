type Params = Promise<{ id: string }>;

export default async function DashboardListingPage({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Edit listing</h1>
      <p className="text-muted-foreground mt-2 text-sm">ID: {id}</p>
      <div className="text-muted-foreground mt-12 rounded-lg border border-dashed p-12 text-center text-sm">
        Edit form — Phase 8 wires the owner edit flow.
      </div>
    </div>
  );
}
