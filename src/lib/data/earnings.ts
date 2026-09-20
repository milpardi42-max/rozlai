import "server-only";
import type { ID } from "@/lib/types";
import type { LicenseTier } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";
import { getContent } from "@/lib/data/store";
import { listPayouts, royaltyPercent } from "@/lib/data/payouts";
import { listPaidPayments } from "@/lib/data/payments";

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

export interface ArtistEarnings {
  artistId: ID;
  artistName: Localized | null;
  royaltyPercent: number;
  salesCount: number;
  grossToman: number;
  royaltyToman: number;
  paidOutToman: number;
  balanceToman: number;
  rows: EarningRow[];
}

export async function allEarnings(): Promise<ArtistEarnings[]> {
  const [content, paid, payouts] = await Promise.all([getContent(), listPaidPayments(), listPayouts()]);
  const pct = royaltyPercent();

  const byArtist = new Map<ID, ArtistEarnings>();
  const ensure = (artistId: ID): ArtistEarnings => {
    let agg = byArtist.get(artistId);
    if (!agg) {
      const artist = content.artists.find((a) => a.id === artistId);
      agg = {
        artistId,
        artistName: artist?.name ?? null,
        royaltyPercent: pct,
        salesCount: 0,
        grossToman: 0,
        royaltyToman: 0,
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
    const artistId = pattern?.artistId ?? null;
    if (!artistId) continue; // site-owned designs → no artist royalty
    const agg = ensure(artistId);
    const grossToman = Math.round(p.amountRial / 10);
    const royaltyToman = Math.round((grossToman * pct) / 100);
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

  for (const pay of payouts) {
    ensure(pay.artistId).paidOutToman += pay.amountToman;
  }
  for (const agg of byArtist.values()) {
    agg.balanceToman = agg.royaltyToman - agg.paidOutToman;
    agg.rows.sort((a, b) => b.at.localeCompare(a.at));
  }

  return [...byArtist.values()];
}

export async function artistEarnings(artistId: ID): Promise<ArtistEarnings> {
  const all = await allEarnings();
  const found = all.find((a) => a.artistId === artistId);
  if (found) return found;
  const content = await getContent();
  const artist = content.artists.find((a) => a.id === artistId);
  return {
    artistId,
    artistName: artist?.name ?? null,
    royaltyPercent: royaltyPercent(),
    salesCount: 0,
    grossToman: 0,
    royaltyToman: 0,
    paidOutToman: 0,
    balanceToman: 0,
    rows: [],
  };
}
