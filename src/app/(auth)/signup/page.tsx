import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Check the database, not just the cookie. A cookie can outlive its account (deleted, or signed out by a
  // password reset), and trusting it alone sends people /login -> /dashboard -> /login forever.
  if (await getCurrentUser()) redirect("/dashboard");

  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safeNext(next)} />;
}
