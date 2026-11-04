"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut, Mail } from "lucide-react";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/account/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok) {
        setSentTo(newEmail);
        setPassword("");
      } else setError(data.error ?? "Something went wrong");
    } catch {
      setError("Network error, please try again");
    }
    setPending(false);
  }

  if (sentTo) {
    return (
      <div role="status" className="rounded-lg border-2 border-text bg-bg-raised p-4 text-sm">
        <p className="font-semibold">Check {sentTo}</p>
        <p className="mt-1 text-text-muted">
          We sent a link there. Your address changes only after you open it, and the link works once for one hour. Until
          then you keep signing in with {currentEmail}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div>
        <label htmlFor="newEmail" className="mb-1.5 block text-sm font-medium">
          New email address
        </label>
        <input id="newEmail" type="email" className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium">
          Current password
        </label>
        <input id="currentPassword" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
        Send confirmation link
      </button>
    </form>
  );
}

export function SignOutEverywhereButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOutEverywhere() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/account/signout-all", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
        return;
      }
      setError("Could not sign out everywhere. Please try again.");
    } catch {
      setError("Network error, please try again");
    }
    setPending(false);
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={signOutEverywhere} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        Sign out everywhere
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red">
          {error}
        </p>
      )}
    </div>
  );
}

/** The page behind the link sent to a new address. It asks for a click so a link scanner cannot spend the token. */
export function ConfirmEmailChangeForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function confirm() {
    setState("pending");
    try {
      const res = await fetch("/api/account/confirm-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok) setState("done");
      else {
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
        <h1 className="text-2xl font-semibold tracking-tight">Email address changed</h1>
        <p className="mt-3 text-sm text-text-muted">
          Your new address is confirmed. Sign in with it from now on. Every device was signed out for safety.
        </p>
        <a href="/login" className="btn btn-primary mt-6">
          Go to sign in
        </a>
      </div>
    );
  }
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Confirm your new email</h1>
      <p className="mt-2 text-sm text-text-muted">Confirming makes this your sign-in address.</p>
      {message && (
        <p role="alert" className="mt-5 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          {message}
        </p>
      )}
      <button className="btn btn-primary mt-6 w-full" onClick={confirm} disabled={state === "pending"}>
        {state === "pending" && <Loader2 className="size-4 animate-spin" />}
        Confirm this email address
      </button>
    </div>
  );
}
