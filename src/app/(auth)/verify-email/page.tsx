import Link from "next/link";

import { VerifyEmailForm } from "@/components/VerifyEmail";

export const metadata = {
  title: "Confirm your email",
  // The link carries a secret, so do not pass it on to other sites in the Referer header.
  referrer: "no-referrer" as const,
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">This link is not valid</h1>
        <p className="mt-3 text-sm text-text-muted">The confirmation link is missing its token. Sign in and ask for a new one.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">
          Go to the dashboard
        </Link>
      </div>
    );
  }
  return <VerifyEmailForm token={token} />;
}
