import { BadgeCheck, MailWarning } from "lucide-react";

import { ChangeEmailForm, SignOutEverywhereButton } from "@/components/AccountForms";
import { VerifyEmailBanner } from "@/components/VerifyEmail";
import { requireUser } from "@/lib/auth";
import { isVerificationRequired } from "@/lib/email-verification";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
        <p className="mt-1 text-text-muted">The details your certificates and sign-in use.</p>
      </header>

      {isVerificationRequired() && !user.emailVerified && <VerifyEmailBanner email={user.email} />}

      <section aria-labelledby="details" className="card space-y-3 p-5">
        <h2 id="details" className="text-lg font-semibold">
          Details
        </h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-text-dim">Name</dt>
          <dd className="font-medium">{user.name}</dd>
          <dt className="text-text-dim">Email</dt>
          <dd className="flex flex-wrap items-center gap-2 font-medium">
            {user.email}
            {user.emailVerified ? (
              <span className="chip">
                <BadgeCheck className="size-3.5" /> Confirmed
              </span>
            ) : (
              <span className="chip">
                <MailWarning className="size-3.5" /> Not confirmed
              </span>
            )}
          </dd>
        </dl>
        <p className="text-xs text-text-dim">
          The name on a certificate is the name on your account when you pass. It cannot be changed afterwards.
        </p>
      </section>

      <section aria-labelledby="email" className="space-y-4">
        <div>
          <h2 id="email" className="text-lg font-semibold">
            Change your email address
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            We send a link to the new address and change it only when it is opened. You need your current password.
          </p>
        </div>
        <ChangeEmailForm currentEmail={user.email} />
      </section>

      <section aria-labelledby="sessions" className="space-y-3">
        <div>
          <h2 id="sessions" className="text-lg font-semibold">
            Sessions
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Use this if you signed in on a shared or lost device. Every browser, including this one, is signed out.
          </p>
        </div>
        <SignOutEverywhereButton />
      </section>
    </div>
  );
}
