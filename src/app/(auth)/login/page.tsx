import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

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

