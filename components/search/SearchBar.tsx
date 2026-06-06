'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 250;

type Props = {
  initialQ?: string;
  placeholder?: string;
  className?: string;
};

// Per PLAN.md §6: client-side debounced search, writes `?q=` to the URL
// via router.replace inside startTransition (Vercel rule 5.13) so the
// page re-renders with new server-side hits without blocking the input.

export function SearchBar({ initialQ = '', placeholder, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(initialQ);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror the input back to local state if the URL changes from another
  // component (e.g. FilterPanel reset) so the two never drift.
  const lastCommittedRef = useRef(initialQ);

  useEffect(() => {
    if (initialQ !== lastCommittedRef.current) {
      setValue(initialQ);
      lastCommittedRef.current = initialQ;
    }
  }, [initialQ]);

  function commit(next: string) {
    if (next === lastCommittedRef.current) return;
    lastCommittedRef.current = next;
    const params = new URLSearchParams(sp.toString());
    if (next) params.set('q', next);
    else params.delete('q');
    params.delete('offset');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), DEBOUNCE_MS);
  }

  function onClear() {
    if (timer.current) clearTimeout(timer.current);
    setValue('');
    commit('');
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        role="searchbox"
        aria-label="Search businesses"
        placeholder={placeholder ?? 'Search…'}
        value={value}
        onChange={onChange}
        className="pr-8 pl-8"
        data-pending={isPending || undefined}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
