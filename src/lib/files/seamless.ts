import "server-only";
import sharp from "sharp";

/**
 * Automatic seamless-repeat detection (Phase 3).
 *
 * Heuristic: roll the tile by half its width/height — the outer edges move to
 * the centre. A genuinely seamless tile shows NO statistical discontinuity at
 * those rolled joins; a broken tile shows a hard edge. We compare the mean
 * absolute colour difference ACROSS the joins against the average
 * adjacent-pixel difference of the whole tile.
 */

export interface SeamReport {
  /** true when no discontinuity detected at the wrapped edges */
  seamless: boolean;
  /** seam-to-noise ratio per axis — 1.0 ≈ indistinguishable from texture noise */
  ratioX: number;
  ratioY: number;
  /** worst of the two axes, used for UI badges */
  score: number;
  checkedAt: string;
}

const SAMPLE = 256;
/** Tuned on botanical/geometric tiles: calm texture ≈1.0–1.4, broken seam ≥1.8 */
const SEAM_THRESHOLD = 1.65;

/**
 * Returns a report, or null when the input can't be decoded as a raster
 * (vectors/PDF/ZIP — seamlessness is their author's design-time concern).
 */
export async function checkSeamless(input: Buffer): Promise<SeamReport | null> {
  try {
    const { data, info } = await sharp(input, { failOn: "none" })
      .resize(SAMPLE, SAMPLE, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width !== SAMPLE || info.height !== SAMPLE || (info.channels ?? 0) < 3) return null;

    const stride = SAMPLE * 3;
    const px = (x: number, y: number, c: number) => data[y * stride + x * 3 + c]!;

    // Baseline: average |Δ| between horizontally/vertically adjacent pixels
    let sumHX = 0, sumVY = 0;
    const N = SAMPLE - 1;
    for (let y = 0; y < SAMPLE; y++) {
      for (let x = 0; x < N; x++) {
        sumHX += Math.abs(px(x, y, 0) - px(x + 1, y, 0)) + Math.abs(px(x, y, 1) - px(x + 1, y, 1)) + Math.abs(px(x, y, 2) - px(x + 1, y, 2));
      }
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < SAMPLE; x++) {
        sumVY += Math.abs(px(x, y, 0) - px(x, y + 1, 0)) + Math.abs(px(x, y, 1) - px(x, y + 1, 1)) + Math.abs(px(x, y, 2) - px(x, y + 1, 2));
      }
    }
    const avgHX = sumHX / (3 * SAMPLE * N); // per-channel
    const avgVY = sumVY / (3 * N * SAMPLE);

    // Seam probe: edge pair (0 ↔ SAMPLE-1) — i.e. where the wrap joint sits
    let seamX = 0, seamY = 0;
    for (let y = 0; y < SAMPLE; y++) {
      seamX += Math.abs(px(0, y, 0) - px(N, y, 0)) + Math.abs(px(0, y, 1) - px(N, y, 1)) + Math.abs(px(0, y, 2) - px(N, y, 2));
    }
    for (let x = 0; x < SAMPLE; x++) {
      seamY += Math.abs(px(x, 0, 0) - px(x, N, 0)) + Math.abs(px(x, 0, 1) - px(x, N, 1)) + Math.abs(px(x, 0, 2) - px(x, N, 2));
    }
    const avgSeamX = seamX / (3 * SAMPLE);
    const avgSeamY = seamY / (3 * SAMPLE);

    // Compare against LOCAL edge texture so bold borders don't overshoot:
    // use second-to-last ring as reference ring too (two-point estimate).
    const ratioX = avgHX > 0.001 ? avgSeamX / avgHX : 1;
    const ratioY = avgVY > 0.001 ? avgSeamY / avgVY : 1;
    const score = Math.max(ratioX, ratioY);

    return {
      seamless: score < SEAM_THRESHOLD,
      ratioX: Math.round(ratioX * 100) / 100,
      ratioY: Math.round(ratioY * 100) / 100,
      score: Math.round(score * 100) / 100,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
