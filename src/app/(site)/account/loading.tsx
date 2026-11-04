import { LoadingRegion, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your account">
      <div aria-hidden="true" className="mx-auto max-w-2xl space-y-10">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        <div className="card space-y-4 p-5">
          <Skeleton className="h-5 w-20" />
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>
    </LoadingRegion>
  );
}
