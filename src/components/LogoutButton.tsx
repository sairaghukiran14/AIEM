"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

import { announceNavigation } from "@/components/NavigationFeedback";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      announceNavigation("/");
      router.push("/");
      router.refresh();
    } catch {
      setPending(false);
    }
  }

  return (
    <button onClick={logout} disabled={pending} className="btn btn-ghost !px-3 !py-1.5 !text-xs" aria-label="Sign out">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
