import "server-only";
import path from "path";
import crypto from "crypto";
import type { ID, LicenseTier } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { readJsonStore, writeJsonStore } from "@/lib/files/persist";

/**
 * Pending/finished payment records — survived the gateway redirect so the
 * callback can re-attach the purchase to its buyer.
 */

export type PaymentStatus = "pending" | "paid" | "failed";
export type PaymentGateway = "zarinpal" | "stripe";

export interface PaymentRecord {
  authority: string;
  orderId: string;
  patternId: ID;
  license: LicenseTier;
  userId: string;
  email: string; // lowercase
  locale: Locale;
  /** Amount in Rial, as sent to the gateway (or the Toman amount ×10 in mock). */
  amountRial: number;
  /** Phase 4 — which gateway owns this payment (existing rows default to zarinpal). */
  gateway: PaymentGateway;
  /** Billing currency shown to the buyer ("IRR" Toman-derived, or "USD" for Stripe). */
  currency: "IRR" | "USD";
  /** Nominal amount BEFORE any discount, in the gateway's minor unit (Rial / US cents). */
  grossAmountMinor: number;
  /** Phase 5 — affiliate/discount code applied at checkout, if any. */
  discountCode?: string;
  /** Phase 5 — when set this payment buys an artist subscription, not a licence. */
  planId?: string;
  status: PaymentStatus;
  refId?: string;
  createdAt: string;
}

const KEY = "rosie-atelier:payments";
const FILE = path.join(process.cwd(), "data", "payments.json");

async function readAll(): Promise<PaymentRecord[]> {
  return readJsonStore<PaymentRecord>(KEY, FILE);
}

async function writeAll(rows: PaymentRecord[]): Promise<void> {
  return writeJsonStore(KEY, FILE, rows);
}

export async function createPayment(data: Omit<PaymentRecord, "authority" | "status" | "createdAt">): Promise<PaymentRecord> {
  const rows = await readAll();
  const rec: PaymentRecord = {
    ...data,
    authority: `${Date.now().toString(36)}${crypto.randomBytes(8).toString("hex")}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await writeAll([rec, ...rows]);
  return rec;
}

export async function getPayment(authority: string): Promise<PaymentRecord | null> {
  const rows = await readAll();
  return rows.find((r) => r.authority === authority) ?? null;
}

/**
 * Re-key a payment once the gateway answers with its own authority
 * (ZarinPal's random string, or MOCK-… in dev mode). No-op if unchanged.
 */
export async function rekeyPayment(oldAuthority: string, newAuthority: string): Promise<void> {
  if (oldAuthority === newAuthority) return;
  const rows = await readAll();
  const idx = rows.findIndex((r) => r.authority === oldAuthority);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], authority: newAuthority };
  await writeAll(rows);
}

export async function setPaymentResult(
  authority: string,
  status: PaymentStatus,
  refId?: string,
): Promise<PaymentRecord | null> {  const rows = await readAll();
  const idx = rows.findIndex((r) => r.authority === authority);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], status, ...(refId ? { refId } : {}) };
  await writeAll(rows);
  return rows[idx];
}

/** All successfully-settled payments (Phase 3 earnings derive from these). */
export async function listPaidPayments(): Promise<PaymentRecord[]> {
  const rows = await readAll();
  return rows.filter((r) => r.status === "paid");
}
