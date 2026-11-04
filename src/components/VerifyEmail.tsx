"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

/** The page behind the emailed link. It asks for a click instead of confirming on load, so link scanners that merely open URLs cannot spend the token. */
export function VerifyEmailForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState(0);

  async function confirm() {
    setState("pending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; certificatesIssued?: number };
      if (res.ok) {
        setIssued(data.certificatesIssued ?? 0);
        setState("done");
      } else {
        setMessage(data.error ?? "Something went wrong");
        setState("error");
      }
    } catch {
      setMessage("Network error, please try again");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="w-full max-w-sm">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MailCheck className="size-6" /> Email confirmed
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Thanks, your address is confirmed.
          {issued > 0 && ` ${issued} certificate${issued === 1 ? " was" : "s were"} waiting and ${issued === 1 ? "has" : "have"} now been issued.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/certificates" className="btn btn-primary">
            My certificates
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
      <p className="mt-2 text-sm text-text-muted">Confirming lets us issue the certificates you earn.</p>
      {message && (
        <p role="alert" className="mt-5 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          {message}
        </p>
      )}
      <button className="btn btn-primary mt-6 w-full" onClick={confirm} disabled={state === "pending"}>
        {state === "pending" && <Loader2 className="size-4 animate-spin" />}
        Confirm my email address
      </button>
      {state === "error" && (
        <p className="mt-6 text-sm text-text-muted">
          <Link href="/dashboard" className="font-medium text-accent-soft hover:underline">
            Go to the dashboard
          </Link>{" "}
          to request a new link.
        </p>
      )}
    </div>
  );
}

/** Shown to a signed-in person whose address is not confirmed yet. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setState("pending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string; alreadyVerified?: boolean };
      if (res.ok) setState("sent");
      else {
        setMessage(data.error ?? "Something went wrong");
        setState("error");
      }
    } catch {
      setMessage("Network error, please try again");
      setState("error");
    }
  }

  return (
    <section role="status" className="card flex flex-wrap items-center justify-between gap-3 border-2 !border-text p-4">
      <div className="min-w-0 text-sm">
        <p className="font-semibold">Confirm your email address</p>
        <p className="mt-0.5 text-text-muted">
          {state === "sent"
            ? `We sent a new link to ${email}. It works for 24 hours.`
            : `Certificates you earn are issued once ${email} is confirmed. Check your inbox for the link.`}
        </p>
        {message && (
          <p role="alert" className="mt-1 text-red">
            {message}
          </p>
        )}
      </div>
      <button className="btn btn-ghost" onClick={resend} disabled={state === "pending" || state === "sent"}>
        {state === "pending" && <Loader2 className="size-4 animate-spin" />}
        {state === "sent" ? "Sent" : "Send the link again"}
      </button>
    </section>
  );
}
