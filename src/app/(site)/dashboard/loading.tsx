import { LoadingRegion, Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your dashboard">
      <div aria-hidden="true" className="space-y-10">
        <div className="space-y-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-56" />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card space-y-2 p-4">
              <Skeleton className="size-5" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-32" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card space-y-3 p-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
