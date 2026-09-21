import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { getContent } from "@/lib/data/store";
import { resolveDiscountCode } from "@/lib/data/discounts";
import { DEFAULT_LICENSE_PRICES, type LicenseTier } from "@/lib/types";

export const dynamic = "force-dynamic";

const LICENSES: LicenseTier[] = ["personal", "commercial", "exclusive"];

/**
 * POST /api/digital/quote — price preview for the buy panel.
 * { patternId, license, discountCode? } → gross/discounted prices so the UI
 * can show «۱۲۰٬۰۰۰ ← ۸۴٬۰۰۰ تومان (۳۰٪ تخفیف)» before the gateway opens.
 * Unauthenticated on purpose (public price info) but rate-limited per IP.
 */
export async function POST(req: Request) {
  const rlKey = `quote:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    const res = NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
    const retryAfter = retryAfterSeconds(rlKey);
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  const body = (await req.json().catch(() => null)) as
    | { patternId?: string; license?: string; discountCode?: string }
    | null;
  const license = body?.license as LicenseTier;
  if (!body?.patternId || !LICENSES.includes(license)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const content = await getContent();
  const pattern = content.patterns.find((p) => p.id === body.patternId);
  const gross = pattern?.licensePrices?.[license] ?? DEFAULT_LICENSE_PRICES[license];
  if (!pattern || !pattern.digital) {
    return NextResponse.json({ ok: false, error: "not_digital" }, withNoStore({ status: 404 }));
  }

  const base = { toman: gross.fa, usdCents: Math.max(50, Math.round(gross.en * 100)) };
  if (!body.discountCode?.trim()) {
    return NextResponse.json({ ok: true, ...base, discounted: { ...base }, discount: null }, withNoStore());
  }

  const resolved = await resolveDiscountCode(body.discountCode, base.toman, base.usdCents);
  if (!resolved.ok) {
    return NextResponse.json(
      { ok: true, ...base, discounted: { ...base }, discount: { error: resolved.error } },
      withNoStore(),
    );
  }
  return NextResponse.json(
    {
      ok: true,
      ...base,
      discounted: { toman: resolved.discountedToman, usdCents: resolved.discountedUsdCents },
      discount: { code: resolved.record.code, percentOff: resolved.record.percentOff },
    },
    withNoStore(),
  );
}
