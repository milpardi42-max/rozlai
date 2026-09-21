import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { getPayment } from "@/lib/data/payments";
import { verifyWebhookSignature } from "@/lib/payments/stripe";
import { fulfillPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

/**
 * POST /api/digital/stripe-webhook — Stripe event endpoint (Checkout).
 * Handles `checkout.session.completed`; the RAW body is required for the
 * signature check, so we read text() rather than json(). Idempotent by
 * design: fulfillment re-checks the entitlement before doing anything.
 *
 * Configure: stripe listen --forward-to …/api/digital/stripe-webhook (dev)
 * or the Dashboard webhook URL (prod), then set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, withNoStore({ status: 400 }));
  }
  const sig = req.headers.get("stripe-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ ok: false, error: "bad_signature" }, withNoStore({ status: 400 }));
  }

  let event: { type?: string; data?: { object?: { id?: string; payment_status?: string } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, withNoStore({ status: 400 }));
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: true }, withNoStore());
  }
  const sessionId = event.data?.object?.id;
  if (!sessionId) {
    return NextResponse.json({ ok: true, ignored: true }, withNoStore());
  }

  const record = await getPayment(sessionId);
  if (!record) {
    // Unknown session — acknowledge so Stripe stops retrying, but log loudly.
    console.error(`[stripe-webhook] unknown session ${sessionId}`);
    return NextResponse.json({ ok: true, ignored: true }, withNoStore());
  }
  if (record.status === "paid") {
    return NextResponse.json({ ok: true, already: true }, withNoStore());
  }

  await fulfillPayment(record);
  return NextResponse.json({ ok: true, order: record.orderId }, withNoStore());
}
