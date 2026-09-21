import "server-only";
import type { ID } from "@/lib/types";
import { DEFAULT_LICENSE_PRICES } from "@/lib/types";
import type { LicenseTier } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";
import { getContent } from "@/lib/data/store";
import { listPayouts, royaltyPercent } from "@/lib/data/payouts";
import { listPaidPayments } from "@/lib/data/payments";
import { listDiscountCodes } from "@/lib/data/discounts";
import { listSubscriptions, planDef } from "@/lib/data/plans";

/**
 * Artist earnings (Phase 3).
 * Derived from settled payments joined to pattern ownership; the artist's
 * royalty share (`royaltyPercent()`) minus paid-out settlements = balance.
 * Site-owned designs (no artistId) produce platform revenue, no royalty.
 */

export interface EarningRow {
  orderId: string;
  at: string;
  patternId: ID;
  patternTitle: Localized | null;
  license: LicenseTier;
  grossToman: number;
  royaltyToman: number;
}

export interface AffiliateRow {
  orderId: string;
  at: string;
  code: string;
  salePatternId: ID;
  saleTitle: Localized | null;
  saleGrossToman: number;
  commissionToman: number;
}

export interface ArtistEarnings {
  artistId: ID;
  artistName: Localized | null;
  royaltyPercent: number;
  salesCount: number;
  grossToman: number;
  royaltyToman: number;
  /** Phase 5 — affiliate redemptions of this artist's code */
  affiliateCount: number;
  affiliateToman: number;
  affiliateRows: AffiliateRow[];
  /** Phase 5 — plan royalty boost (percent) on top of base royalty */
  royaltyBoost: number;
  paidOutToman: number;
  balanceToman: number;
  rows: EarningRow[];
}

export async function allEarnings(): Promise<ArtistEarnings[]> {
  const [content, paid, payouts, codes, subscriptions] = await Promise.all([
    getContent(),
    listPaidPayments(),
    listPayouts(),
    listDiscountCodes(),
    listSubscriptions(),
  ]);
  const basePct = royaltyPercent();
  const userByArtistId = new Map(content.artists.map((a) => [a.id, a]));

  const byArtist = new Map<ID, ArtistEarnings>();
  const ensure = (artistId: ID): ArtistEarnings => {
    let agg = byArtist.get(artistId);
    if (!agg) {
      const artist = userByArtistId.get(artistId);
      const boost = artistBoost(artistId, subscriptions, content);
      agg = {
        artistId,
        artistName: artist?.name ?? null,
        royaltyPercent: basePct,
        salesCount: 0,
        grossToman: 0,
        royaltyToman: 0,
        affiliateCount: 0,
        affiliateToman: 0,
        affiliateRows: [],
        royaltyBoost: boost,
        paidOutToman: 0,
        balanceToman: 0,
        rows: [],
      };
      byArtist.set(artistId, agg);
    }
    return agg;
  };

  for (const p of paid) {
    const pattern = content.patterns.find((x) => x.id === p.patternId);
    // Phase 4 — Stripe rows are USD; royalties stay Toman-denominated so
    // convert with the stationary rate baked into the pricing (1 USD = % of price.en→fa).
    const grossToman =
      p.currency === "USD" && p.grossAmountMinor > 0 && pattern
        ? grossTomanFromUsd(p, priceForTier(pattern, p.license))
        : Math.round((p.gateway === "stripe" ? p.grossAmountMinor : p.amountRial) / (p.gateway === "stripe" ? 1 : 10));

    const artistId = pattern?.artistId ?? null;
    if (artistId) {
      const agg = ensure(artistId);
      const pctWithBoost = Math.min(90, basePct + agg.royaltyBoost);
      const royaltyToman = Math.round((grossToman * pctWithBoost) / 100);
      agg.salesCount += 1;
      agg.grossToman += grossToman;
      agg.royaltyToman += royaltyToman;
      agg.rows.push({
        orderId: p.orderId,
        at: p.createdAt,
        patternId: p.patternId,
        patternTitle: pattern?.title ?? null,
        license: p.license,
        grossToman,
        royaltyToman,
      });
    }

    // Phase 5 — affiliate commission on codes the artist handed out (any sale counts, incl. others' patterns)
    if (p.discountCode) {
      const code = codes.find((c) => c.code === p.discountCode!.toUpperCase());
      if (code?.artistId && code.commissionPercent > 0) {
        const agg = ensure(code.artistId);
        const commissionToman = Math.round((grossToman * code.commissionPercent) / 100);
        agg.affiliateCount += 1;
        agg.affiliateToman += commissionToman;
        agg.affiliateRows.push({
          orderId: p.orderId,
          at: p.createdAt,
          code: code.code,
          salePatternId: p.patternId,
          saleTitle: pattern?.title ?? null,
          saleGrossToman: grossToman,
          commissionToman,
        });
      }
    }
  }

  for (const pay of payouts) {
    ensure(pay.artistId).paidOutToman += pay.amountToman;
  }
  for (const agg of byArtist.values()) {
    agg.balanceToman = agg.royaltyToman + agg.affiliateToman - agg.paidOutToman;
    agg.rows.sort((a, b) => b.at.localeCompare(a.at));
    agg.affiliateRows.sort((a, b) => b.at.localeCompare(a.at));
  }

  return [...byArtist.values()];
}

/** Royalty boost from the artist's active subscription (Phase 5). */
function artistBoost(
  artistId: ID,
  subscriptions: Awaited<ReturnType<typeof listSubscriptions>>,
  content: Awaited<ReturnType<typeof getContent>>,
): number {
  const artist = content.artists.find((a) => a.id === artistId);
  if (!artist) return 0;
  const now = Date.now();
  const sub = subscriptions.find(
    (s) => s.artistId === artistId && (s.expiresAt === null || new Date(s.expiresAt).getTime() > now),
  );
  if (!sub) return 0;
  return planDef(sub.planId).royaltyBoost;
}

function priceForTier(pattern: { licensePrices?: Partial<Record<LicenseTier, { fa: number; en: number }>> }, license: LicenseTier): { fa: number; en: number } {
  return pattern.licensePrices?.[license] ?? DEFAULT_LICENSE_PRICES[license];
}

/** A USD sale's Toman equivalent: scale the tier's Toman price by the actual USD charged. */
function grossTomanFromUsd(
  p: { grossAmountMinor: number },
  tier: { fa: number; en: number },
): number {
  if (tier.en <= 0) return 0;
  return Math.round(tier.fa * (p.grossAmountMinor / 100 / tier.en));
}

export async function artistEarnings(artistId: ID): Promise<ArtistEarnings> {
  const all = await allEarnings();
  const found = all.find((a) => a.artistId === artistId);
  if (found) return found;
  const [content, subscriptions] = await Promise.all([getContent(), listSubscriptions()]);
  const artist = content.artists.find((a) => a.id === artistId);
  return {
    artistId,
    artistName: artist?.name ?? null,
    royaltyPercent: royaltyPercent(),
    salesCount: 0,
    grossToman: 0,
    royaltyToman: 0,
    affiliateCount: 0,
    affiliateToman: 0,
    affiliateRows: [],
    royaltyBoost: artistBoost(artistId, subscriptions, content),
    paidOutToman: 0,
    balanceToman: 0,
    rows: [],
  };
}
