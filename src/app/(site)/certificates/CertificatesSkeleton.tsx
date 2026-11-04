import { LoadingRegion, Skeleton } from "@/components/Skeleton";

export function CertificatesSkeleton() {
  return (
    <LoadingRegion label="Loading your certificates">
      <div aria-hidden="true" className="space-y-10">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="card flex items-center gap-4 p-5">
            <Skeleton className="size-8 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-44" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="card flex items-center justify-between gap-4 p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3.5 w-1/3" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
