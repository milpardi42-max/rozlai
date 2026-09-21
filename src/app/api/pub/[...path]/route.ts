import { NextResponse } from "next/server";
import { promises as fs, createReadStream } from "fs";
import { Readable as NodeReadable } from "stream";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), "public", "images", "uploads");

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function toWeb(nodeStream: NodeReadable): ReadableStream {
  return NodeReadable.toWeb(nodeStream) as unknown as ReadableStream;
}

/**
 * GET /api/pub/<file>
 * Runtime file server for user uploads.
 *
 * Why this exists: with `output: "standalone"` + a custom distDir, `next start`
 * snapshots /public at build time, so files uploaded at runtime never become
 * visible under /images/uploads/*. Locally-written uploads (dev / VPS / Docker
 * backend) are therefore served through this route instead of /public.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  if (!segments || segments.length !== 1) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  const name = segments[0]!;
  // content-hash filenames only: [a-z0-9-]+.<ext>
  if (!/^[a-z0-9][a-z0-9-]{6,64}\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(name)) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  const abs = path.join(UPLOADS_DIR, name);
  if (path.dirname(abs) !== UPLOADS_DIR) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  let stat;
  try {
    stat = await fs.stat(abs);
    if (!stat.isFile()) throw new Error("x");
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const ext = name.split(".").pop()!.toLowerCase();
  const headers = new Headers();
  headers.set("content-type", TYPES[ext] ?? "application/octet-stream");
  headers.set("content-length", String(stat.size));
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(toWeb(createReadStream(abs)), { status: 200, headers });
}
