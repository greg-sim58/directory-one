import {
  FilterPanelSkeleton,
  MapSlotSkeleton,
  ResultsListSkeleton,
  SearchBarSkeleton,
} from '@/components/search/skeletons';

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <div className="bg-muted h-8 w-1/3 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
      </div>
      <div className="mt-4 max-w-xl">
        <SearchBarSkeleton />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <FilterPanelSkeleton />
        </aside>
        <div className="flex flex-col gap-4">
          <ResultsListSkeleton />
          <MapSlotSkeleton />
        </div>
      </div>
    </div>
  );
}
