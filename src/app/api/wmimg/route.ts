import { NextResponse } from "next/server";
import { promises as fs, createReadStream } from "fs";
import { Readable as NodeReadable } from "stream";
import path from "path";
import crypto from "crypto";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { watermarkBuffer } from "@/lib/files/watermark";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const CACHE_DIR = path.join(process.cwd(), "data", "wm-cache");
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

function toWeb(nodeStream: NodeReadable): ReadableStream {
  return NodeReadable.toWeb(nodeStream) as unknown as ReadableStream;
}

function webpResponse(stream: ReadableStream, size: number, extra?: Record<string, string>) {
  const headers = new Headers();
  headers.set("content-type", "image/webp");
  headers.set("content-length", String(size));
  headers.set("cache-control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
  headers.set("x-content-type-options", "nosniff");
  if (extra) for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(stream, { status: 200, headers });
}

/**
 * GET /api/wmimg?src=/images/…
 * On-demand watermarked proxy for LOCAL public images. Only ever reads files
 * under public/images/ (path-traversal guarded), bakes the overlay on first
 * request and caches the derivative on disk. If the bake can't run (tiny or
 * corrupt source), the original file is streamed with a marker header.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  let src = url.searchParams.get("src") ?? "";

  // /api/pub/<file> URLs identify uploads written at runtime — resolve them to
  // their on-disk location under public/images/uploads/.
  if (src.startsWith("/api/pub/")) {
    src = `/images/uploads/${src.slice("/api/pub/".length)}`;
  }

  if (!src.startsWith("/images/") || src.includes("..") || src.includes("\\") || src.length > 300) {
    return NextResponse.json({ ok: false, error: "invalid_src" }, { status: 400 });
  }

  const abs = path.normalize(path.join(PUBLIC_DIR, src));
  if (!abs.startsWith(path.join(PUBLIC_DIR, "images"))) {
    return NextResponse.json({ ok: false, error: "invalid_src" }, { status: 400 });
  }

  let stat;
  try {
    stat = await fs.stat(abs);
    if (!stat.isFile()) throw new Error("not_a_file");
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (stat.size > MAX_SOURCE_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  const cacheKey = crypto.createHash("sha1").update(`${abs}:${stat.mtimeMs}:${stat.size}`).digest("hex").slice(0, 16);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.webp`);

  // ── cache hit: zero CPU, zero rate-limit budget ──────────────────
  try {
    const cs = await fs.stat(cachePath);
    if (cs.isFile() && cs.size > 0) {
      return webpResponse(toWeb(createReadStream(cachePath)), cs.size, { "x-wm-cache": "hit" });
    }
  } catch {
    /* miss */
  }

  // ── cache miss: budgeted encode work ─────────────────────────────
  const rlKey = `wmimg:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    const retryAfter = retryAfterSeconds(rlKey);
    const res = NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  const source = await fs.readFile(abs);
  const baked = await watermarkBuffer(source);

  if (!baked) {
    // fail-open: serve the original bytes (tiny thumbs / vip failures)
    const headers = new Headers();
    headers.set("content-type", src.endsWith(".png") ? "image/png" : src.endsWith(".webp") ? "image/webp" : "image/jpeg");
    headers.set("content-length", String(source.length));
    headers.set("cache-control", "public, max-age=3600");
    headers.set("x-wm", "skipped");
    return new Response(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer, {
      status: 200,
      headers,
    });
  }

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cachePath, baked).catch(() => undefined);
  return webpResponse(new Blob([new Uint8Array(baked)]).stream(), baked.length, { "x-wm-cache": "miss" });
}
