import { Skeleton } from '@/components/ui/skeleton';
import { MapRegionSkeleton as MapRegionSkeletonImpl } from '@/components/map/skeletons/MapRegionSkeleton';

export { MapRegionSkeletonImpl as MapRegionSkeleton };

export function SearchBarSkeleton() {
  return <Skeleton className="h-8 w-full" />;
}

export function FilterPanelSkeleton() {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-5 rounded-xl p-4 ring-1">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-12" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-12" />
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-10" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ResultsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <div className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl p-3 ring-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Back-compat alias for code that still imports MapSlotSkeleton.
export const MapSlotSkeleton = MapRegionSkeletonImpl;
