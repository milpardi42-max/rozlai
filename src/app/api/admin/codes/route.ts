import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent } from "@/lib/data/store";
import { createDiscountCode, listDiscountCodes, setDiscountActive, deleteDiscountCode } from "@/lib/data/discounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/**
 * GET   /api/admin/codes — list every discount/affiliate code
 * POST  /api/admin/codes — create: { code?, percentOff, maxUses?, expiresAt?, artistId?, commissionPercent? }
 * PATCH /api/admin/codes — { id, active }
 * DELETE /api/admin/codes?id=…
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();
  const [codes, content] = await Promise.all([listDiscountCodes(), getContent()]);
  const artists = content.artists.map((a) => ({ id: a.id, name: a.name }));
  return NextResponse.json({ ok: true, codes, artists }, withNoStore());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "bad_json" }, withNoStore({ status: 400 }));

  const result = await createDiscountCode({
    code: body.code ? String(body.code) : undefined,
    percentOff: Number(body.percentOff),
    maxUses: body.maxUses != null ? Number(body.maxUses) : undefined,
    expiresAt: body.expiresAt ? String(body.expiresAt) : null,
    artistId: body.artistId ? String(body.artistId) : null,
    commissionPercent: body.commissionPercent != null ? Number(body.commissionPercent) : 0,
    createdBy: session.id,
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, withNoStore({ status: 400 }));
  }
  return NextResponse.json({ ok: true, code: result }, withNoStore());
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();
  const body = (await req.json().catch(() => null)) as { id?: string; active?: boolean } | null;
  if (!body?.id || typeof body.active !== "boolean") {
    return NextResponse.json({ ok: false, error: "bad_json" }, withNoStore({ status: 400 }));
  }
  const ok = await setDiscountActive(body.id, body.active);
  return NextResponse.json({ ok }, withNoStore({ status: ok ? 200 : 404 }));
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const ok = await deleteDiscountCode(id);
  return NextResponse.json({ ok }, withNoStore({ status: ok ? 200 : 404 }));
}
