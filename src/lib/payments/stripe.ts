import "server-only";
import crypto from "crypto";

/**
 * Stripe payment gateway (Checkout Sessions REST API — no SDK).
 *
 * Modes:
 *  - Live:     STRIPE_SECRET_KEY set → real Checkout Sessions; fulfillment via
 *              the webhook (verify with STRIPE_WEBHOOK_SECRET) and a fallback
 *              poll from our success-redirect page.
 *  - Mock (dev): no key → startPayment returns a local authority and the
 *              callback treats it as paid, mirroring the ZarinPal mock flow.
 *
 * Prices on this site are stored per-locale {fa: Toman, en: USD}; Stripe is
 * only offered to USD buyers.
 */

const STRIPE_API = "https://api.stripe.com/v1";

export function isMockStripe(): boolean {
  return !process.env.STRIPE_SECRET_KEY;
}

export interface StripeSessionStart {
  redirectUrl: string;
  authority: string; // session id
  mock: boolean;
}

/** Create a Checkout Session; on success the buyer must be sent to `redirectUrl`. */
export async function startCheckout(input: {
  amountUsdCents: number;
  successUrl: string;
  cancelUrl: string;
  email?: string;
  description: string;
  metadata: Record<string, string>;
  authorityHint: string;
}): Promise<StripeSessionStart | { error: string }> {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    // Mock mode — the Stripe callback route auto-verifies MOCK authorities.
    return {
      redirectUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id=${encodeURIComponent(`MOCK-${input.authorityHint}`)}`,
      authority: `MOCK-${input.authorityHint}`,
      mock: true,
    };
  }

  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(input.amountUsdCents),
    "line_items[0][price_data][product_data][name]": input.description.slice(0, 250),
  });
  if (input.email) params.set("customer_email", input.email);
  for (const [k, v] of Object.entries(input.metadata)) {
    params.set(`metadata[${k}]`, v.slice(0, 500));
  }

  try {
    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    } | null;
    if (!res.ok || !data?.id || !data.url) {
      return { error: data?.error?.message ?? `stripe_${res.status}` };
    }
    return { redirectUrl: data.url, authority: data.id, mock: false };
  } catch {
    return { error: "stripe_unreachable" };
  }
}

/** Server-side lookup of a Checkout Session — used by the success redirect & replays. */
export async function retrieveSession(
  sessionId: string,
): Promise<{ ok: boolean; paid?: boolean; metadataOrderId?: string; refId?: string; error?: string }> {
  if (sessionId.startsWith("MOCK-")) {
    return { ok: true, paid: true, refId: `mock-${Date.now()}` };
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: "stripe_not_configured" };

  try {
    const res = await fetch(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      payment_status?: string;
      payment_intent?: string;
      metadata?: { orderId?: string };
      error?: { message?: string };
    } | null;
    if (!res.ok) return { ok: false, error: data?.error?.message ?? `stripe_${res.status}` };
    return {
      ok: true,
      paid: data?.payment_status === "paid",
      refId: data?.payment_intent,
      metadataOrderId: data?.metadata?.orderId,
    };
  } catch {
    return { ok: false, error: "stripe_unreachable" };
  }
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Verify a `stripe-signature` header over the RAW request body.
 * Stripe signs `${timestamp}.${body}` (utf8) with the webhook secret; the
 * header carries one or more `v1=` signatures. 5-minute clock tolerance.
 */
export function verifyWebhookSignature(rawBody: string, sigHeader: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return false;

  const parts = sigHeader.split(",").map((p) => p.split("=") as [string, string]);
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return signatures.some((sig) => safeEqualHex(sig, expected));
}
