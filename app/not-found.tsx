import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6">
      <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">404</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        We couldn&apos;t find that page.
      </h1>
      <p className="text-muted-foreground">
        The link may be broken, or the business may have moved.
      </p>
      <Link href="/" className="text-foreground underline-offset-4 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
