import "server-only";
import sharp from "sharp";

/**
 * Server-side preview watermarking (Phase 2).
 *
 * Public previews of DIGITAL patterns must never expose the raw pixels:
 * a tiled, diagonal «Rosie Atelier» overlay is baked into every image shown
 * on the PDP. Two delivery paths:
 *
 *   1. Baked at upload — /api/artist/upload also stores a `-w.webp` derivative.
 *   2. On-demand proxy — GET /api/wmimg?src=/images/… re-encodes any local
 *      public image with the overlay, cached to disk (seed images, older uploads).
 *
 * Remote URLs (e.g. Cloudinary) are passed through untouched — use the CDN's
 * native text-overlay transformation there (Phase 3 note).
 */

export interface WatermarkOptions {
  /** Overlay text, brand by default */
  text?: string;
  /** Tile relative to image diagonal; 2.2 ≈ sparse, 4 ≈ dense */
  density?: number;
}

const BRAND = "Rosie Atelier";

/** Build the repeating SVG tile for a given image size. */
function tileSvg(width: number, height: number, text: string, density: number): string {
  // Tile size scales with the image so the pattern reads at any resolution.
  const tile = Math.max(220, Math.round(Math.hypot(width, height) / density));
  const fs = Math.max(14, Math.round(tile / 14));
  const cols = Math.ceil(width / tile) + 1;
  const rows = Math.ceil(height / tile) + 1;

  let texts = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tile + (r % 2 ? tile / 2 : 0) + tile / 2;
      const y = r * tile + tile / 2;
      texts += `<text x="${x}" y="${y}" transform="rotate(-30 ${x} ${y})" font-family="DejaVu Sans, sans-serif" font-size="${fs}" font-weight="600" fill="rgba(255,255,255,0.26)" stroke="rgba(0,0,0,0.10)" stroke-width="0.6" text-anchor="middle">${escapeXml(text)}</text>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${texts}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Bake the watermark into `input` and return WebP bytes.
 * On any sharp/pipeline failure the ORIGINAL bytes are returned (callers treat
 * a null/identical result as "no watermark available" — fail-open for uptime).
 */
export async function watermarkBuffer(input: Buffer, opts: WatermarkOptions = {}): Promise<Buffer | null> {
  try {
    const img = sharp(input);
    const meta = await img.metadata().catch(() => null);
    const width = meta?.width ?? 0;
    const height = meta?.height ?? 0;
    // Tiny thumbnails aren't worth watermarking.
    if (!width || !height || width < 320 || height < 240) return null;

    const svg = Buffer.from(tileSvg(width, height, opts.text ?? BRAND, opts.density ?? 2.4));
    const out = await img
      .composite([{ input: svg, top: 0, left: 0 }])
      .webp({ quality: 82 })
      .toBuffer();
    // Bizarre edge: composite on corrupt input can return empty
    return out.length > 0 ? out : null;
  } catch (e) {
    console.warn("[watermark] bake failed — serving original:", (e as Error)?.message);
    return null;
  }
}

/**
 * Map a public preview URL to its watermarked variant. Local paths go through
 * the proxy; remote CDN URLs pass through (already-unique-uploaded images).
 */
export function wmSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith("/images/")) return `/api/wmimg?src=${encodeURIComponent(src)}`;
  // runtime uploads are served via /api/pub/<file> (standalone builds don't
  // expose new /public files) — proxy those through the watermark too.
  if (src.startsWith("/api/pub/")) return `/api/wmimg?src=${encodeURIComponent(src)}`;
  return src;
}
