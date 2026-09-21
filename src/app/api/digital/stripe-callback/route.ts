import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { getPayment, setPaymentResult } from "@/lib/data/payments";
import { retrieveSession, isMockStripe } from "@/lib/payments/stripe";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { siteBaseUrl } from "@/lib/payments/zarinpal";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return NextResponse.redirect(`${siteBaseUrl()}${path}`, { status: 302 });
}

/**
 * GET /api/digital/stripe-callback?session_id=cs_…  — browser success redirect.
 * The webhook is the authoritative fulfillment path in live mode; this handler
 * exists so the buyer with a paid session never sees a dead end when the
 * webhook is delayed or the sandbox has no webhook subscription. MOCK sessions
 * auto-verify in dev.
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!sessionId) return redirectTo("/fa/downloads?status=unknown");

  const record = await getPayment(sessionId);
  const locale = record?.locale ?? "en";
  if (!record) return redirectTo(`/${locale}/downloads?status=unknown`);

  if (record.status === "paid") {
    return redirectTo(`/${locale}/downloads?status=success&order=${record.orderId}`);
  }

  const result = await retrieveSession(sessionId);
  if (!result.ok || !result.paid) {
    if (!record) return redirectTo(`/${locale}/downloads?status=unknown`);
    if (!isMockStripe()) await setPaymentResult(sessionId, "failed").catch(() => null);
    return redirectTo(`/${locale}/downloads?status=failed&order=${record.orderId}`);
  }

  const { orderId } = await fulfillPayment(record, result.refId);
  return redirectTo(`/${locale}/downloads?status=success&order=${orderId}`);
}
