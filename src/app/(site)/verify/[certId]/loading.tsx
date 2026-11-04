import { LoadingRegion, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Checking the certificate">
      <div aria-hidden="true" className="space-y-8">
        <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-xl border border-border-strong p-5">
          <Skeleton className="size-6 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="mx-auto h-72 w-full max-w-3xl rounded-xl" />
        <div className="mx-auto flex max-w-3xl gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </LoadingRegion>
  );
}
