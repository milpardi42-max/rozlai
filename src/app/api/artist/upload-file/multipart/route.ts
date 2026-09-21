import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent } from "@/lib/data/store";
import { addFile, storageBackendLabel } from "@/lib/files/storage";
import { beginMultipart, continueMultipart, completeMultipart, abortMultipart } from "@/lib/files/s3-multipart";
import { MASTER_EXTENSIONS, type DeliverableFile } from "@/lib/files/types";
import type { LicenseTier } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const LICENSES: LicenseTier[] = ["personal", "commercial", "exclusive"];

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/**
 * Multipart lifecycle for master files too large for a single request body
 * (> MAX_MASTER_BYTES, tier archives up to multi-GB). Three JSON actions:
 *   begin    — { action:"begin",   ext, size }                       → uploadId + presigned part URLs
 *   urls     — { action:"urls",    uploadId, key, size, page }       → next page of part URLs
 *   complete — { action:"complete", uploadId, key, size, patternId, tier, label?, parts[] } → registry record
 *   abort    — { action:"abort",   uploadId, key }                   → best-effort cleanup
 * All S3-signed work stays server-side; the browser only PUTs part bytes.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) return unauthorized();
  if (storageBackendLabel() !== "s3") {
    return NextResponse.json(
      { ok: false, error: "multipart_requires_s3", backend: storageBackendLabel() },
      withNoStore({ status: 400 }),
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, withNoStore({ status: 400 }));
  }
  const action = String(body.action ?? "");

  const ext = String(body.ext ?? "").toLowerCase();
  const size = Number(body.size);

  if (action === "begin") {
    if (!(MASTER_EXTENSIONS as readonly string[]).includes(ext)) {
      return NextResponse.json({ ok: false, error: "ext_not_allowed" }, withNoStore({ status: 415 }));
    }
    if (!Number.isFinite(size) || size <= 0 || size > 5 * 1024 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "bad_size" }, withNoStore({ status: 400 }));
    }
    const result = await beginMultipart(ext, size, 0);
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, withNoStore({ status: 502 }));
    }
    return NextResponse.json({ ok: true, ...result }, withNoStore());
  }

  if (action === "urls") {
    const page = Number(body.page) || 0;
    const result = await continueMultipart(String(body.key ?? ""), String(body.uploadId ?? ""), size, page);
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, withNoStore({ status: 400 }));
    }
    return NextResponse.json({ ok: true, ...result }, withNoStore());
  }

  if (action === "abort") {
    const ok = await abortMultipart(String(body.key ?? ""), String(body.uploadId ?? ""));
    return NextResponse.json({ ok }, withNoStore());
  }

  if (action === "complete") {
    const patternId = String(body.patternId ?? "");
    const tier = String(body.tier ?? "") as LicenseTier;
    const labelRaw = String(body.label ?? "").trim();
    const filename = String(body.filename ?? "").trim() || `${String(body.key).split("/").pop()}`;
    const parts = Array.isArray(body.parts) ? (body.parts as { partNumber: number; etag: string }[]) : [];

    if (!LICENSES.includes(tier)) {
      return NextResponse.json({ ok: false, error: "invalid_tier" }, withNoStore({ status: 400 }));
    }
    const content = await getContent();
    const pattern = content.patterns.find((p) => p.id === patternId);
    if (!pattern) {
      return NextResponse.json({ ok: false, error: "pattern_not_found" }, withNoStore({ status: 404 }));
    }
    if (session.role !== "admin" && pattern.artistId !== session.artistId) {
      return NextResponse.json({ ok: false, error: "not_your_pattern" }, withNoStore({ status: 403 }));
    }

    // Quota gating happens at pattern/product creation (Phase 5); this attaches
    // to an existing pattern so nothing extra is charged against the plan.
    const done = await completeMultipart(String(body.key ?? ""), String(body.uploadId ?? ""), parts);
    if ("error" in done) {
      return NextResponse.json({ ok: false, error: done.error }, withNoStore({ status: 502 }));
    }

    const record: DeliverableFile = {
      id: `fil_${crypto.randomBytes(8).toString("hex")}`,
      ownerUserId: session.id,
      artistId: pattern.artistId ?? session.artistId ?? null,
      patternId: pattern.id,
      tier,
      label: labelRaw || filename,
      filename,
      ext,
      size: Number.isFinite(size) ? size : 0,
      sha256: "", // multipart etags don't give us a single-file hash; hash on first download if needed
      storageKey: String(body.key ?? ""),
      backend: "s3",
      status: "pending",
      seam: null, // too large to probe server-side at upload time; probed on preview upload instead
      createdAt: new Date().toISOString(),
    };
    await addFile(record);
    const { storageKey: _k, ...pub } = record;
    return NextResponse.json({ ok: true, file: pub }, withNoStore());
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, withNoStore({ status: 400 }));
}
