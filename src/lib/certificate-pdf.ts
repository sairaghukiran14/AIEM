import { readFile } from "node:fs/promises";
import { join } from "node:path";

import * as fontkitModule from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { create as createQr } from "qrcode";
// The font engine's shaping code for Indic scripts such as Devanagari needs this helper to exist as a global.
import "regenerator-runtime/runtime";

import { formatIssueDate } from "@/lib/certificate-core";

export type CertificatePdfInput = {
  certId: string;
  holderName: string;
  title: string;
  /** A line under the title, such as "Track 3 of 10 · gate score 90%". */
  subtitle: string;
  issuedAt: string;
  verifyUrl: string;
  /** What the seal shows. Each track gets its own number and a pattern of its own. */
  badge?: { kind: "track" | "course"; number?: number; level?: string };
};

// A4 landscape, in PDF points.
const W = 841.89;
const H = 595.28;

// Grayscale only, to match the site: no colour and no gradients.
const INK = rgb(0.04, 0.04, 0.04);
const DARK = rgb(0.2, 0.2, 0.2);
const MID = rgb(0.32, 0.32, 0.32);
const DIM = rgb(0.54, 0.54, 0.54);
const HAIR = rgb(0.83, 0.83, 0.83);
const FAINT = rgb(0.9, 0.9, 0.9);
const WHITE = rgb(1, 1, 1);

/** Anything that can measure text. A PDFFont can, and so can a chain of fonts. */
type Measurable = { widthOfTextAtSize(text: string, size: number): number };

/**
 * A font plus fallbacks. The built-in Times covers Latin-1; a name with other letters (Cyrillic, Greek, Vietnamese, extended
 * Latin, Devanagari) draws those letters from a bundled Noto Serif font instead. Runs of characters from one font are drawn
 * together, so the font's own letter joining still works within a run. Anything no font covers becomes "?".
 */
type Style = "italic" | "bold";
type Fallback = { pkg: string; subset: string };

const LATIN_EXT: Fallback = { pkg: "noto-serif", subset: "latin-ext" };
const VIETNAMESE: Fallback = { pkg: "noto-serif", subset: "vietnamese" };
const CYRILLIC: Fallback = { pkg: "noto-serif", subset: "cyrillic" };
const CYRILLIC_EXT: Fallback = { pkg: "noto-serif", subset: "cyrillic-ext" };
const GREEK: Fallback = { pkg: "noto-serif", subset: "greek" };
const DEVANAGARI: Fallback = { pkg: "noto-serif-devanagari", subset: "devanagari" };

/** Which bundled fonts could hold a character, most likely first. */
function candidatesFor(cp: number): Fallback[] {
  if (cp >= 0x370 && cp <= 0x3ff) return [GREEK];
  if ((cp >= 0x400 && cp <= 0x52f) || (cp >= 0x1c80 && cp <= 0x1c8f) || (cp >= 0x2de0 && cp <= 0x2dff) || (cp >= 0xa640 && cp <= 0xa69f)) {
    return [CYRILLIC, CYRILLIC_EXT];
  }
  if (cp >= 0x900 && cp <= 0x97f) return [DEVANAGARI];
  return [LATIN_EXT, VIETNAMESE];
}

class TextChain implements Measurable {
  private extras: { font: PDFFont; chars: Set<number> }[] = [];
  private loaded = new Set<string>();
  private baseChars: Set<number>;

  constructor(
    private base: PDFFont,
    private style: Style
  ) {
    this.baseChars = new Set(base.getCharacterSet());
  }

  /** Embeds whichever fallback fonts the text needs. Done once, up front, because embedding is asynchronous. */
  async prepare(doc: PDFDocument, text: string): Promise<void> {
    for (const ch of Array.from(text.normalize("NFC"))) {
      const cp = ch.codePointAt(0) ?? -1;
      if (cp < 0 || /\s/.test(ch) || this.supports(cp)) continue;
      for (const candidate of candidatesFor(cp)) {
        const key = `${candidate.pkg}/${candidate.subset}`;
        if (this.loaded.has(key)) continue;
        this.loaded.add(key);
        try {
          const slope = this.style === "italic" && candidate.pkg === "noto-serif" ? "italic" : "normal";
          const weight = this.style === "bold" ? 700 : 400;
          const file = join(process.cwd(), "node_modules", "@fontsource", candidate.pkg, "files", `${candidate.pkg}-${candidate.subset}-${weight}-${slope}.woff`);
          const font = await doc.embedFont(await readFile(file), { subset: true });
          this.extras.push({ font, chars: new Set(font.getCharacterSet()) });
        } catch {
          // A font file that cannot be read just means those characters print as "?".
        }
        if (this.supports(cp)) break;
      }
    }
  }

