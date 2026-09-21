import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { createOrder } from "@/lib/data/orders";
import { createPayment, rekeyPayment } from "@/lib/data/payments";
import { PLANS } from "@/lib/data/plans";
import { startPayment, siteBaseUrl } from "@/lib/payments/zarinpal";
import { resolveDiscountCode } from "@/lib/data/discounts";
import type { LicenseTier } from "@/lib/types";
import { LOCALES, type Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/artist/plan/checkout — artist buys a subscription plan.
 * { planId, locale?, discountCode? } → ZarinPal/mock redirect. On fulfillment
 * the shared fulfill service activates the plan (fulfill.ts → activatePlan).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }

  const rlKey = `checkout:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    const res = NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
    const retryAfter = retryAfterSeconds(rlKey);
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  const body = (await req.json().catch(() => null)) as
    | { planId?: string; locale?: string; discountCode?: string }
    | null;
  const plan = PLANS.find((p) => p.id === body?.planId && p.id !== "starter");
  if (!plan) {
    return NextResponse.json({ ok: false, error: "invalid_plan" }, withNoStore({ status: 400 }));
  }
  const locale: Locale = LOCALES.includes(body?.locale as Locale) ? (body!.locale as Locale) : "fa";

  let payToman = plan.priceToman;
  let discountCode: string | undefined;
  if (body?.discountCode?.trim()) {
    const resolved = await resolveDiscountCode(body.discountCode, plan.priceToman, Math.round(plan.priceUsd * 100));
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: `discount_${resolved.error}` }, withNoStore({ status: 400 }));
    }
    discountCode = resolved.record.code;
    payToman = resolved.discountedToman;
  }

  const amountRial = Math.max(1000, payToman * 10);
  const planLabel = { basic: "پایه", pro: "حرفه‌ای", studio: "استودیو" }[plan.id as "basic" | "pro" | "studio"];

  const order = await createOrder({
    userId: session.id,
    name: session.name || session.email,
    email: session.email,
    phone: "",
    address: "PLAN-SUBSCRIPTION",
    city: "",
    postal: "",
    lines: [
      {
        kind: "pattern", // order model's only digital kind; labelled by address field
        id: `plan-${plan.id}`,
        sku: `PLAN-${plan.id.toUpperCase()}`,
        title: `اشتراک ${planLabel} — ۳۰ روزه`,
        image: "/images/collections/s01.jpg",
        price: { fa: payToman, en: plan.priceUsd },
        qty: 1,
      },
    ],
    total: { fa: payToman, en: plan.priceUsd },
  }).catch(() => null);
  if (!order) {
    return NextResponse.json({ ok: false, error: "order_failed" }, withNoStore({ status: 500 }));
  }

  const payment = await createPayment({
    orderId: order.id,
    patternId: `plan-${plan.id}`, // placeholder — fulfill branches on planId
    license: "personal" as LicenseTier, // placeholder — ignored for plans
    userId: session.id,
    email: session.email,
    locale,
    amountRial,
    grossAmountMinor: amountRial,
    gateway: "zarinpal",
    currency: "IRR",
    planId: plan.id,
    ...(discountCode ? { discountCode } : {}),
  });

  const started = await startPayment({
    amountRial,
    callbackUrl: `${siteBaseUrl()}/api/digital/callback`,
    description: `خرید اشتراک ${planLabel} رزی آتلیه (۳۰ روز)`,
    email: session.email,
    authorityHint: payment.authority,
  });
  if ("error" in started) {
    return NextResponse.json({ ok: false, error: started.error }, withNoStore({ status: 502 }));
  }
  await rekeyPayment(payment.authority, started.authority);

  return NextResponse.json(
    { ok: true, redirectUrl: started.redirectUrl, orderId: order.id, mock: started.mock },
    withNoStore(),
  );
}
