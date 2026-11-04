import { LoadingRegion, Skeleton } from "@/components/Skeleton";

export function TrackSkeleton() {
  return (
    <LoadingRegion label="Loading track">
      <div aria-hidden="true" className="space-y-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Skeleton className="size-14 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card flex items-center gap-4 p-4">
              <Skeleton className="size-5 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
