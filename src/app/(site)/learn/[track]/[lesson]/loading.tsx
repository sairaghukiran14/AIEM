import { LoadingRegion, Skeleton, SkeletonText } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading lesson">
      <div aria-hidden="true" className="grid gap-10 lg:grid-cols-[1fr_14rem]">
        <div className="min-w-0 space-y-12">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>

          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-7 w-52" />
              <SkeletonText lines={4} />
              {i === 2 && <Skeleton className="h-40 w-full rounded-xl" />}
            </div>
          ))}
        </div>

        <div className="hidden space-y-2 lg:block">
          <Skeleton className="h-3.5 w-24" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
