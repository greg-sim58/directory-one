'use client';

// Phase 1: no SWR/query provider wired yet. Phase 4 (search) adds it
// for client-side cache hydration of Meilisearch results.

import { type ReactNode } from 'react';

export function SWRProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
