/**
 * Digital deliverable ("master") files — the private binaries buyers download
 * after purchasing a licence. Distinct from public preview images, which go
 * through /api/artist/upload.
 */
import type { ID, LicenseTier } from "@/lib/types";

export type MasterFileStatus = "pending" | "approved" | "rejected";
export type StorageBackend = "local" | "s3";

export interface DeliverableFile {
  id: ID;
  /** Session user id of the uploader (artist or admin) */
  ownerUserId: string;
  /** Artist profile id the file belongs to (null → site-owned) */
  artistId: ID | null;
  patternId: ID;
  tier: LicenseTier;
  /** Human label shown to buyers, e.g. «فایل ماستر TIFF بی‌درز» */
  label: string;
  filename: string;
  ext: string;
  size: number;
  sha256: string;
  /** Private storage key, e.g. "files/<sha16>.<ext>" — never public */
  storageKey: string;
  backend: StorageBackend;
  status: MasterFileStatus;
  /** Moderator note (reason for rejection, etc.) */
  note?: string;
  /**
   * Phase 3 — automatic seamless-repeat probe (rasters only).
   * null/absent for vectors and archives (design-time check).
   */
  seam?: {
    seamless: boolean;
    ratioX: number;
    ratioY: number;
    score: number;
    checkedAt: string;
  } | null;
  createdAt: string;
}

/** Buyer-safe subset — never contains storageKey / URLs. */
export interface PublicFileMeta {
  id: ID;
  tier: LicenseTier;
  label: string;
  filename: string;
  ext: string;
  size: number;
}

export function toPublicMeta(f: DeliverableFile): PublicFileMeta {
  return { id: f.id, tier: f.tier, label: f.label, filename: f.filename, ext: f.ext, size: f.size };
}

/* ─── Allowed formats ─────────────────────────────────────────────── */

/**
 * Upload accept-list for master files (Phase 1).
 * These are the professional surface-pattern deliverables agreed for the
 * marketplace: print masters (TIFF/PSD/AI/EPS/PDF), web tiles (PNG/JPG/SVG),
 * and a ZIP container for full packages.
 */
export const MASTER_EXTENSIONS = [
  "zip", "tif", "tiff", "psd", "psb", "ai", "eps", "pdf", "png", "jpg", "jpeg", "svg",
] as const;

export type MasterExt = (typeof MASTER_EXTENSIONS)[number];

const MIME_BY_EXT: Record<string, string> = {
  zip: "application/zip",
  tif: "image/tiff",
  tiff: "image/tiff",
  psd: "image/vnd.adobe.photoshop",
  psb: "image/vnd.adobe.photoshop",
  ai: "application/pdf", // modern .ai = PDF container
  eps: "application/postscript",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

/**
 * Sniff the real format from magic bytes. Returns the canonical extension or
 * null when the payload doesn't match anything we accept.
 */
export function detectMasterExt(buf: Buffer): MasterExt | null {
  if (buf.length < 4) return null;
  // ZIP: 50 4B 03 04 | 50 4B 05 06 (empty archive) | 50 4B 07 08 (spanned)
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) return "zip";
  // TIFF little-endian: 49 49 2A 00  / big-endian: 4D 4D 00 2A
  if (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) return "tif";
  if (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a) return "tif";
  // PSD/PSB: "8BPS"
  if (buf[0] === 0x38 && buf[1] === 0x42 && buf[2] === 0x50 && buf[3] === 0x53) return "psd";
  // PDF / modern AI: "%PDF-"
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  // EPS: "%!PS" (PostScript)
  if (buf[0] === 0x25 && buf[1] === 0x21 && buf[2] === 0x50 && buf[3] === 0x53) return "eps";
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // SVG: scan the first 512 bytes of text for "<svg"
  const head = buf.subarray(0, Math.min(buf.length, 512)).toString("utf8");
  if (/<svg[\s>]/i.test(head)) return "svg";
  return null;
}

/**
 * Reconcile detected vs declared extension. Modern `.ai` files are PDF
 * containers, `.psb` shares the PSD signature, and jpg/jpeg + tif/tiff
 * collapse. Anything else must match exactly — spoofed payloads are rejected.
 */
export function reconcileExt(detected: MasterExt | null, declaredRaw: string): MasterExt | null {
  const declared = declaredRaw.toLowerCase();
  if (declared === "jpeg") return detected === "jpg" ? "jpg" : null;
  if (declared === "tiff") return detected === "tif" ? "tif" : null;
  if (declared === "ai") return detected === "pdf" ? "ai" : null;
  if (declared === "psb") return detected === "psd" ? "psb" : null;
  if ((MASTER_EXTENSIONS as readonly string[]).includes(declared)) {
    return detected === declared ? (declared as MasterExt) : null;
  }
  return null;
}

/** 200 MB — generous for print-resolution TIFF/PSB; use S3/R2 for real scale. */
export const MAX_MASTER_BYTES = 200 * 1024 * 1024;

export const MASTER_ACCEPT_ATTR = MASTER_EXTENSIONS.map((e) => `.${e}`).join(",");
