import { LoadingRegion, Skeleton, SkeletonCard } from "@/components/Skeleton";

// Fallback for any (site) page without its own loading screen.
export default function Loading() {
  return (
    <LoadingRegion label="Loading page">
      <div aria-hidden="true" className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </LoadingRegion>
  );
}
