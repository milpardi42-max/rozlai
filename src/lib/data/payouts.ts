import "server-only";
import path from "path";
import crypto from "crypto";
import type { ID } from "@/lib/types";
import { readJsonStore, writeJsonStore } from "@/lib/files/persist";

/**
 * Artist payout ledger (Phase 3 — royalty settlements).
 * Each record marks a settled amount paid OUT to an artist by the site.
 * Balances = Σ(royalty from paid orders) − Σ(payouts).
 */

export interface PayoutRecord {
  id: ID;
  artistId: ID;
  /** Free-form recipient note: IBAN, card, receipt no… */
  method: string;
  /** Amount paid out, in Toman (payments store Rial; UI works in Toman) */
  amountToman: number;
  note?: string;
  createdBy: string; // admin user id
  createdAt: string;
}

const KEY = "rosie-atelier:payouts";
const FILE = path.join(process.cwd(), "data", "payouts.json");

export async function listPayouts(artistId?: string): Promise<PayoutRecord[]> {
  const rows = await readJsonStore<PayoutRecord>(KEY, FILE);
  return artistId ? rows.filter((r) => r.artistId === artistId) : rows;
}

export async function addPayout(data: Omit<PayoutRecord, "id" | "createdAt">): Promise<PayoutRecord> {
  const rows = await readJsonStore<PayoutRecord>(KEY, FILE);
  const rec: PayoutRecord = {
    ...data,
    id: `pay_${crypto.randomBytes(8).toString("hex")}`,
    createdAt: new Date().toISOString(),
  };
  await writeJsonStore(KEY, FILE, [rec, ...rows]);
  return rec;
}

/** ARTIST_ROYALTY_PERCENT env (0–90), default 70. */
export function royaltyPercent(): number {
  const n = Number(process.env.ARTIST_ROYALTY_PERCENT);
  if (!Number.isFinite(n)) return 70;
  return Math.max(0, Math.min(90, Math.round(n)));
}
