import { notFound } from "next/navigation";
import { emailFeaturesEnabled } from "@/lib/features";
import { ForgotPasswordForm } from "@/components/PasswordForms";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  if (!emailFeaturesEnabled()) notFound();
  return <ForgotPasswordForm />;
}
