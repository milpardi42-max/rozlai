import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { artistEarnings } from "@/lib/data/earnings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/artist/earnings — the caller's royalty statement.
 * Admin may pass ?artistId=<id> for any artist's statement.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const url = new URL(req.url);
  const isAdmin = session.role === "admin";
  let artistId = session.artistId ?? null;
  if (isAdmin && url.searchParams.get("artistId")) artistId = url.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ ok: false, error: "no_artist" }, withNoStore({ status: 400 }));
  }
  const earnings = await artistEarnings(artistId);
  return NextResponse.json({ ok: true, earnings }, withNoStore());
}