  supports(cp: number): boolean {
    return this.baseChars.has(cp) || this.extras.some((e) => e.chars.has(cp));
  }

  private fontFor(cp: number): PDFFont {
    if (this.baseChars.has(cp)) return this.base;
    return this.extras.find((e) => e.chars.has(cp))?.font ?? this.base;
  }

  private runs(text: string): { font: PDFFont; text: string }[] {
    const out: { font: PDFFont; text: string }[] = [];
    for (const ch of Array.from(text)) {
      const font = this.fontFor(ch.codePointAt(0) ?? -1);
      const last = out[out.length - 1];
      if (last && last.font === font) last.text += ch;
      else out.push({ font, text: ch });
    }
    return out;
  }

  widthOfTextAtSize(text: string, size: number): number {
    return this.runs(text).reduce((sum, r) => sum + r.font.widthOfTextAtSize(r.text, size), 0);
  }

  draw(page: PDFPage, text: string, x: number, y: number, size: number, color: ReturnType<typeof rgb>) {
    let cursor = x;
    for (const run of this.runs(text)) {
      page.drawText(run.text, { x: cursor, y, size, font: run.font, color });
      cursor += run.font.widthOfTextAtSize(run.text, size);
    }
  }
}

/**
 * The built-in PDF fonts only cover Latin-1 text. Anything else would make
 * pdf-lib throw, so unsupported characters become "?" instead of failing the download.
 */
