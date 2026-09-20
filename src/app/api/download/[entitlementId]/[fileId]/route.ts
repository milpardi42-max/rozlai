import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { getEntitlement, recordDownload, downloadCountFor } from "@/lib/data/entitlements";
import { getFile, openLocalStream, presignDownload } from "@/lib/files/storage";
import { mimeForExt } from "@/lib/files/types";
import { LICENSE_COVERAGE } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ entitlementId: string; fileId: string }> };

/**
 * GET /api/download/[entitlementId]/[fileId]
 * The ONLY way master bytes leave the server:
 *   1. signed-in owner of a valid, unexpired entitlement
 *   2. file belongs to the purchased pattern, is licence-covered, approved
 *   3. per-file download cap not exhausted
 * Then: S3 → 302 to a 5-minute presigned URL · local → streamed bytes.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { entitlementId, fileId } = await ctx.params;
  const ip = clientIp(req);

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }

  // Rate limit: 60 download hits / 5 min / IP
  const rlKey = `download:${ip}`;
  if (tooManyAttempts(rlKey)) {
    const retryAfter = retryAfterSeconds(rlKey);
    const res = NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  const [ent, file] = await Promise.all([getEntitlement(entitlementId), getFile(fileId)]);
  if (!ent || !file) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }

  // 1 — ownership
  const ownsIt = ent.userId === session.id || ent.email === session.email.toLowerCase() || session.role === "admin";
  if (!ownsIt) {
    return NextResponse.json({ ok: false, error: "forbidden" }, withNoStore({ status: 403 }));
  }

  // 2 — still valid, right pattern, licence coverage, moderated
  if (Date.parse(ent.expiresAt) <= Date.now()) {
    return NextResponse.json({ ok: false, error: "entitlement_expired" }, withNoStore({ status: 410 }));
  }
  if (file.patternId !== ent.patternId) {
    return NextResponse.json({ ok: false, error: "wrong_pattern" }, withNoStore({ status: 409 }));
  }
  if (!LICENSE_COVERAGE[ent.license].includes(file.tier)) {
    return NextResponse.json({ ok: false, error: "tier_not_covered" }, withNoStore({ status: 403 }));
  }
  if (file.status !== "approved") {
    return NextResponse.json({ ok: false, error: "file_not_approved" }, withNoStore({ status: 409 }));
  }

  // 3 — per-file cap
  if (downloadCountFor(ent, file.id) >= ent.maxDownloads) {
    return NextResponse.json({ ok: false, error: "download_cap_reached" }, withNoStore({ status: 429 }));
  }

  // Count first — a crash after this point burns one download, never leaks free ones.
  await recordDownload(ent.id, file.id, ip);

  if (file.backend === "s3") {
    const url = presignDownload(file.storageKey, file.filename);
    if (!url) {
      return NextResponse.json({ ok: false, error: "storage_misconfigured" }, withNoStore({ status: 502 }));
    }
    return NextResponse.redirect(url, { status: 302 });
  }

  const opened = await openLocalStream(file.storageKey);
  if (!opened) {
    return NextResponse.json({ ok: false, error: "file_missing" }, withNoStore({ status: 502 }));
  }

  const headers = new Headers();
  headers.set("content-type", mimeForExt(file.ext));
  headers.set("content-length", String(opened.size));
  headers.set(
    "content-disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
  );
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");

  return new Response(opened.stream, { status: 200, headers });
}
