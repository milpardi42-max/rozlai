import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent } from "@/lib/data/store";
import { listFiles, setFileStatus } from "@/lib/files/storage";
import type { MasterFileStatus } from "@/lib/files/types";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/**
 * GET /api/admin/files — every master file with its pattern title + uploader,
 * for the moderation queue. Storage keys are stripped from the payload.
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();

  const [files, content] = await Promise.all([listFiles(), getContent()]);
  const enriched = files.map((f) => {
    const { storageKey, ...pub } = f;
    const pattern = content.patterns.find((p) => p.id === f.patternId);
    const artist = content.artists.find((a) => a.id === f.artistId);
    return {
      ...pub,
      patternTitle: pattern?.title ?? null,
      patternSlug: pattern?.slug ?? null,
      artistName: artist?.name ?? null,
    };
  });

  return NextResponse.json({ ok: true, files: enriched }, withNoStore());
}

/**
 * PATCH /api/admin/files — moderate a file: { fileId, status, note? }
 * Only "approved" files appear on the PDP and can be delivered to buyers.
 */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();

  const body = (await req.json().catch(() => null)) as
    | { fileId?: string; status?: MasterFileStatus; note?: string }
    | null;
  if (!body?.fileId || !["pending", "approved", "rejected"].includes(body.status ?? "")) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const updated = await setFileStatus(body.fileId, body.status as MasterFileStatus, body.note);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }

  const { storageKey, ...pub } = updated;
  return NextResponse.json({ ok: true, file: pub }, withNoStore());
}
