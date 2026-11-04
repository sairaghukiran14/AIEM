"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    return res.ok ? { ok: true } : { ok: false, error: data.error ?? "Something went wrong" };
  } catch {
    return { ok: false, error: "Network error, please try again" };
  }
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
      {message}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await post("/api/auth/forgot", { email });
    setPending(false);
    if (result.ok) setSent(true);
    else setError(result.error ?? null);
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-3 text-sm text-text-muted">
          If an account exists for <span className="font-medium text-text">{email}</span>, we have sent a link to choose a
          new password. It works once and expires in one hour.
        </p>
        <p className="mt-6 text-sm text-text-muted">
          <Link href="/login" className="font-medium text-accent-soft hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-text-muted">Enter your email and we will send you a link to choose a new one.</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
        </div>
        <ErrorLine message={error} />
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Send reset link
        </button>
      </form>
      <p className="mt-6 text-sm text-text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-accent-soft hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords do not match");
      return;
    }
    setPending(true);
    const result = await post("/api/auth/reset", { token, password });
    setPending(false);
    if (result.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } else {
      setError(result.error ?? null);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-3 text-sm text-text-muted">
          You can now sign in with your new password. Other devices that were signed in have been signed out.
        </p>
        <Link href="/login" className="btn btn-primary mt-6">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-sm text-text-muted">Use at least 8 characters.</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            New password
          </label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
            Confirm new password
          </label>
          <input id="confirm" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required />
        </div>
        <ErrorLine message={error} />
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  );
}
