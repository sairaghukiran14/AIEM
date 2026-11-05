import { LoadingRegion, Skeleton, SkeletonCard, SkeletonText } from "@/components/Skeleton";

function repeat(count: number, render: (i: number) => React.ReactNode) {
  return Array.from({ length: count }, (_, i) => render(i));
}

export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading your dashboard">
      <div aria-hidden="true" className="space-y-10">
        <div className="space-y-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-56" />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {repeat(4, (i) => (
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
          {repeat(4, (i) => (
            <div key={i} className="card space-y-3 p-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

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
          {repeat(5, (i) => (
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

export function AccountSkeleton() {
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
            <Skeleton className="h-4 w-56 max-w-full" />
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

export function TracksSkeleton() {
  return (
    <LoadingRegion label="Loading tracks">
      <div aria-hidden="true" className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {repeat(6, (i) => (
            <div key={i} className="card flex gap-4 p-5">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <SkeletonText lines={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

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
          {repeat(6, (i) => (
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

export function LessonSkeleton() {
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

          {repeat(3, (i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-7 w-52 max-w-full" />
              <SkeletonText lines={4} />
              {i === 2 && <Skeleton className="h-40 w-full rounded-xl" />}
            </div>
          ))}
        </div>

        <div className="hidden space-y-2 lg:block">
          <Skeleton className="h-3.5 w-24" />
          {repeat(5, (i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function VerifySkeleton() {
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
      </div>
    </LoadingRegion>
  );
}

export function AuthSkeleton() {
  return (
    <LoadingRegion label="Loading">
      <div aria-hidden="true" className="mx-auto w-full max-w-sm space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-6 h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </LoadingRegion>
  );
}

export function GenericSkeleton() {
  return (
    <LoadingRegion label="Loading page">
      <div aria-hidden="true" className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-3">
          {repeat(3, (i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

const AUTH_ROUTES = ["login", "signup", "forgot-password", "reset-password", "verify-email", "confirm-email"];

/** The skeleton shaped like the page at this path. */
export function PageSkeleton({ pathname, compact = false }: { pathname: string; compact?: boolean }) {
  if (compact) return <AuthSkeleton />;

  const [first, second] = pathname.split("/").filter(Boolean);
  if (AUTH_ROUTES.includes(first)) return <AuthSkeleton />;

  switch (first) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "certificates":
      return <CertificatesSkeleton />;
    case "account":
      return <AccountSkeleton />;
    case "tracks":
      return second ? <TrackSkeleton /> : <TracksSkeleton />;
    case "learn":
      return <LessonSkeleton />;
    case "verify":
      return second ? <VerifySkeleton /> : <GenericSkeleton />;
    default:
      return <GenericSkeleton />;
  }
}
