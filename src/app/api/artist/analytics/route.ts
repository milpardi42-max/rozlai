import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent } from "@/lib/data/store";
import { listPaidPayments } from "@/lib/data/payments";
import { getSubscription, planDef, PLANS } from "@/lib/data/plans";
import { listDiscountCodes } from "@/lib/data/discounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/artist/analytics — Phase 5 sales-intelligence payload for the
 * dashboard: monthly royalty series, per-pattern sales, plan + quota, and
 * the artist's own discount/affiliate codes with redemption counts.
 */
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const artistId = session.artistId ?? null;
  if (!artistId && session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "no_artist" }, withNoStore({ status: 400 }));
  }

  const [content, paid, codes] = await Promise.all([getContent(), listPaidPayments(), listDiscountCodes()]);
  const sub = await getSubscription(session.id);
  const plan = planDef(sub.planId);

  const myPatterns = artistId ? content.patterns.filter((p) => p.artistId === artistId) : content.patterns;
  const myIds = new Set(myPatterns.map((p) => p.id));
  const mySales = paid.filter((p) => myIds.has(p.patternId));

  // ── Last 12 months royalty/gross series (Toman) ─────────────────────────
  const months: { key: string; label: string; gross: number; count: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: key.slice(5), gross: 0, count: 0 });
  }
  const bucket = new Map(months.map((m) => [m.key, m]));
  for (const p of mySales) {
    const key = p.createdAt.slice(0, 7);
    const m = bucket.get(key);
    if (m) {
      m.gross += Math.round(p.amountRial / 10);
      m.count += 1;
    }
  }

  // ── Per-pattern performance ──────────────────────────────────────────────
  const perPattern = new Map<string, { titleFa: string; titleEn: string; sales: number; gross: number }>();
  for (const p of mySales) {
    const pat = myPatterns.find((x) => x.id === p.patternId);
    const row = perPattern.get(p.patternId) ?? {
      titleFa: pat?.title?.fa ?? p.patternId,
      titleEn: pat?.title?.en ?? p.patternId,
      sales: 0,
      gross: 0,
    };
    row.sales += 1;
    row.gross += Math.round(p.amountRial / 10);
    perPattern.set(p.patternId, row);
  }
  const topPatterns = [...perPattern.values()].sort((a, b) => b.gross - a.gross).slice(0, 8);
  const byLicense = { personal: 0, commercial: 0, exclusive: 0 };
  for (const p of mySales) byLicense[p.license] += 1;

  const myProducts = artistId ? content.products.filter((p) => p.artistId === artistId) : content.products;

  // ── Artist's affiliate/discount codes ────────────────────────────────────
  const myCodes = codes.filter((c) => c.artistId === artistId).map((c) => ({
    code: c.code,
    percentOff: c.percentOff,
    uses: c.uses,
    maxUses: c.maxUses,
    active: c.active,
    commissionPercent: c.commissionPercent,
  }));

  return NextResponse.json(
    {
      ok: true,
      plan: { id: plan.id, priceToman: plan.priceToman, patternQuota: plan.patternQuota, productQuota: plan.productQuota, royaltyBoost: plan.royaltyBoost, expiresAt: sub.expiresAt },
      quotas: {
        patterns: { used: myPatterns.length, limit: plan.patternQuota },
        products: { used: myProducts.length, limit: plan.productQuota },
      },
      allPlans: PLANS,
      months: months.map((m) => ({ label: m.label, gross: m.gross, count: m.count })),
      totals: { sales: mySales.length, gross: mySales.reduce((s, p) => s + Math.round(p.amountRial / 10), 0) },
      topPatterns,
      byLicense,
      codes: myCodes,
    },
    withNoStore(),
  );
}
