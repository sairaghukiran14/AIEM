import { FastLink as Link } from "@/components/FastLink";
import { SearchX } from "lucide-react";

export default function CertificateNotFound() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <SearchX className="mx-auto mb-3 size-8 text-text-dim" />
      <h1 className="text-xl font-semibold">We could not verify this certificate</h1>
      <p className="mt-2 text-sm text-text-muted">
        No certificate with that ID exists. Check that it was copied exactly (IDs look like
        AIEM-7K3Q-ZB2M-X9HD), or ask the holder for the link.
      </p>
      <Link href="/verify" className="btn btn-primary mt-5">
        Try another ID
      </Link>
    </div>
  );
}
