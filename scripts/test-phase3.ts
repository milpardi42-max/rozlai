/**
 * Phase-3 verification harness (run: `npx tsx scripts/test-phase3.ts`).
 * Builds synthetic tiles:
 *   A) genuinely seamless — diagonal stripes wrapped by construction
 *   B) broken seam — two random halves that clearly don't match
 * then runs checkSeamless on both (expects A seamless, B not) and renders the
 * four Phase-3 mockups for A, saving them to /tmp for eyeballing.
 */
import { promises as fs } from "fs";
import sharp from "sharp";
import { checkSeamless } from "../src/lib/files/seamless";
import { generateMockups } from "../src/lib/files/mockups";

const W = 384;

async function seamlessTile(): Promise<Buffer> {
  // stripe pattern periodic over W → wrap is seamless by construction
  const raw = Buffer.alloc(W * W * 3);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const v = Math.floor(((x + y) % 48) / 48 * 255);
      const g = Math.floor(((2 * x + y) % 96) / 96 * 200) + 30;
      const o = (y * W + x) * 3;
      raw[o] = (v + 40) % 256;
      raw[o + 1] = g;
      raw[o + 2] = 220 - (v / 4) | 0;
    }
  }
  return sharp(raw, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer();
}

async function brokenTile(): Promise<Buffer> {
  const raw = Buffer.alloc(W * W * 3);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      if (x < W / 2) {
        raw[o] = 30; raw[o + 1] = 30; raw[o + 2] = 30; // dark left half → hard edge at wrap
      } else {
        raw[o] = 200; raw[o + 1] = 60 + ((x * 7 + y * 13) % 60); raw[o + 2] = 90;
      }
    }
  }
  return sharp(raw, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer();
}

async function main() {
  const a = await seamlessTile();
  const b = await brokenTile();

  const repA = await checkSeamless(a);
  const repB = await checkSeamless(b);
  console.log("seamless tile →", JSON.stringify(repA));
  console.log("broken tile   →", JSON.stringify(repB));

  const passSeam = repA?.seamless === true && repB?.seamless === false;
  console.log(passSeam ? "SEAM PROBE ✓ thresholds behave" : "SEAM PROBE ✗ UNEXPECTED RESULT");

  const mocks = await generateMockups(a, { watermark: true });
  console.log("mockups →", mocks.map((m) => `${m.kind}:${m.width}x${m.height}:${m.buffer.length}B`).join("  "));
  await fs.mkdir("/tmp/phase3-mockups", { recursive: true });
  for (const m of mocks) await fs.writeFile(`/tmp/phase3-mockups/${m.kind}.webp`, m.buffer);
  await fs.writeFile("/tmp/phase3-mockups/source-a.png", a);
  console.log("saved to /tmp/phase3-mockups/");

  if (!passSeam) process.exit(1);
}

void main();
