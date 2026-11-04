import { notFound } from "next/navigation";
import { emailFeaturesEnabled } from "@/lib/features";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/PasswordForms";

export const metadata = {
  title: "Choose a new password",
  // The link carries a secret, so do not pass it on to other sites in the Referer header.
  referrer: "no-referrer" as const,
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (!emailFeaturesEnabled()) notFound();
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">This link is not valid</h1>
        <p className="mt-3 text-sm text-text-muted">The reset link is missing its token. Request a new one.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-6">
          Request a new link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
