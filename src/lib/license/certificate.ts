import "server-only";
import crypto from "crypto";
import type { Entitlement } from "@/lib/data/entitlements";
import type { PublicFileMeta } from "@/lib/files/types";
import type { LicenseTier } from "@/lib/types";

/**
 * Licence-certificate PDF generator (Phase 2).
 *
 * A dependency-free, single-page A4 document using PDF core fonts
 * (Helvetica / Helvetica-Bold, WinAnsi) — the official, English legal receipt
 * a buyer can hand to a print house or client. Includes an HMAC verification
 * code so staff can detect forged certificates.
 */

export interface CertificateData {
  entitlement: Entitlement;
  patternTitleEn: string;
  patternSku: string;
  artistNameEn: string;
  files: PublicFileMeta[];
}

const TIER_TERMS: Record<LicenseTier, string[]> = {
  personal: [
    "Use the design in personal, non-commercial projects only.",
    "No resale of the file itself; no prints or products offered for sale.",
    "Credit to the artist is appreciated but not required.",
  ],
  commercial: [
    "Includes every right of the Personal licence.",
    "Use on physical goods for sale (wallpaper, fabric, decor) up to 3000 units.",
    "The file may be delivered to one manufacturer/print house for production.",
    "The artwork file itself may not be resold, shared or sub-licensed.",
  ],
  exclusive: [
    "Full exclusive rights transfer for this design to the licensee.",
    "The design is removed from the Rosie Atelier shop permanently.",
    "The licensor will not license the design to any third party after this date.",
    "Includes source files (vector / layered) where supplied by the artist.",
  ],
};

function hmacKey(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "rosie-cert-dev";
}

export function certificateCode(ent: Entitlement): string {
  const raw = crypto
    .createHmac("sha256", hmacKey())
    .update(`${ent.id}:${ent.orderId}:${ent.patternId}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/* ─── minimal PDF writer ─────────────────────────────────────────── */

function esc(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

interface Canvas {
  parts: string[];
}

function text(c: Canvas, x: number, y: number, size: number, s: string, bold = false, gray?: number) {
  const font = bold ? "F1" : "F2";
  const g = gray !== undefined ? `${gray.toFixed(2)} g` : "0 g";
  c.parts.push(`BT ${g} /${font} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${esc(s)}) Tj ET`);
}

function line(c: Canvas, x1: number, y1: number, x2: number, y2: number, gray = 0.75) {
  c.parts.push(`${gray} G 0.6 w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
}

function buildPdf(stream: string): Buffer {
  const objects: string[] = [];
  // xref offsets need byte-exact lengths; keep everything ASCII.
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`;
  objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  objects[5] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[6] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

/* ─── the certificate ─────────────────────────────────────────────── */

export function generateCertificatePdf(data: CertificateData): Buffer {
  const { entitlement: ent } = data;
  const c: Canvas = { parts: [] };
  const code = certificateCode(ent);
  const L = 62; // left margin
  const R = 595 - 62; // right margin

  // Header band
  c.parts.push(`0:0:0 rg 0 758 595 84 re f`.replace("0:0:0 rg", "0.17 0.16 0.15 rg"));
  text(c, L, 800, 20, "ROSIE ATELIER", true, 1);
  text(c, L, 778, 11.5, "Digital Design Licence Certificate", false, 0.85);
  text(c, R - 190, 800, 9, "VERIFIED DOCUMENT", true, 0.75);
  text(c, R - 190, 786, 10, code, false, 0.9);

  let y = 726;
  text(c, L, y, 15, `Licence Agreement ${ent.id.toUpperCase()}`, true);
  y -= 16;
  text(c, L, y, 9, `Issued ${new Date(ent.createdAt).toISOString().slice(0, 10)} UTC by Rosie Atelier (rozlai.art)`, false, 0.42);

  const row = (label: string, value: string, boldValue = false) => {
    y -= 26;
    text(c, L, y, 8.5, label.toUpperCase(), false, 0.5);
    y -= 13.5;
    text(c, L, y, 11.5, value, boldValue);
    line(c, L, y - 7, R, y - 7);
    y -= 2;
  };

  row("Order", ent.orderId);
  row("Design", `${data.patternTitleEn}  (SKU ${data.patternSku})`, true);
  row("Artist / Licensor", data.artistNameEn);
  row("Licensee", ent.email, true);
  const tierLabel =
    ent.license === "exclusive" ? "EXCLUSIVE (rights transfer)" : ent.license === "commercial" ? "COMMERCIAL" : "PERSONAL";
  row("Licence type", tierLabel, true);
  row("Validity", "Perpetual from issue date; file delivery window 90 days, 10 downloads per file.");
  row("Payments reference", `Order settled in full. Payment gateway receipt retained.`, false);

  // Files
  y -= 22;
  text(c, L, y, 8.5, "DELIVERED MASTER FILES", false, 0.5);
  y -= 14;
  for (const f of data.files) {
    const mb = (f.size / (1024 * 1024)).toFixed(1);
    text(c, L, y, 10, `- ${f.filename}  (${f.ext.toUpperCase()}, ${mb} MB)`);
    y -= 13;
  }
  if (data.files.length === 0) {
    text(c, L, y, 10, "- per artist delivery", false, 0.4);
    y -= 13;
  }

  // Terms
  y -= 14;
  text(c, L, y, 8.5, "LICENCE TERMS", false, 0.5);
  y -= 14;
  for (const term of TIER_TERMS[ent.license]) {
    text(c, L, y, 9.5, `\u2022 ${term}`, false, 0.15);
    y -= 13.5;
  }
  y -= 8;
  text(c, L, y, 9.5, `- This certificate is valid only together with order ${ent.orderId}.`, false, 0.15);
  y -= 13.5;
  text(c, L, y, 9.5, `- Verify authenticity at rozlai.art — code ${code}.`, false, 0.15);

  // Footer
  line(c, L, 96, R, 96, 0.8);
  text(c, L, 80, 9, "ROSIE ATELIER - Premium patterns, wallpaper, fabric & decor", true, 0.3);
  text(c, L, 66, 8.5, "Generated electronically. No signature required.", false, 0.5);

  return buildPdf(c.parts.join("\n"));
}
