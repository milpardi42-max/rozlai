import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { generateMockups, type MockupKind } from "@/lib/files/mockups";
import { checkSeamless } from "@/lib/files/seamless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 8 * 1024 * 1024;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

async function storeLocal(buffer: Buffer, filename: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "images", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/api/pub/${filename}`;
}

/**
 * POST /api/artist/mockups — multipart `file` = one pattern tile (jpg/png/webp/avif).
 * Returns 4 watermarked preview renders: tile / 3×3 repeat / wall / fabric.
 * Local-storage backend only in Phase 3 (Cloudinary/Blob for uploads stay on
 * the preview-upload route; a CDN pipeline for mockups is a Phase-4 item).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) return unauthorized();

  const rlKey = `upload:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    const retryAfter = retryAfterSeconds(rlKey);
    const res = NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form_data" }, withNoStore({ status: 400 }));
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, withNoStore({ status: 400 }));
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large", maxBytes: MAX_BYTES }, withNoStore({ status: 413 }));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // cheap sniff: must at least look like an image family
  const head = buffer.subarray(0, 4).toString("hex");
  const isImage =
    head.startsWith("ffd8ff") || head === "89504e47" || head.startsWith("52494646") || buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (!isImage) {
    return NextResponse.json({ ok: false, error: "invalid_image_data" }, withNoStore({ status: 415 }));
  }

  try {
    const assets = await generateMockups(buffer, { watermark: true });
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 12);
    const mockups: Partial<Record<MockupKind, string>> = {};
    for (const a of assets) {
      mockups[a.kind] = await storeLocal(a.buffer, `${hash}-mock-${a.kind}.webp`);
    }
    const seam = await checkSeamless(buffer);
    return NextResponse.json({ ok: true, mockups, seam }, withNoStore());
  } catch (e) {
    console.error("[artist/mockups] failed:", e);
    return NextResponse.json({ ok: false, error: "render_failed" }, withNoStore({ status: 502 }));
  }
}
