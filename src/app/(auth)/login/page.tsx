import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSessionUserId()) redirect("/dashboard");

  const { next } = await searchParams;
  return <AuthForm mode="login" next={safeNext(next)} />;
}

/** Only allow same-site redirects, so ?next= cannot send people off-site. */
function safeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
