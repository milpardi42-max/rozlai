import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { listSubscriptions, setSubscription, PLANS, type PlanDef } from "@/lib/data/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/**
 * GET  /api/admin/subscriptions — all artist subscriptions + plan catalogue
 * PUT  /api/admin/subscriptions — assign a plan: { userId, artistId?, planId, days? }
 *        days — subscription length; 0/absent = open-ended (granted)
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();
  const subs = await listSubscriptions();
  return NextResponse.json({ ok: true, subscriptions: subs, plans: PLANS }, withNoStore());
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();
  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    artistId?: string;
    planId?: PlanDef["id"];
    days?: number;
    note?: string;
  } | null;
  if (!body?.userId || !body.planId || !PLANS.some((p) => p.id === body.planId)) {
    return NextResponse.json({ ok: false, error: "bad_json" }, withNoStore({ status: 400 }));
  }
  const days = Number(body.days) || 0;
  const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
  const rec = await setSubscription({
    userId: String(body.userId),
    artistId: body.artistId ? String(body.artistId) : null,
    planId: body.planId,
    expiresAt,
    note: body.note ? String(body.note).slice(0, 200) : undefined,
    setBy: session.id,
  });
  return NextResponse.json({ ok: true, subscription: rec }, withNoStore());
}
