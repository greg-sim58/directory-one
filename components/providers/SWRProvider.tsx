'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';

// Per Vercel rule 4.3: SWR provides automatic deduping, focus
// throttling, and revalidation. We hoist a single fetcher at the
// provider level so every <useSWR> call shares it.

const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const err = new Error(`SWR fetch failed: ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // 1 minute in-app dedupe so repeated identical keys (e.g. the
        // search hits + facet counts) coalesce.
        dedupingInterval: 60_000,
        // Don't revalidate on every focus event during dev.
        focusThrottleInterval: 5 * 60_000,
        // Keep the previous data visible while the next fetch runs.
        keepPreviousData: true,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
