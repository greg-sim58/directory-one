type Params = Promise<{ token: string }>;

export default async function ClaimPage({ params }: { params: Params }) {
  const { token } = await params;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Claim your business</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Token: <code className="bg-muted rounded px-1.5 py-0.5">{token}</code>
      </p>
      <div className="text-muted-foreground mt-12 rounded-lg border border-dashed p-8 text-center text-sm">
        Claim portal — Phase 8 wires the auth + claim flow.
      </div>
    </div>
  );
}
