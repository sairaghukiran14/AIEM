import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

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