function printable(font: PDFFont | TextChain, text: string): string {
  const supported = font instanceof TextChain ? null : new Set(font.getCharacterSet());
  return Array.from(text.normalize("NFC"))
    .map((ch) => {
      const cp = ch.codePointAt(0) ?? -1;
      const ok = font instanceof TextChain ? font.supports(cp) : supported!.has(cp);
      return ok ? ch : "?";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Shrinks the font size until the text fits `maxWidth`, never below `minSize`. */
function fitSize(font: Measurable, text: string, size: number, maxWidth: number, minSize = 10): number {
  let s = size;
  while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.5;
  return s;
}

/** Cuts text with an ellipsis so it is guaranteed to fit. The last resort for absurdly long input. */
function ellipsize(font: Measurable, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

/**
 * Lays text out on one line if it fits at a reasonable size, otherwise on two
 * lines split near the middle at a word boundary, otherwise truncated. Never overflows.
 */
function layoutName(font: Measurable, text: string, maxWidth: number): { lines: string[]; size: number } {
  const one = fitSize(font, text, 46, maxWidth, 26);
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
  const widest = halves.reduce((a, b) => (font.widthOfTextAtSize(a, 32) >= font.widthOfTextAtSize(b, 32) ? a : b));
  const size = fitSize(font, widest, 32, maxWidth, 14);
  const lines = halves.filter(Boolean).map((l) => ellipsize(font, l, size, maxWidth));
  return { lines, size };
}

function centered(page: PDFPage, text: string, y: number, size: number, font: PDFFont | TextChain, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  const x = (W - width) / 2;
  if (font instanceof TextChain) font.draw(page, text, x, y, size, color);
  else page.drawText(text, { x, y, size, font, color });
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

/* ------------------------------------------------------------------ ornaments */

function dot(page: PDFPage, x: number, y: number, r: number, color = INK) {
  page.drawCircle({ x, y, size: r, color });
}

function ring(page: PDFPage, x: number, y: number, r: number, color: ReturnType<typeof rgb>, width: number) {
  page.drawCircle({ x, y, size: r, borderColor: color, borderWidth: width });
}

/** A small diamond. SVG paths in pdf-lib have y pointing down, which a symmetric shape does not care about. */
function diamond(page: PDFPage, cx: number, cy: number, s: number, color = INK) {
  page.drawSvgPath(`M 0 ${-s} L ${s} 0 L 0 ${s} L ${-s} 0 Z`, { x: cx, y: cy, color });
}

/** A rule with a diamond in the middle, used above and below the main text. */
function flourish(page: PDFPage, cx: number, y: number, half: number, color = DIM) {
  const gap = 9;
  page.drawLine({ start: { x: cx - half, y }, end: { x: cx - gap, y }, thickness: 0.7, color });
  page.drawLine({ start: { x: cx + gap, y }, end: { x: cx + half, y }, thickness: 0.7, color });
  diamond(page, cx, y, 3.6, INK);
  dot(page, cx - gap - 5, y, 1.1, color);
  dot(page, cx + gap + 5, y, 1.1, color);
}

/** Concentric quarter-circles of dots in one corner, plus a diamond. The number of rings varies by track. */
function corner(page: PDFPage, x: number, y: number, dx: 1 | -1, dy: 1 | -1, rings: number) {
  for (let k = 0; k < rings; k++) {
    const r = 12 + k * 9;
    const n = Math.round(r * 1.7);
    for (let i = 0; i <= n; i++) {
      const a = (Math.PI / 2) * (i / n);
      dot(page, x + dx * r * Math.cos(a), y + dy * r * Math.sin(a), 0.75, k === 0 ? INK : DIM);
    }
  }
  diamond(page, x + dx * 4, y + dy * 4, 3.2, INK);
}

/** The frame: a heavy outer rule, a thin one, a band of dots, and a hairline inside. */
function frame(page: PDFPage, rings: number, course: boolean) {
  if (course) {
    // The course certificate carries one more rule, so it reads as the highest award.
    page.drawRectangle({ x: 10, y: 10, width: W - 20, height: H - 20, borderColor: INK, borderWidth: 0.8 });
  }
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: INK, borderWidth: 3 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: INK, borderWidth: 0.6 });

  // A band of dots between the thin rule and the inner hairline.
  const inset = 33;
  const step = 11;
  for (let x = inset + 16; x <= W - inset - 16; x += step) {
    dot(page, x, inset, 0.9, DIM);
    dot(page, x, H - inset, 0.9, DIM);
  }
  for (let y = inset + 16; y <= H - inset - 16; y += step) {
    dot(page, inset, y, 0.9, DIM);
    dot(page, W - inset, y, 0.9, DIM);
  }
  page.drawRectangle({ x: 40, y: 40, width: W - 80, height: H - 80, borderColor: HAIR, borderWidth: 0.7 });

  corner(page, 40, 40, 1, 1, rings);
  corner(page, W - 40, 40, -1, 1, rings);
  corner(page, 40, H - 40, 1, -1, rings);
  corner(page, W - 40, H - 40, -1, -1, rings);
}

/** A faint rosette behind the text. The number of petals depends on the track, so every track looks different. */
function rosette(page: PDFPage, cx: number, cy: number, petals: number) {
  const r = 92;
  for (let i = 0; i < petals; i++) {
    const a = (Math.PI * 2 * i) / petals;
    ring(page, cx + r * Math.cos(a), cy + r * Math.sin(a), r, FAINT, 0.7);
  }
  ring(page, cx, cy, r * 2 + 8, FAINT, 0.9);
  ring(page, cx, cy, r * 2 + 16, FAINT, 0.5);
  ring(page, cx, cy, 14, FAINT, 0.9);
}

/** A five-point star as an SVG path (y points down, so the top point is negative). */
function starPath(R: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : R * 0.42;
    const a = -Math.PI / 2 + (Math.PI * i) / 5;
    pts.push(`${(rad * Math.cos(a)).toFixed(2)} ${(rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

/** The seal: two ribbon tails, a scalloped edge, a disc with rings, and the track number or a star. */
function seal(
  page: PDFPage,
  cx: number,
  cy: number,
  r: number,
  badge: NonNullable<CertificatePdfInput["badge"]> | undefined,
  fonts: { sans: PDFFont; serif: PDFFont }
) {
  // Ribbon tails first, so the seal sits on top of them.
  const tail = (side: 1 | -1, color: ReturnType<typeof rgb>) => {
    const k = r / 46;
    const pts: [number, number][] = [
      [36 * side, 22],
      [8 * side, 34],
      [8 * side, 80],
      [22 * side, 68],
      [36 * side, 80],
    ];
    page.drawSvgPath(`M ${pts.map(([px, py]) => `${(px * k).toFixed(1)} ${(py * k).toFixed(1)}`).join(" L ")} Z`, { x: cx, y: cy, color });
  };
  tail(-1, DARK);
  tail(1, INK);

  // Scalloped edge.
  const scallops = 36;
  for (let i = 0; i < scallops; i++) {
    const a = (Math.PI * 2 * i) / scallops;
    dot(page, cx + r * Math.cos(a), cy + r * Math.sin(a), r * 0.1, INK);
  }
  page.drawCircle({ x: cx, y: cy, size: r * 0.97, color: INK });
  ring(page, cx, cy, r * 0.9, WHITE, 1.1);
  for (let i = 0; i < 72; i++) {
    const a = (Math.PI * 2 * i) / 72;
    dot(page, cx + r * 0.82 * Math.cos(a), cy + r * 0.82 * Math.sin(a), 0.6, WHITE);
  }
  ring(page, cx, cy, r * 0.74, WHITE, 0.6);

  const { sans, serif } = fonts;
  if (badge?.kind === "course") {
    page.drawSvgPath(starPath(r * 0.34), { x: cx, y: cy - r * 0.02, color: WHITE });
    spaced(page, "COURSE", cx, cy + r * 0.44, 6, sans, 1.4, WHITE);
    spaced(page, "COMPLETE", cx, cy - r * 0.52, 5.2, sans, 0.8, WHITE);
  } else if (badge?.number !== undefined) {
    spaced(page, "TRACK", cx, cy + r * 0.4, 5.8, sans, 1.4, WHITE);
    const num = String(badge.number).padStart(2, "0");
    const size = r * 0.54;
    const w = serif.widthOfTextAtSize(num, size);
    page.drawText(num, { x: cx - w / 2, y: cy - size * 0.28, size, font: serif, color: WHITE });
    if (badge.level) spaced(page, badge.level.toUpperCase(), cx, cy - r * 0.5, 4.6, sans, 0.5, WHITE);
  } else {
    const w = serif.widthOfTextAtSize("AIEM", r * 0.4);
    page.drawText("AIEM", { x: cx - w / 2, y: cy - r * 0.14, size: r * 0.4, font: serif, color: WHITE });
  }
}

/** Draws the QR code as filled squares, merging runs along each row to keep the file small. */
function drawQr(page: PDFPage, text: string, x: number, y: number, size: number): boolean {
  let qr;
  try {
    qr = createQr(text, { errorCorrectionLevel: "M" });
  } catch {
    return false; // the address was too long to encode: the printed link still works
  }
  const n = qr.modules.size;
  const m = size / n;
  for (let row = 0; row < n; row++) {
    let col = 0;
    while (col < n) {
      if (!qr.modules.get(row, col)) {
        col++;
        continue;
      }
      let end = col;
      while (end < n && qr.modules.get(row, end)) end++;
      page.drawRectangle({ x: x + col * m, y: y + size - (row + 1) * m, width: (end - col) * m + 0.15, height: m + 0.15, color: INK });
      col = end;
    }
  }
  return true;
}

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const mono = await doc.embedFont(StandardFonts.CourierBold);

  // Embed any extra fonts the name or title needs (other alphabets), then measure and draw with the combined chains.
  doc.registerFontkit((fontkitModule as unknown as { default?: Parameters<typeof doc.registerFontkit>[0] }).default ?? (fontkitModule as unknown as Parameters<typeof doc.registerFontkit>[0]));
  const nameFont = new TextChain(serifItalic, "italic");
  const titleFont = new TextChain(serifBold, "bold");
  await nameFont.prepare(doc, input.holderName);
  await titleFont.prepare(doc, input.title);

  const name = printable(nameFont, input.holderName) || "Learner";
  const title = printable(titleFont, input.title);
  const subtitle = printable(regular, input.subtitle);
  const verifyUrl = printable(regular, input.verifyUrl);
  const course = input.badge?.kind === "course";
  const order = input.badge?.number ?? 0;

  doc.setTitle(`${title} certificate: ${name}`);
  doc.setAuthor("AIEM");
  doc.setSubject(`Certificate ${input.certId}`);
  doc.setProducer("AIEM");
  doc.setCreator("AIEM");
  doc.setCreationDate(new Date(input.issuedAt));
  doc.setModificationDate(new Date(input.issuedAt));

  const page = doc.addPage([W, H]);
  const cx = W / 2;

  // Background pattern and frame come first, so the text sits on top of them.
  rosette(page, cx, H / 2 + 6, 12 + order);
  frame(page, 2 + (order % 3), course);

  // Wordmark, flanked by rules.
  const blockW = 112;
  const blockH = 38;
  const blockY = 498;
  page.drawRectangle({ x: cx - blockW / 2, y: blockY, width: blockW, height: blockH, color: INK });
  spaced(page, "AIEM", cx, blockY + 12, 18, bold, 5, WHITE);
  for (const side of [-1, 1]) {
    const x1 = cx + side * (blockW / 2 + 18);
    const x2 = cx + side * 250;
    page.drawLine({ start: { x: x1, y: blockY + blockH / 2 }, end: { x: x2, y: blockY + blockH / 2 }, thickness: 0.7, color: DIM });
    diamond(page, x2, blockY + blockH / 2, 3, INK);
  }

  spaced(page, "CERTIFICATE", cx, 450, 36, serifBold, 9, INK);
  spaced(page, course ? "OF COURSE COMPLETION" : "OF COMPLETION", cx, 428, 10, bold, 4.5, MID);

  centered(page, "This certifies that", 393, 15, serifItalic, MID);

  const { lines: nameLines, size: nameSize } = layoutName(nameFont, name, W - 220);
  let shift = 0;
  if (nameLines.length === 1) {
    centered(page, nameLines[0], 348, nameSize, nameFont);
  } else {
    shift = 14;
    centered(page, nameLines[0], 358, nameSize, nameFont);
    centered(page, nameLines[1], 358 - nameSize - 4, nameSize, nameFont);
  }
  const ruleY = nameLines.length === 1 ? 332 : 358 - nameSize - 18;
  flourish(page, cx, ruleY, 230);

  centered(page, "has successfully completed", 302 - shift, 14, serifItalic, MID);

  const titleSize = fitSize(titleFont, title, 28, W - 220, 14);
  centered(page, ellipsize(titleFont, title, titleSize, W - 220), 264 - shift, titleSize, titleFont);

  if (subtitle) centered(page, subtitle, 240 - shift, 11.5, regular, MID);
  if (course) {
    // Stars under the title: the course certificate is the highest award.
    for (const dx of [-26, 0, 26]) page.drawSvgPath(starPath(dx === 0 ? 6.5 : 4.5), { x: cx + dx, y: 224 - shift, color: dx === 0 ? INK : DIM });
  }

  // The seal, with its ribbon, sits at the bottom centre.
  seal(page, cx, 160, course ? 50 : 46, input.badge, { sans: bold, serif: serifBold });

  // Left column: date of issue and certificate id.
  const left = 72;
  page.drawText("DATE OF ISSUE", { x: left, y: 178, size: 7.5, font: bold, color: DIM });
  page.drawText(formatIssueDate(input.issuedAt), { x: left, y: 158, size: 15, font: serifBold, color: INK });
  page.drawLine({ start: { x: left, y: 148 }, end: { x: left + 190, y: 148 }, thickness: 0.6, color: HAIR });
  page.drawText("CERTIFICATE ID", { x: left, y: 130, size: 7.5, font: bold, color: DIM });
  page.drawText(input.certId, { x: left, y: 112, size: 12.5, font: mono, color: INK });

  // Right column: a QR code that opens the verification page.
  const right = W - 72;
  const qrSize = 84;
  const qrX = right - qrSize;
  const qrY = 100;
  page.drawRectangle({ x: qrX - 7, y: qrY - 7, width: qrSize + 14, height: qrSize + 14, borderColor: HAIR, borderWidth: 0.7, color: WHITE });
  const hasQr = drawQr(page, input.verifyUrl, qrX, qrY, qrSize);
  const scanLabel = hasQr ? "SCAN TO VERIFY" : "VERIFY AT";
  const scanW = bold.widthOfTextAtSize(scanLabel, 7);
  page.drawText(scanLabel, { x: qrX + qrSize / 2 - scanW / 2 - 0.5, y: qrY + qrSize + 14, size: 7, font: bold, color: DIM });
  const urlSize = fitSize(regular, verifyUrl, 7, 300, 4.5);
  const urlW = regular.widthOfTextAtSize(verifyUrl, urlSize);
  page.drawText(verifyUrl, { x: right - urlW, y: 84, size: urlSize, font: regular, color: MID });

  const note =
    "Issued by AIEM (AI Engineering Mastery) for completing its course material and passing its assessments. Not an accredited qualification.";
  centered(page, note, 52, 7, regular, DIM);

  return doc.save();
}
