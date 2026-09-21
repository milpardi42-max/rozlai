import "server-only";
import path from "path";
import crypto from "crypto";
import type { ID, LicenseTier } from "@/lib/types";
import { readJsonStore, writeJsonStore } from "@/lib/files/persist";

/**
 * Entitlements — a buyer's right to download a pattern's master files.
 * Created after a verified payment; consumed by /api/download.
 */

export interface DownloadEvent {
  fileId: string;
  at: string;
  ip: string;
}

export interface Entitlement {
  id: ID;
  userId: string;
  email: string; // lowercase
  patternId: ID;
  license: LicenseTier;
  orderId: string;
  maxDownloads: number; // per-file download cap
  downloads: DownloadEvent[];
  createdAt: string;
  expiresAt: string; // ISO — buyer keeps access until this date
}

/** Industry-standard defaults: 10 downloads per file, 90-day access window. */
export const ENTITLEMENT_MAX_DOWNLOADS_PER_FILE = 10;
export const ENTITLEMENT_WINDOW_DAYS = 90;

const KEY = "rosie-atelier:entitlements";
const FILE = path.join(process.cwd(), "data", "entitlements.json");

async function readAll(): Promise<Entitlement[]> {
  return readJsonStore<Entitlement>(KEY, FILE);
}

async function writeAll(rows: Entitlement[]): Promise<void> {
  return writeJsonStore(KEY, FILE, rows);
}

export async function createEntitlement(data: {
  userId: string;
  email: string;
  patternId: ID;
  license: LicenseTier;
  orderId: string;
}): Promise<Entitlement> {
  const rows = await readAll();
  const now = Date.now();
  const ent: Entitlement = {
    id: `ent_${crypto.randomBytes(8).toString("hex")}`,
    userId: data.userId,
    email: data.email.toLowerCase(),
    patternId: data.patternId,
    license: data.license,
    orderId: data.orderId,
    maxDownloads: ENTITLEMENT_MAX_DOWNLOADS_PER_FILE,
    downloads: [],
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ENTITLEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
  await writeAll([ent, ...rows]);
  return ent;
}

export async function getEntitlement(id: string): Promise<Entitlement | null> {
  const rows = await readAll();
  return rows.find((r) => r.id === id) ?? null;
}

export async function listEntitlementsFor(userId: string | undefined, email: string | undefined): Promise<Entitlement[]> {
  const rows = await readAll();
  const mail = email?.toLowerCase();
  return rows.filter((r) => (userId && r.userId === userId) || (mail && r.email === mail));
}

export async function hasEntitlementFor(patternId: string, userId?: string, email?: string): Promise<boolean> {
  const list = await listEntitlementsFor(userId, email);
  const now = Date.now();
  return list.some((r) => r.patternId === patternId && Date.parse(r.expiresAt) > now);
}

export function downloadCountFor(ent: Entitlement, fileId: string): number {
  return ent.downloads.filter((d) => d.fileId === fileId).length;
}

/** Record a successful download against the entitlement. */
export async function recordDownload(entId: string, fileId: string, ip: string): Promise<Entitlement | null> {
  const rows = await readAll();
  const idx = rows.findIndex((r) => r.id === entId);
  if (idx === -1) return null;
  rows[idx] = {
    ...rows[idx],
    downloads: [...rows[idx].downloads, { fileId, at: new Date().toISOString(), ip }],
  };
  await writeAll(rows);
  return rows[idx];
}
