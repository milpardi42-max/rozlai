import "server-only";
import path from "path";
import crypto from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/files/persist";

/**
 * Discount & affiliate codes (Phase 5).
 * A code reduces a digital-licence price by a percentage. When `artistId` is
 * set the code doubles as an AFFILIATE code: that artist earns
 * `commissionPercent` of the *discounted* gross for every redemption, tracked
 * in their earnings balance like royalty but sourced from the platform's cut.
 */

export interface DiscountCode {
  id: string;
  /** uppercase, unique, e.g. NOWRUZ35 */
  code: string;
  /** 1–90 — percent taken off the licence price */
  percentOff: number;
  active: boolean;
  maxUses: number; // 0 = unlimited
  uses: number;
  expiresAt: string | null;
  /** Affiliate: artist who earns commission on redemptions */
  artistId: string | null;
  /** Affiliate commission: percent of discounted gross credited to artistId */
  commissionPercent: number;
  createdBy: string;
  createdAt: string;
}

const KEY = "rosie-atelier:discount-codes";
const FILE = path.join(process.cwd(), "data", "discount-codes.json");

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  const rows = await readJsonStore<DiscountCode>(KEY, FILE);
  return rows;
}

export async function createDiscountCode(data: {
  code?: string; // auto when omitted
  percentOff: number;
  maxUses?: number;
  expiresAt?: string | null;
  artistId?: string | null;
  commissionPercent?: number;
  createdBy: string;
}): Promise<DiscountCode | { error: string }> {
  const rows = await readJsonStore<DiscountCode>(KEY, FILE);
  const code = normalizeCode(data.code ?? crypto.randomBytes(4).toString("hex"));
  if (code.length < 4) return { error: "code_too_short" };
  if (rows.some((r) => r.code === code)) return { error: "code_taken" };
  const percentOff = Math.round(data.percentOff);
  if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 90) return { error: "bad_percent" };
  const commissionPercent = Math.round(data.commissionPercent ?? 0);
  if (commissionPercent < 0 || commissionPercent > 50) return { error: "bad_commission" };

  const rec: DiscountCode = {
    id: `dc_${crypto.randomBytes(6).toString("hex")}`,
    code,
    percentOff,
    active: true,
    maxUses: Math.max(0, Math.round(data.maxUses ?? 0)),
    uses: 0,
    expiresAt: data.expiresAt ?? null,
    artistId: data.artistId ?? null,
    commissionPercent,
    createdBy: data.createdBy,
    createdAt: new Date().toISOString(),
  };
  await writeJsonStore(KEY, FILE, [rec, ...rows]);
  return rec;
}

export async function setDiscountActive(id: string, active: boolean): Promise<boolean> {
  const rows = await readJsonStore<DiscountCode>(KEY, FILE);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  rows[idx] = { ...rows[idx]!, active };
  await writeJsonStore(KEY, FILE, rows);
  return true;
}

export async function deleteDiscountCode(id: string): Promise<boolean> {
  const rows = await readJsonStore<DiscountCode>(KEY, FILE);
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await writeJsonStore(KEY, FILE, next);
  return true;
}

export type DiscountResolution =
  | { ok: true; record: DiscountCode; discountedToman: number; discountedUsdCents: number }
  | { ok: false; error: "not_found" | "inactive" | "expired" | "exhausted" };

/**
 * Validate a code against a price. Discounts never go to zero — the gateway
 * minimum is floor(1% of gross).
 */
export async function resolveDiscountCode(
  rawCode: string,
  grossToman: number,
  grossUsdCents: number,
): Promise<DiscountResolution> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "not_found" };
  const rows = await readJsonStore<DiscountCode>(KEY, FILE);
  const rec = rows.find((r) => r.code === code);
  if (!rec) return { ok: false, error: "not_found" };
  if (!rec.active) return { ok: false, error: "inactive" };
  if (rec.expiresAt && new Date(rec.expiresAt).getTime() < Date.now()) return { ok: false, error: "expired" };
  if (rec.maxUses > 0 && rec.uses >= rec.maxUses) return { ok: false, error: "exhausted" };

  const payFactor = (100 - rec.percentOff) / 100;
  const discountedToman = Math.max(1, Math.round(grossToman * payFactor));
  const discountedUsdCents = Math.max(50, Math.round(grossUsdCents * payFactor)); // Stripe min charge $0.50
  return { ok: true, record: rec, discountedToman, discountedUsdCents };
}

/** Called once per *verified* payment so abandoned checkouts don't burn uses. */
export async function redeemDiscountCode(code: string): Promise<void> {
  const rows = await readJsonStore<DiscountCode>(KEY, FILE);
  const idx = rows.findIndex((r) => r.code === normalizeCode(code));
  if (idx === -1) return;
  rows[idx] = { ...rows[idx]!, uses: rows[idx]!.uses + 1 };
  await writeJsonStore(KEY, FILE, rows);
}

export async function getDiscountCode(code: string): Promise<DiscountCode | null> {
  const rows = await readJsonStore<DiscountCode>(KEY, FILE);
  return rows.find((r) => r.code === normalizeCode(code)) ?? null;
}
