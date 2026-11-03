import { redirect } from "next/navigation";

import { isValidCertId } from "@/lib/certificate-core";

export const metadata = { title: "Verify a certificate" };

export default async function VerifyLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const cleaned = id?.trim().toUpperCase();

  if (cleaned && isValidCertId(cleaned)) redirect(`/verify/${cleaned}`);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-semibold tracking-tight">Verify a certificate</h1>
      <p className="mt-2 text-text-muted">
        Enter the certificate ID printed at the bottom of an AIEM certificate to confirm who it was issued
        to and when.
      </p>

      <form action="/verify" method="get" className="mt-6 space-y-3">
        <label htmlFor="id" className="block text-sm font-medium">
          Certificate ID
        </label>
        <input
          id="id"
          name="id"
          defaultValue={id ?? ""}
          placeholder="AIEM-7K3Q-ZB2M-X9HD"
          autoComplete="off"
          spellCheck={false}
          className="input font-mono uppercase"
        />
        {cleaned && !isValidCertId(cleaned) && (
          <p role="alert" className="text-sm text-text-muted">
            That does not look like a certificate ID. They have the form AIEM-XXXX-XXXX-XXXX.
          </p>
        )}
        <button type="submit" className="btn btn-primary">
          Verify
        </button>
      </form>
    </div>
  );
}
