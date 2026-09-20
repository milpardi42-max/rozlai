import "server-only";

/**
 * ZarinPal payment gateway (v4 REST).
 *
 * Modes:
 *  - Production: ZARINPAL_MERCHANT_ID set → payment.zarinpal.com
 *  - Sandbox:    ZARINPAL_MERCHANT_ID set + ZARINPAL_SANDBOX=1 → sandbox.zarinpal.com
 *  - Mock (dev): no merchant id → startPayment returns a local mock authority
 *    and the callback route auto-verifies it. Lets the whole
 *    upload → purchase → download cycle run with zero external accounts.
 */

export interface PaymentStart {
  /** Where the buyer must be sent next (gateway page or, in mock mode, our callback). */
  redirectUrl: string;
  authority: string;
  mock: boolean;
}

function baseUrl(): string {
  return process.env.ZARINPAL_SANDBOX === "1"
    ? "https://sandbox.zarinpal.com/pg/v4/payment"
    : "https://payment.zarinpal.com/pg/v4/payment";
}

function gatewayUrl(): string {
  return process.env.ZARINPAL_SANDBOX === "1"
    ? "https://sandbox.zarinpal.com/pg/StartPay"
    : "https://payment.zarinpal.com/pg/StartPay";
}

export function isMockGateway(): boolean {
  return !process.env.ZARINPAL_MERCHANT_ID;
}

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function startPayment(input: {
  amountRial: number;
  callbackUrl: string;
  description: string;
  email?: string;
  authorityHint: string;
}): Promise<PaymentStart | { error: string }> {
  const merchant = process.env.ZARINPAL_MERCHANT_ID;

  if (!merchant) {
    // Mock mode — the callback route treats MOCK authorities as paid.
    return {
      redirectUrl: `${input.callbackUrl}?Authority=${encodeURIComponent(`MOCK-${input.authorityHint}`)}&Status=OK`,
      authority: `MOCK-${input.authorityHint}`,
      mock: true,
    };
  }

  try {
    const res = await fetch(`${baseUrl()}/request.json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchant,
        amount: input.amountRial,
        callback_url: input.callbackUrl,
        description: input.description.slice(0, 255),
        metadata: input.email ? { email: input.email } : undefined,
      }),
      cache: "no-store",
    });
    const data = (await res.json()) as {
      data?: { code?: number; authority?: string };
      errors?: { message?: string } | unknown[];
    };
    const authority = data.data?.authority;
    if (data.data?.code === 100 && authority) {
      return { redirectUrl: `${gatewayUrl()}/${authority}`, authority, mock: false };
    }
    const msg =
      typeof (data.errors as { message?: string })?.message === "string"
        ? (data.errors as { message: string }).message
        : `zarinpal_request_failed_${data.data?.code ?? res.status}`;
    return { error: msg };
  } catch {
    return { error: "gateway_unreachable" };
  }
}

export async function verifyPayment(input: {
  authority: string;
  amountRial: number;
}): Promise<{ ok: boolean; refId?: string; alreadyVerified?: boolean; error?: string }> {
  const merchant = process.env.ZARINPAL_MERCHANT_ID;

  if (!merchant || input.authority.startsWith("MOCK-")) {
    return { ok: true, refId: `mock-${Date.now()}` };
  }

  try {
    const res = await fetch(`${baseUrl()}/verify.json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchant,
        amount: input.amountRial,
        authority: input.authority,
      }),
      cache: "no-store",
    });
    const data = (await res.json()) as { data?: { code?: number; ref_id?: number } };
    const code = data.data?.code;
    if (code === 100) return { ok: true, refId: String(data.data?.ref_id ?? "") };
    if (code === 101) return { ok: true, alreadyVerified: true, refId: String(data.data?.ref_id ?? "") };
    return { ok: false, error: `verify_failed_${code ?? res.status}` };
  } catch {
    return { ok: false, error: "gateway_unreachable" };
  }
}
