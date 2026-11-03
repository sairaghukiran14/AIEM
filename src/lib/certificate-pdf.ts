import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatIssueDate } from "@/lib/certificate-core";

export type CertificatePdfInput = {
  certId: string;
  holderName: string;
  title: string;
  /** A line under the title, such as "Track 3 of 8 · gate score 90%". */
  subtitle: string;
  issuedAt: string;
  verifyUrl: string;
};

// A4 landscape, in PDF points.
const W = 841.89;
const H = 595.28;

const INK = rgb(0.04, 0.04, 0.04);
const MID = rgb(0.32, 0.32, 0.32);
const DIM = rgb(0.54, 0.54, 0.54);
const HAIR = rgb(0.83, 0.83, 0.83);

/**
 * The built-in PDF fonts only cover Latin-1 text. Anything else would make
 * pdf-lib throw, so unsupported characters become "?" instead of failing the download.
 */
function printable(font: PDFFont, text: string): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text.normalize("NFC"))
    .map((ch) => (supported.has(ch.codePointAt(0) ?? -1) ? ch : "?"))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Shrinks the font size until the text fits `maxWidth`, never below `minSize`. */
function fitSize(font: PDFFont, text: string, size: number, maxWidth: number, minSize = 10): number {
  let s = size;
  while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.5;
  return s;
}

/** Cuts text with an ellipsis so it is guaranteed to fit. The last resort for absurdly long input. */
function ellipsize(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

/**
 * Lays text out on one line if it fits at a reasonable size, otherwise on two
 * lines split near the middle at a word boundary, otherwise truncated. Never overflows.
 */
function layoutName(font: PDFFont, text: string, maxWidth: number): { lines: string[]; size: number } {
  const one = fitSize(font, text, 42, maxWidth, 24);
  if (font.widthOfTextAtSize(text, one) <= maxWidth) return { lines: [text], size: one };

  const words = text.split(" ");
  let best = Math.ceil(words.length / 2);
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  const halves = words.length > 1 ? [words.slice(0, best).join(" "), words.slice(best).join(" ")] : [text, ""];
  const widest = halves.reduce((a, b) => (font.widthOfTextAtSize(a, 30) >= font.widthOfTextAtSize(b, 30) ? a : b));
  const size = fitSize(font, widest, 30, maxWidth, 14);
  const lines = halves.filter(Boolean).map((l) => ellipsize(font, l, size, maxWidth));
  return { lines, size };
}

function centered(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (W - width) / 2, y, size, font, color });
}

/** Centred text with extra space between letters (pdf-lib has no letter-spacing option). */
function spaced(page: PDFPage, text: string, centerX: number, y: number, size: number, font: PDFFont, gap: number, color = INK) {
  const widths = Array.from(text).map((ch) => font.widthOfTextAtSize(ch, size));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  let x = centerX - total / 2;
  Array.from(text).forEach((ch, i) => {
    page.drawText(ch, { x, y, size, font, color });
    x += widths[i] + gap;
  });
}

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const name = printable(bold, input.holderName) || "Learner";
  const title = printable(bold, input.title);
  const subtitle = printable(regular, input.subtitle);
  const verifyUrl = printable(regular, input.verifyUrl);

  doc.setTitle(`${title} certificate: ${name}`);
  doc.setAuthor("AIEM");
  doc.setSubject(`Certificate ${input.certId}`);
  doc.setProducer("AIEM");
  doc.setCreator("AIEM");
  doc.setCreationDate(new Date(input.issuedAt));
  doc.setModificationDate(new Date(input.issuedAt));

  const page = doc.addPage([W, H]);

  // Frame: a heavy outer rule and a hairline inner one.
  page.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, borderColor: INK, borderWidth: 2.5 });
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: HAIR, borderWidth: 0.75 });

  // The AIEM wordmark: white letters on an ink block.
  const blockW = 112;
  const blockH = 38;
  page.drawRectangle({ x: (W - blockW) / 2, y: H - 108, width: blockW, height: blockH, color: INK });
  spaced(page, "AIEM", W / 2, H - 94, 18, bold, 5, rgb(1, 1, 1));

  spaced(page, "CERTIFICATE OF COMPLETION", W / 2, H - 150, 12, bold, 3, MID);

  centered(page, "This certifies that", H - 200, 14, regular, MID);

  const { lines: nameLines, size: nameSize } = layoutName(bold, name, W - 160);
  if (nameLines.length === 1) {
    centered(page, nameLines[0], H - 252, nameSize, bold);
  } else {
    centered(page, nameLines[0], H - 238, nameSize, bold);
    centered(page, nameLines[1], H - 238 - nameSize - 4, nameSize, bold);
  }
  const ruleY = nameLines.length === 1 ? H - 268 : H - 238 - nameSize - 18;
  page.drawLine({ start: { x: W / 2 - 220, y: ruleY }, end: { x: W / 2 + 220, y: ruleY }, thickness: 0.75, color: DIM });

  centered(page, "has successfully completed", H - 304, 14, regular, MID);

  const titleSize = fitSize(bold, title, 28, W - 160, 14);
  centered(page, ellipsize(bold, title, titleSize, W - 160), H - 346, titleSize, bold);

  if (subtitle) centered(page, subtitle, H - 374, 13, regular, MID);

  centered(page, `Issued on ${formatIssueDate(input.issuedAt)}`, H - 420, 12, regular, MID);

  // Footer: verification details.
  page.drawLine({ start: { x: 64, y: 118 }, end: { x: W - 64, y: 118 }, thickness: 0.5, color: HAIR });
  page.drawText("Certificate ID", { x: 64, y: 98, size: 8, font: regular, color: DIM });
  page.drawText(input.certId, { x: 64, y: 82, size: 12, font: bold, color: INK });

  const verifyLabel = "Verify at";
  const labelW = regular.widthOfTextAtSize(verifyLabel, 8);
  const urlSize = fitSize(regular, verifyUrl, 10, 420, 6);
  const urlW = regular.widthOfTextAtSize(verifyUrl, urlSize);
  page.drawText(verifyLabel, { x: W - 64 - labelW, y: 98, size: 8, font: regular, color: DIM });
  page.drawText(verifyUrl, { x: W - 64 - urlW, y: 82, size: urlSize, font: regular, color: INK });

  const note =
    "Issued by AIEM (AI Engineering Mastery) for completing its course material and passing its assessments. Not an accredited qualification.";
  centered(page, note, 52, 7.5, regular, DIM);

  return doc.save();
}
