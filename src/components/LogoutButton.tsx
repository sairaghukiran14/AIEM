"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={logout} className="btn btn-ghost !px-3 !py-1.5 !text-xs" aria-label="Sign out">
      <LogOut className="size-3.5" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
