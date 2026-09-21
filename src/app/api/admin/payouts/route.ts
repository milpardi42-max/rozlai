import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { allEarnings } from "@/lib/data/earnings";
import { addPayout, listPayouts, royaltyPercent } from "@/lib/data/payouts";
import { getContent } from "@/lib/data/store";
import { findUserByArtistId } from "@/lib/data/users";
import { sendPayoutRecordedEmail } from "@/lib/notify/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/**
 * GET /api/admin/payouts — every artist's royalty total + payout ledger.
 * POST /api/admin/payouts — record a settlement (admin only):
 *   { artistId, amountToman, method, note? }
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();
  const [earnings, payouts] = await Promise.all([allEarnings(), listPayouts()]);
  return NextResponse.json({ ok: true, royaltyPercent: royaltyPercent(), earnings, payouts }, withNoStore());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();

  const bucket = `admin:payouts:${clientIp(req)}`;
  if (tooManyAttempts(bucket)) {
    const res = NextResponse.json({ ok: false, error: "rate_limited" }, withNoStore({ status: 429 }));
    const retryAfter = retryAfterSeconds(bucket);
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(bucket);

  let body: { artistId?: string; amountToman?: number; method?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, withNoStore({ status: 400 }));
  }
  const artistId = String(body.artistId ?? "").trim();
  const amountToman = Math.round(Number(body.amountToman));
  const method = String(body.method ?? "").trim();
  const note = body.note != null ? String(body.note).trim() : undefined;

  if (!artistId) return NextResponse.json({ ok: false, error: "missing_artist" }, withNoStore({ status: 400 }));
  if (!Number.isFinite(amountToman) || amountToman <= 0 || amountToman > 1_000_000_000) {
    return NextResponse.json({ ok: false, error: "bad_amount" }, withNoStore({ status: 400 }));
  }
  if (!method || method.length > 200) {
    return NextResponse.json({ ok: false, error: "bad_method" }, withNoStore({ status: 400 }));
  }
  if (note && note.length > 500) {
    return NextResponse.json({ ok: false, error: "bad_note" }, withNoStore({ status: 400 }));
  }

  const rec = await addPayout({ artistId, amountToman, method, note, createdBy: session.id });

  // Notify the artist (best-effort — email may be unconfigured in dev)
  try {
    const content = await getContent();
    const artist = content.artists.find((a) => a.id === artistId);
    const user = artist ? await findUserByArtistId(artistId) : null;
    if (user?.email) {
      await sendPayoutRecordedEmail({
        to: user.email,
        locale: "fa",
        amountLabel: `${amountToman.toLocaleString("fa-IR")} تومان`,
        method,
      });
    }
  } catch {
    /* email is best-effort */
  }
  return NextResponse.json({ ok: true, payout: rec }, withNoStore());
}
