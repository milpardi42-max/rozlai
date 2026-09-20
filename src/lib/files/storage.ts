import "server-only";
import { promises as fs, createReadStream } from "fs";
import { Readable as NodeReadable } from "stream";
import path from "path";
import crypto from "crypto";
import type { DeliverableFile } from "@/lib/files/types";
import { readJsonStore, writeJsonStore } from "@/lib/files/persist";

/**
 * Private master-file storage + registry.
 *
 * Binary backends (first configured wins):
 *   1. S3-compatible — Cloudflare R2 / Backblaze B2 / AWS S3
 *      (S3_ENDPOINT + S3_BUCKET + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY, S3_REGION optional)
 *      → downloads are served by short-lived presigned GET URLs.
 *   2. Local private dir — data/private/ (outside public/, only reachable
 *      through the authenticated /api/download route).
 *
 * Metadata registry (DeliverableFile records) uses the repo's standard
 * dual-backend pattern: Upstash Redis, else data/files.json.
 */

/* ─── S3 Signature V4 (minimal, dependency-free) ─────────────────── */

function s3Config() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  return {
    endpoint: S3_ENDPOINT.replace(/\/$/, ""),
    bucket: S3_BUCKET,
    region: process.env.S3_REGION || "auto",
    accessKey: S3_ACCESS_KEY_ID,
    secretKey: S3_SECRET_ACCESS_KEY,
  };
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function uriEncode(str: string, encodeSlash = false): string {
  return str
    .split("")
    .map((ch) => {
      if (/[A-Za-z0-9\-._~]/.test(ch)) return ch;
      if (ch === "/" && !encodeSlash) return ch;
      return encodeURIComponent(ch);
    })
    .join("");
}

/**
 * Build a SigV4 presigned URL for `method` on `key`.
 * Works for GET (download) and PUT (upload proxy). Valid `expires` seconds.
 */
export function presignS3Url(method: "GET" | "PUT", key: string, expires: number): string | null {
  const cfg = s3Config();
  if (!cfg) return null;

  const host = `${cfg.bucket}.${new URL(cfg.endpoint).host}`;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const amzDate = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${cfg.accessKey}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  };
  query["X-Amz-Content-Sha256"] = "UNSIGNED-PAYLOAD";

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join("&");
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    method,
    uriEncode(`/${key}`),
    canonicalQuery,
    canonicalHeaders,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${cfg.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  return `https://${host}${uriEncode(`/${key}`)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/* ─── Binary operations ──────────────────────────────────────────── */

const PRIVATE_DIR = path.join(process.cwd(), "data", "private");

/** Persist a master file's bytes into the active backend. Returns the storage key. */
export async function storeBinary(buffer: Buffer, ext: string): Promise<{ storageKey: string; backend: DeliverableFile["backend"]; sha256: string }> {
  const sha256 = sha256Hex(buffer);
  const key = `files/${sha256.slice(0, 24)}.${ext}`;
  const cfg = s3Config();

  if (cfg) {
    const url = presignS3Url("PUT", key, 900);
    if (!url) throw new Error("s3_presign_failed");
    const res = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) throw new Error(`s3_put_${res.status}`);
    return { storageKey: key, backend: "s3", sha256 };
  }

  await fs.mkdir(PRIVATE_DIR, { recursive: true });
  await fs.writeFile(path.join(PRIVATE_DIR, path.basename(key)), buffer);
  return { storageKey: path.basename(key), backend: "local", sha256 };
}

/** Open a local private file as a web stream (authenticated routes only). */
export async function openLocalStream(key: string): Promise<{ stream: ReadableStream; size: number } | null> {
  const safe = path.basename(key); // path-traversal guard
  const full = path.join(PRIVATE_DIR, safe);
  try {
    const stat = await fs.stat(full);
    if (!stat.isFile()) return null;
    const nodeStream = createReadStream(full);
    return { stream: nodeStreamToWeb(nodeStream), size: stat.size };
  } catch {
    return null;
  }
}

function nodeStreamToWeb(nodeStream: NodeReadable): ReadableStream {
  // Readable.toWeb exists but returns a typed ReadableStream in @types/node;
  // cast through unknown for Response compatibility.
  return NodeReadable.toWeb(nodeStream) as unknown as ReadableStream;
}

/** Presigned download URL when the S3 backend is active (5-minute validity). */
export function presignDownload(key: string, filename: string): string | null {
  const url = presignS3Url("GET", key, 300);
  if (!url) return null;
  // Best-effort content-disposition override (supported by R2/B2 for signed URLs).
  return `${url}&response-content-disposition=${encodeURIComponent(`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)}`;
}

/** Delete a local private file (S3 lifecycle handled by bucket rules in Phase 1). */
export async function deleteLocal(key: string): Promise<void> {
  try {
    await fs.unlink(path.join(PRIVATE_DIR, path.basename(key)));
  } catch {
    /* already gone */
  }
}

export function storageBackendLabel(): string {
  return s3Config() ? "s3" : "local";
}

/* ─── Metadata registry (DeliverableFile records) ─────────────────── */

const REGISTRY_KEY = "rosie-atelier:files";
const REGISTRY_FILE = path.join(process.cwd(), "data", "files.json");

async function readRegistry(): Promise<DeliverableFile[]> {
  return readJsonStore<DeliverableFile>(REGISTRY_KEY, REGISTRY_FILE);
}

async function writeRegistry(files: DeliverableFile[]): Promise<void> {
  return writeJsonStore(REGISTRY_KEY, REGISTRY_FILE, files);
}

export async function listFiles(): Promise<DeliverableFile[]> {
  return readRegistry();
}

export async function getFile(id: string): Promise<DeliverableFile | null> {
  const files = await readRegistry();
  return files.find((f) => f.id === id) ?? null;
}

export async function addFile(record: DeliverableFile): Promise<void> {
  const files = await readRegistry();
  await writeRegistry([record, ...files]);
}

export async function setFileStatus(id: string, status: DeliverableFile["status"], note?: string): Promise<DeliverableFile | null> {
  const files = await readRegistry();
  const idx = files.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  files[idx] = { ...files[idx], status, note: note ?? files[idx].note };
  await writeRegistry(files);
  return files[idx];
}

/** Approved deliverables for a pattern (what buyers can receive). */
export async function listApprovedForPattern(patternId: string): Promise<DeliverableFile[]> {
  const files = await readRegistry();
  return files.filter((f) => f.patternId === patternId && f.status === "approved");
}
