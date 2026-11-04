import { NextResponse } from "next/server";

import { isValidCertId } from "@/lib/certificate-core";
import { certificateBadge, certificateSubtitle } from "@/lib/certificate-labels";
import { buildCertificatePdf } from "@/lib/certificate-pdf";
import { getCertificate } from "@/lib/certificates";

type Params = { params: Promise<{ certId: string }> };

/**
 * Public on purpose: the certificate id is the capability, the same as the
 * verification page. Ids are random and unguessable, and the PDF shows nothing
 * the verification page does not.
 */
export async function GET(request: Request, { params }: Params) {
  const { certId } = await params;

  if (!isValidCertId(certId)) {
    return NextResponse.json({ error: "Not a valid certificate id" }, { status: 404 });
  }

  let cert;
  try {
    cert = await getCertificate(certId);
  } catch (err) {
    console.error("[certificate pdf]", err);
    return NextResponse.json({ error: "Certificates are temporarily unavailable" }, { status: 503 });
  }
  if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const origin = process.env.SITE_URL ?? new URL(request.url).origin;
  const pdf = await buildCertificatePdf({
    certId: cert.certId,
    holderName: cert.holderName,
    title: cert.title,
    subtitle: certificateSubtitle(cert),
    issuedAt: cert.issuedAt,
    verifyUrl: `${origin}/verify/${cert.certId}`,
    badge: certificateBadge(cert),
  });

  return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cert.certId}.pdf"`,
      // Short on purpose: a deleted or revoked certificate must stop being downloadable within a minute.
      "Cache-Control": "public, max-age=0, s-maxage=60",
    },
  });
}
