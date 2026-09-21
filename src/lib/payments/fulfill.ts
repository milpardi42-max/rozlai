import "server-only";
import { revalidatePath } from "next/cache";
import type { PaymentRecord } from "@/lib/data/payments";
import { setPaymentResult } from "@/lib/data/payments";
import { createEntitlement, listEntitlementsFor } from "@/lib/data/entitlements";
import { updateOrderStatus } from "@/lib/data/orders";
import { getContent, saveContent } from "@/lib/data/store";
import { redeemDiscountCode } from "@/lib/data/discounts";
import { setSubscription } from "@/lib/data/plans";
import { findUserByEmail } from "@/lib/data/users";
import { sendPurchaseConfirmedEmail } from "@/lib/notify/email";
import { siteBaseUrl } from "@/lib/payments/zarinpal";
import { DEFAULT_LICENSE_PRICES } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Shared purchase fulfillment — used by BOTH gateways (ZarinPal callback and
 * Stripe webhook/redirect). Idempotent: returns early when the entitlement
 * for (orderId, patternId) already exists.
 *
 * Side-effect order matters: entitlement first (buyer's deliverable), then the
 * exclusive delist, order confirmation, discount redemption counting, and
 * finally the email (which may fail happily — never rework money over SMTP).
 */

export async function fulfillPayment(record: PaymentRecord, refId?: string): Promise<{ locale: string; orderId: string }> {
  // Phase 5 — subscription purchases activate a plan instead of minting an entitlement
  if (record.planId) {
    await activatePlan(record);
    await updateOrderStatus(record.orderId, "confirmed").catch(() => null);
    await setPaymentResult(record.authority, "paid", refId);
    return { locale: record.locale, orderId: record.orderId };
  }

  const existing = await listEntitlementsFor(record.userId, record.email);
  const already = existing.some((e) => e.orderId === record.orderId && e.patternId === record.patternId);

  if (!already) {
    await createEntitlement({
      userId: record.userId,
      email: record.email,
      patternId: record.patternId,
      license: record.license,
      orderId: record.orderId,
    });

    // Exclusive sale → permanent delist (Phase 2). Never block delivery on this.
    if (record.license === "exclusive") {
      try {
        const content = await getContent();
        const idx = content.patterns.findIndex((p) => p.id === record.patternId);
        if (idx >= 0 && !content.patterns[idx]!.exclusiveSale) {
          const patterns = content.patterns.map((p, i) =>
            i === idx ? { ...p, exclusiveSale: { orderId: record.orderId, at: new Date().toISOString() } } : p,
          );
          await saveContent({ ...content, patterns });
          revalidatePath("/api/search-index");
          revalidatePath("/sitemap.xml");
          revalidatePath("/fa/patterns");
          revalidatePath("/en/patterns");
        }
      } catch (e) {
        console.error("[fulfill] exclusive delist failed:", e);
      }
    }

    await updateOrderStatus(record.orderId, "confirmed").catch(() => null);

    // Count the discount code redemption only once payment is money-verified
    if (record.discountCode) {
      await redeemDiscountCode(record.discountCode).catch(() => null);
    }

    // Purchase email — delivery failure must not affect fulfillment
    try {
      const content = await getContent();
      const pattern = content.patterns.find((p) => p.id === record.patternId);
      const title = (pattern?.title as Localized | undefined)?.[record.locale] ?? pattern?.title?.en ?? "—";
      const licenseLabel = { personal: "شخصی", commercial: "تجاری", exclusive: "اختصاصی" }[record.license];
      await sendPurchaseConfirmedEmail({
        to: record.email,
        locale: record.locale,
        orderId: record.orderId,
        patternTitle: title,
        licenseLabel: record.locale === "fa" ? licenseLabel : record.license,
        downloadsUrl: `${siteBaseUrl()}/${record.locale}/downloads`,
      });
    } catch {
      /* email is best-effort */
    }
  }

  await setPaymentResult(record.authority, "paid", refId);
  return { locale: record.locale, orderId: record.orderId };
}

/** Activate the artist's subscription after a plan payment (30-day period). */
async function activatePlan(record: PaymentRecord): Promise<void> {
  // Resolve the buyer's linked artist record so admin/analytics can join by artistId
  let artistId: string | null = null;
  try {
    const user = await findUserByEmail(record.email);
    artistId = user?.artistId ?? null;
  } catch {
    /* leave null — dashboard joins via userId anyway */
  }
  const days = 30;
  await setSubscription({
    userId: record.userId,
    artistId,
    planId: record.planId as "basic" | "pro" | "studio",
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    note: `خرید پلن — سفارش ${record.orderId}`,
    setBy: "billing",
  }).catch((e) => console.error("[fulfill] plan activation failed:", e));
}

/** Digital licence final amount after an optional discount code — shared by both gateways. */
export function licenseGross(
  license: keyof typeof DEFAULT_LICENSE_PRICES,
  priceOverride: { fa: number; en: number } | undefined,
): { toman: number; usdCents: number } {
  const price = priceOverride ?? DEFAULT_LICENSE_PRICES[license];
  return { toman: price.fa, usdCents: Math.max(50, Math.round(price.en * 100)) };
}
