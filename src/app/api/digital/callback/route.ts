import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { withNoStore } from "@/lib/http";
import { getPayment, setPaymentResult } from "@/lib/data/payments";
import { createEntitlement, listEntitlementsFor } from "@/lib/data/entitlements";
import { updateOrderStatus } from "@/lib/data/orders";
import { verifyPayment, siteBaseUrl } from "@/lib/payments/zarinpal";
import { getContent, saveContent } from "@/lib/data/store";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return NextResponse.redirect(`${siteBaseUrl()}${path}`, { status: 302 });
}

/**
 * GET /api/digital/callback?Authority=…&Status=OK
 * ZarinPal (and the dev mock) send the buyer back here. We verify, mint the
 * entitlement, confirm the order, then land the buyer on their downloads page.
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

  // Mint the entitlement once per payment (skip when re-verified double-callback)
  if (!verified.alreadyVerified) {
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

      // Phase 2 — an exclusive sale transfers the rights: mark the pattern so it
      // is delisted from listings/search/sitemap and can't be licensed again.
      if (record.license === "exclusive") {
        try {
          const content = await getContent();
          const idx = content.patterns.findIndex((p) => p.id === record.patternId);
          if (idx >= 0 && !content.patterns[idx]!.exclusiveSale) {
            const patterns = content.patterns.map((p, i) =>
              i === idx ? { ...p, exclusiveSale: { orderId: record.orderId, at: new Date().toISOString() } } : p,
            );
            await saveContent({ ...content, patterns });
            // Flush cached discovery surfaces so the delist is instant
            // (search-index and sitemap carry their own revalidate timers).
            revalidatePath("/api/search-index");
            revalidatePath("/sitemap.xml");
            revalidatePath("/fa/patterns");
            revalidatePath("/en/patterns");
          }
        } catch (e) {
          // Delisting must never break entitlement delivery — retryable from admin.
          console.error("[digital/callback] exclusive delist failed:", e);
        }
      }
    }
    await updateOrderStatus(record.orderId, "confirmed").catch(() => null);
  }

  await setPaymentResult(authority, "paid", verified.refId);
  return redirectTo(`/${locale}/downloads?status=success&order=${record.orderId}`);
}
