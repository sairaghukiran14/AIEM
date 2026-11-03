import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSessionUserId()) redirect("/dashboard");

  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safeNext(next)} />;
}

function safeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
