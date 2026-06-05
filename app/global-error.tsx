'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-full">
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Something went wrong.
          </h1>
          <p className="text-muted-foreground">We&apos;ve been notified. Please try again.</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
            >
              Retry
            </button>
            <Link href="/" className="text-foreground underline-offset-4 hover:underline">
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
