import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { getContent } from "@/lib/data/store";
import { createOrder } from "@/lib/data/orders";
import { createPayment, rekeyPayment } from "@/lib/data/payments";
import { listApprovedForPattern } from "@/lib/files/storage";
import { startPayment, siteBaseUrl } from "@/lib/payments/zarinpal";
import { startCheckout } from "@/lib/payments/stripe";
import { resolveDiscountCode } from "@/lib/data/discounts";
import { DEFAULT_LICENSE_PRICES, LICENSE_COVERAGE, type LicenseTier } from "@/lib/types";
import { LOCALES, type Locale, type Localized } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

const LICENSES: LicenseTier[] = ["personal", "commercial", "exclusive"];

function t(l: Localized | undefined, locale: Locale): string {
  return (l?.[locale] ?? l?.fa ?? l?.en ?? "").toString();
}

/**
 * POST /api/digital/checkout — start a digital-licence purchase.
 * Body: { patternId, license } → { redirectUrl } (ZarinPal, or the mock
 * callback in dev). Requires a signed-in buyer.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "login_required" }, withNoStore({ status: 401 }));
  }

  // Rate limit: 20 checkout starts / 5 min / IP
  const rlKey = `checkout:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    const retryAfter = retryAfterSeconds(rlKey);
    const res = NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  const body = (await req.json().catch(() => null)) as
    | { patternId?: string; license?: string; locale?: string; gateway?: string; discountCode?: string }
    | null;
  const license = body?.license as LicenseTier;
  if (!body?.patternId || !LICENSES.includes(license)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const locale: Locale = LOCALES.includes(body.locale as Locale) ? (body.locale as Locale) : "fa";
  // Gateway: USD buyers (en locale) get Stripe when an USD price exists;
  // explicit override wins for shared screens (wallet page, etc.).
  const gateway =
    body?.gateway === "stripe" || body?.gateway === "zarinpal"
      ? body.gateway
      : locale === "en"
        ? "stripe"
        : "zarinpal";

  const content = await getContent();
  const pattern = content.patterns.find((p) => p.id === body.patternId);
  if (!pattern || !pattern.digital) {
    return NextResponse.json({ ok: false, error: "not_digital" }, withNoStore({ status: 404 }));
  }

  // Phase 2 — rights already transferred to an exclusive buyer: no more sales.
  if (pattern.exclusiveSale) {
    return NextResponse.json({ ok: false, error: "exclusive_sold" }, withNoStore({ status: 409 }));
  }

  // The tier must actually have approved deliverables
  const approved = await listApprovedForPattern(pattern.id);
  const covered = new Set(LICENSE_COVERAGE[license]);
  const files = approved.filter((f) => covered.has(f.tier));
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "no_deliverables" }, withNoStore({ status: 409 }));
  }

  const price = pattern.licensePrices?.[license] ?? DEFAULT_LICENSE_PRICES[license];

  // Phase 5 — optional discount/affiliate code (validated server-side)
  let discountCode: string | undefined;
  let payToman = price.fa;
  let payUsdCents = Math.max(50, Math.round(price.en * 100));
  if (body?.discountCode?.trim()) {
    const resolved = await resolveDiscountCode(body.discountCode, price.fa, payUsdCents);
    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, error: `discount_${resolved.error}` },
        withNoStore({ status: 400 }),
      );
    }
    discountCode = resolved.record.code;
    payToman = resolved.discountedToman;
    payUsdCents = resolved.discountedUsdCents;
  }

  // Pattern prices on this site are stored in Toman; ZarinPal v4 expects Rial.
  const amountRial = Math.max(1000, payToman * 10);

  // USD checkout requires a real USD price on the pattern (> $0.50 after discount)
  if (gateway === "stripe" && payUsdCents < 50) {
    return NextResponse.json({ ok: false, error: "no_usd_price" }, withNoStore({ status: 400 }));
  }

  const title = t(pattern.title, locale);
  let order;
  try {
    order = await createOrder({
      userId: session.id,
      name: session.name || session.email,
      email: session.email,
      phone: "",
      address: "DIGITAL-DOWNLOAD",
      city: "",
      postal: "",
      lines: [
        {
          kind: "pattern",
          id: pattern.id,
          sku: `${pattern.sku}-${license.toUpperCase()}`,
          title: `${title} · ${license}`,
          image: pattern.image,
          price: gateway === "stripe" ? { fa: payToman, en: payUsdCents / 100 } : { fa: payToman, en: price.en },
          qty: 1,
        },
      ],
      total: gateway === "stripe" ? { fa: payToman, en: payUsdCents / 100 } : { fa: payToman, en: price.en },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "order_failed" }, withNoStore({ status: 500 }));
  }

  // Toman equivalent of a USD charge — keeps analytics/earnings in one currency
  // (tier.fa × actualUsd / tier.en, i.e. discounts carry over proportionally).
  const tomanEquiv =
    price.fa > 0 && price.en > 0
      ? Math.max(0, Math.round(price.fa * ((payUsdCents / 100) / price.en)))
      : payToman;

  const payment = await createPayment({
    orderId: order.id,
    patternId: pattern.id,
    license,
    userId: session.id,
    email: session.email,
    locale,
    amountRial: gateway === "stripe" ? tomanEquiv * 10 : amountRial,
    grossAmountMinor: gateway === "stripe" ? payUsdCents : amountRial,
    gateway,
    currency: gateway === "stripe" ? "USD" : "IRR",
    ...(discountCode ? { discountCode } : {}),
  });

  if (gateway === "stripe") {
    const started = await startCheckout({
      amountUsdCents: payUsdCents,
      successUrl: `${siteBaseUrl()}/api/digital/stripe-callback`,
      cancelUrl: `${siteBaseUrl()}/${locale}/patterns/${pattern.slug}?purchase=cancelled`,
      email: session.email,
      description: `${title} — ${license} licence`,
      metadata: { orderId: order.id, authority: payment.authority, patternId: pattern.id },
      authorityHint: payment.authority,
    });
    if ("error" in started) {
      return NextResponse.json({ ok: false, error: started.error }, withNoStore({ status: 502 }));
    }
    await rekeyPayment(payment.authority, started.authority);
    return NextResponse.json(
      { ok: true, redirectUrl: started.redirectUrl, orderId: order.id, mock: started.mock, gateway: "stripe" },
      withNoStore(),
    );
  }

  const started = await startPayment({
    amountRial,
    callbackUrl: `${siteBaseUrl()}/api/digital/callback`,
    description: `خرید لایسنس ${license} الگوی «${title}»`,
    email: session.email,
    authorityHint: payment.authority,
  });

  if ("error" in started) {
    return NextResponse.json({ ok: false, error: started.error }, withNoStore({ status: 502 }));
  }

  // Live mode: the record is looked up by ZarinPal's own authority at callback
  // time, so re-key it here. Mock mode keeps MOCK-<hint> as the key.
  await rekeyPayment(payment.authority, started.authority);

  return NextResponse.json(
    { ok: true, redirectUrl: started.redirectUrl, orderId: order.id, mock: started.mock, gateway: "zarinpal" },
    withNoStore(),
  );
}
