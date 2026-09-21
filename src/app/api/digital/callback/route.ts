import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { getPayment, setPaymentResult } from "@/lib/data/payments";
import { verifyPayment, siteBaseUrl } from "@/lib/payments/zarinpal";
import { fulfillPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return NextResponse.redirect(`${siteBaseUrl()}${path}`, { status: 302 });
}

/**
 * GET /api/digital/callback?Authority=…&Status=OK
 * ZarinPal (and the dev mock) send the buyer back here. We verify, then the
 * shared fulfill service mints the entitlement / delists exclusives / emails.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get("Authority") ?? "";
  const status = searchParams.get("Status") ?? "";

  const record = await getPayment(authority || "");
  const locale = record?.locale ?? "fa";

  if (!record) {
    return redirectTo(`/${locale}/downloads?status=unknown`);
  }
  if (status !== "OK") {
    await setPaymentResult(authority, "failed");
    return redirectTo(`/${locale}/downloads?status=cancelled&order=${record.orderId}`);
  }
  if (record.status === "paid") {
    // Idempotent double-callback — just show the downloads page again.
    return redirectTo(`/${locale}/downloads?status=success&order=${record.orderId}`);
  }

  const verified = await verifyPayment({ authority, amountRial: record.amountRial });
  if (!verified.ok) {
    await setPaymentResult(authority, "failed");
    return redirectTo(`/${locale}/downloads?status=failed&order=${record.orderId}`);
  }

  const { orderId } = await fulfillPayment(record, verified.refId);
  return redirectTo(`/${locale}/downloads?status=success&order=${orderId}`);
}
