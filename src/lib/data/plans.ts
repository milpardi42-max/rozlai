import "server-only";
import path from "path";
import { readJsonStore, writeJsonStore } from "@/lib/files/persist";

/**
 * Artist subscription plans (Phase 5).
 * Plans gate upload quotas (patterns/products) and polishing features. The
 * current period is stored on the artist record; admins set it from the
 * payouts/artists admin UI. (Self-serve billing for plans lands with Phase-4
 * Stripe on the storefront side — Iran-side artists are billed manually.)
 */

export interface PlanDef {
  id: "starter" | "basic" | "pro" | "studio";
  /** monthly price — Toman / USD */
  priceToman: number;
  priceUsd: number;
  patternQuota: number; // active patterns
  productQuota: number; // active products
  /** royalty override (percent) over ARTIST_ROYALTY_PERCENT, capped 90 */
  royaltyBoost: number;
}

export const PLANS: readonly PlanDef[] = [
  { id: "starter", priceToman: 0, priceUsd: 0, patternQuota: 3, productQuota: 1, royaltyBoost: 0 },
  { id: "basic", priceToman: 149_000, priceUsd: 9.99, patternQuota: 10, productQuota: 5, royaltyBoost: 0 },
  { id: "pro", priceToman: 349_000, priceUsd: 24.99, patternQuota: 50, productQuota: 25, royaltyBoost: 5 },
  { id: "studio", priceToman: 749_000, priceUsd: 49.99, patternQuota: 500, productQuota: 200, royaltyBoost: 10 },
] as const;

export function planDef(id: string | null | undefined): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]!;
}

export interface ArtistSubscription {
  userId: string;
  artistId: string | null;
  planId: PlanDef["id"];
  startedAt: string;
  /** ISO — null = open-ended (granted) */
  expiresAt: string | null;
  note?: string;
  setBy: string;
}

const KEY = "rosie-atelier:subscriptions";
const FILE = path.join(process.cwd(), "data", "subscriptions.json");

async function readAll(): Promise<ArtistSubscription[]> {
  return readJsonStore<ArtistSubscription>(KEY, FILE);
}

export async function getSubscription(userId: string): Promise<ArtistSubscription> {
  const rows = await readAll();
  const now = Date.now();
  const active = rows.find(
    (r) => r.userId === userId && (r.expiresAt === null || new Date(r.expiresAt).getTime() > now),
  );
  return (
    active ?? {
      userId,
      artistId: null,
      planId: "starter",
      startedAt: new Date(now).toISOString(),
      expiresAt: null,
      setBy: "system",
    }
  );
}

export async function listSubscriptions(): Promise<ArtistSubscription[]> {
  return readAll();
}

export async function setSubscription(
  sub: Omit<ArtistSubscription, "startedAt"> & { startedAt?: string },
): Promise<ArtistSubscription> {
  const rows = await readAll();
  const next = rows.filter((r) => r.userId !== sub.userId);
  const rec: ArtistSubscription = { ...sub, startedAt: sub.startedAt ?? new Date().toISOString() };
  await writeJsonStore(KEY, FILE, [rec, ...next]);
  return rec;
}

/**
 * Quota check for a new upload of `kind`. Returns null when allowed, else the
 * human-readable plan message. Counted by the caller from the content store.
 */
export function quotaExceeded(
  plan: PlanDef,
  kind: "pattern" | "product",
  currentCount: number,
): { limit: number } | null {
  const limit = kind === "pattern" ? plan.patternQuota : plan.productQuota;
  return currentCount >= limit ? { limit } : null;
}
