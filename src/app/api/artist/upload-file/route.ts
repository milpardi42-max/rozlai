import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { getContent } from "@/lib/data/store";
import { addFile, listFiles, storeBinary, storageBackendLabel } from "@/lib/files/storage";
import { MAX_MASTER_BYTES, detectMasterExt, reconcileExt, type DeliverableFile } from "@/lib/files/types";
import { checkSeamless } from "@/lib/files/seamless";
import type { LicenseTier } from "@/lib/types";

export const dynamic = "force-dynamic";
/** Node runtime required for crypto/stream/private FS access. */
export const runtime = "nodejs";
/** Allow big request bodies to be handled by the Node server (dev/VPS). */
export const maxDuration = 300;

const LICENSES: LicenseTier[] = ["personal", "commercial", "exclusive"];

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/**
 * GET /api/artist/upload-file — list the uploader's master files
 * (admin sees everything). Never includes storage keys or URLs.
 */
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) return unauthorized();

  const files = await listFiles();
  const visible = (
    session.role === "admin"
      ? files
      : files.filter((f) => (session.artistId ? f.artistId === session.artistId : f.ownerUserId === session.id))
  ).map(({ storageKey: _k, ...rest }) => rest);

  return NextResponse.json({ ok: true, backend: storageBackendLabel(), files: visible }, withNoStore());
}

/**
 * POST /api/artist/upload-file — upload a master deliverable.
 * multipart/form-data fields: file, patternId, tier (personal|commercial|exclusive), label?
 * The file lands in private storage with status "pending" and only becomes
 * downloadable (or sellable) after an admin approves it via /api/admin/files.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) return unauthorized();

  // Rate limit: 20 uploads / 5 min / IP (shared buckets with preview uploads)
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
  const patternId = String(formData.get("patternId") ?? "");
  const tier = String(formData.get("tier") ?? "") as LicenseTier;
  const labelRaw = String(formData.get("label") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, withNoStore({ status: 400 }));
  }
  if (!LICENSES.includes(tier)) {
    return NextResponse.json({ ok: false, error: "invalid_tier" }, withNoStore({ status: 400 }));
  }
  if (file.size > MAX_MASTER_BYTES) {
    return NextResponse.json(
      { ok: false, error: "file_too_large", maxBytes: MAX_MASTER_BYTES },
      withNoStore({ status: 413 }),
    );
  }

  // The pattern must exist and belong to this artist (admin may attach anywhere)
  const content = await getContent();
  const pattern = content.patterns.find((p) => p.id === patternId);
  if (!pattern) {
    return NextResponse.json({ ok: false, error: "pattern_not_found" }, withNoStore({ status: 404 }));
  }
  if (session.role !== "admin" && pattern.artistId !== session.artistId) {
    return NextResponse.json({ ok: false, error: "not_your_pattern" }, withNoStore({ status: 403 }));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const declaredExt = (file.name.split(".").pop() ?? "").toLowerCase();
  const detected = detectMasterExt(buffer);
  const ext = reconcileExt(detected, declaredExt);
  if (!ext) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_file_data",
        detail: "Detected content does not match an allowed master format (zip/tif/psd/ai/eps/pdf/png/jpg/svg).",
      },
      withNoStore({ status: 415 }),
    );
  }

  try {
    const { storageKey, backend, sha256 } = await storeBinary(buffer, ext);

    // Phase 3 — probe the seamless repeat on upload (rasters only).
    const seam = ext === "tif" || ext === "png" || ext === "jpg" ? await checkSeamless(buffer) : null;

    const record: DeliverableFile = {
      id: `fil_${crypto.randomBytes(8).toString("hex")}`,
      ownerUserId: session.id,
      artistId: pattern.artistId ?? (session.artistId ?? null),
      patternId: pattern.id,
      tier,
      label: labelRaw || file.name,
      filename: file.name,
      ext,
      size: buffer.byteLength,
      sha256,
      storageKey,
      backend,
      status: "pending",
      seam,
      createdAt: new Date().toISOString(),
    };
    await addFile(record);

    const { storageKey: _k, ...publicRecord } = record;
    return NextResponse.json({ ok: true, file: publicRecord }, withNoStore());
  } catch (e) {
    console.error("[artist/upload-file] storage error:", e);
    return NextResponse.json({ ok: false, error: "storage_error" }, withNoStore({ status: 502 }));
  }
}
