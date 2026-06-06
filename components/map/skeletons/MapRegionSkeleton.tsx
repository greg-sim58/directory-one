import { Skeleton } from '@/components/ui/skeleton';

// Map placeholder shown while mapbox-gl is loading. Subtle grid
// pattern + "Loading map…" hint. Reserves the same aspect/height the
// real map will take so the layout doesn't shift when MapView arrives.

export function MapRegionSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={
        'bg-muted/40 ring-foreground/10 relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl ring-1 ' +
        (className ?? '')
      }
      role="status"
      aria-label="Loading map"
    >
      {/* Faux grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          color: 'var(--color-foreground)',
        }}
      />
      <Skeleton className="bg-background/80 text-muted-foreground h-7 w-32 rounded-full text-[10px] tracking-wide uppercase" />
    </div>
  );
}
