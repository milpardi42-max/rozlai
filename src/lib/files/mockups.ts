import "server-only";
import sharp from "sharp";
import { watermarkBuffer } from "@/lib/files/watermark";

/**
 * Automatic mockup generator (Phase 3).
 * Turns one pattern tile into presentable previews:
 *   - tile    — normalized 512px tile
 *   - repeat  — 3×3 seamless repeat demonstration
 *   - wall    — wallpaper install preview (lighting gradient + baseboard)
 *   - fabric  — fabric preview with soft wave shading
 * All outputs are WebP and watermarked (public previews must not leak clean pixels).
 */

export type MockupKind = "tile" | "repeat" | "wall" | "fabric";
export interface MockupAsset {
  kind: MockupKind;
  buffer: Buffer;
  width: number;
  height: number;
  ext: "webp";
}

function svgTiled(dataUri: string, tileW: number, tileH: number, totalW: number, totalH: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}">
  <defs>
    <pattern id="pat" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse">
      <image href="${dataUri}" xlink:href="${dataUri}" width="${tileW}" height="${tileH}" preserveAspectRatio="none"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#pat)"/>
</svg>`;
}

/** Normalize any input raster to a square tile (max `size` px). */
async function normalizedTile(input: Buffer, size: number): Promise<{ webp: Buffer; png: Buffer; width: number; height: number }> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const w = meta.width ?? 0, h = meta.height ?? 0;
  if (!w || !h) throw new Error("undecodable_image");
  const scale = size / Math.max(w, h);
  const pipe = sharp(input, { failOn: "none" }).resize(Math.round(w * scale), Math.round(h * scale), { fit: "fill" });
  const [webp, png] = await Promise.all([
    pipe.clone().webp({ quality: 88 }).toBuffer(),
    // librsvg can't decode WebP inside SVG <image> — embed PNG data-URIs
    pipe.clone().png({ compressionLevel: 9 }).toBuffer(),
  ]);
  return { webp, png, width: Math.round(w * scale), height: Math.round(h * scale) };
}

export async function generateMockups(input: Buffer, opts: { watermark?: boolean } = {}): Promise<MockupAsset[]> {
  const wm = opts.watermark !== false;
  const out: MockupAsset[] = [];

  const tile = await normalizedTile(input, 512);
  const tileUri = `data:image/png;base64,${tile.png.toString("base64")}`;

  /* 1 — tile preview (512, watermarked like every preview) */
  {
    const b = wm ? ((await watermarkBuffer(tile.webp)) ?? tile.webp) : tile.webp;
    out.push({ kind: "tile", buffer: b, width: tile.width, height: tile.height, ext: "webp" });
  }

  /* 2 — 3×3 repeat demo (1020²) */
  {
    const W = 1020, cell = W / 3;
    const svg = svgTiled(tileUri, cell, cell * (tile.height / tile.width), W, W);
    const raster = await sharp(Buffer.from(svg)).webp({ quality: 86 }).toBuffer();
    const b = wm ? ((await watermarkBuffer(raster)) ?? raster) : raster;
    out.push({ kind: "repeat", buffer: b, width: W, height: W, ext: "webp" });
  }

  /* 3 — wall preview (1600×1100): wallpaper + lighting gradient + baseboard */
  {
    const W = 1600, H = 1100, base = 64;
    const wallH = H - base;
    const tileHpx = 420; // ~40cm repeat for a wallpaper feel
    const tileWpx = tileHpx * (tile.width / tile.height);
    const paper = svgTiled(tileUri, tileWpx, tileHpx, W, wallH);
    const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="light" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.16"/>
          <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.12"/>
        </linearGradient>
        <linearGradient id="shad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.30"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${wallH}" fill="url(#light)"/>
      <rect x="0" y="${wallH - 10}" width="${W}" height="10" fill="url(#shad)"/>
      <rect x="0" y="${wallH}" width="${W}" height="${base}" fill="#f3efe6"/>
      <rect x="0" y="${wallH}" width="${W}" height="3" fill="#000" opacity="0.12"/>
      <rect x="0" y="${wallH + 3}" width="${W}" height="3" fill="#fff" opacity="0.5"/>
    </svg>`;
    const paperRaster = await sharp(Buffer.from(paper)).toBuffer();
    // extend the paper to full height FIRST so the (W×H) overlay matches exactly
    const composed = await sharp(paperRaster)
      .extend({ bottom: base, background: "#f3efe6" })
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
      .webp({ quality: 86 })
      .toBuffer();
    const b = wm ? ((await watermarkBuffer(composed)) ?? composed) : composed;
    out.push({ kind: "wall", buffer: b, width: W, height: H, ext: "webp" });
  }

  /* 4 — fabric preview (1200²): tile + soft wave shading in raw pixels */
  {
    const W = 1200, H = 1200, tilePx = 300;
    const svg = svgTiled(tileUri, tilePx, tilePx * (tile.height / tile.width), W, H);
    const { data, info } = await sharp(Buffer.from(svg))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const stride = info.width * 3;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        // two crossing soft folds + a gentle vignette
        const wave =
          0.86 +
          0.10 * Math.sin(x / 64 + Math.sin(y / 200) * 2.2) +
          0.06 * Math.sin((x + y) / 210);
        const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
        const vig = 1 - 0.10 * (dx * dx + dy * dy) * 0.7;
        const m = Math.max(0.55, Math.min(1.08, wave * vig));
        const o = y * stride + x * 3;
        data[o] = Math.min(255, Math.round(data[o]! * m));
        data[o + 1] = Math.min(255, Math.round(data[o + 1]! * m));
        data[o + 2] = Math.min(255, Math.round(data[o + 2]! * m));
      }
    }
    const raster = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
      .webp({ quality: 86 })
      .toBuffer();
    const b = wm ? ((await watermarkBuffer(raster)) ?? raster) : raster;
    out.push({ kind: "fabric", buffer: b, width: W, height: H, ext: "webp" });
  }

  return out;
}
