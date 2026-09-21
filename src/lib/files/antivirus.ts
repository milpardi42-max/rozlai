import "server-only";

/**
 * ClamAV (clamd) integration — optional virus scanning for uploaded masters.
 *
 * Prefer a socket proxy in front of clamd when the app is deployed to a
 * different host than the ClamAV daemon; if CLAMAV_URL is set the buffer is
 * sent to that HTTP endpoint (must expose POST /scan → "OK" / "FOUND ..."),
 * otherwise we speak the clamd INSTREAM protocol directly over TCP
 * (CLAMAV_HOST + CLAMAV_PORT, defaults to 127.0.0.1:3310).
 *
 * Fail-open vs fail-closed: when the CLAMAV_ENABLED flag isn't set we skip
 * scanning entirely (dev default). When set but the daemon is unreachable the
 * upload is BLOCKED — a scanner that silently passes is worse than none.
 */

export type AvVerdict = { ok: true } | { ok: false; virus?: string; unavailable: boolean };

export function clamavEnabled(): boolean {
  return process.env.CLAMAV_ENABLED === "1";
}

const TIMEOUT_MS = 30_000;
/** clamd StreamMaxLength default is 25 MB; refuse earlier so big zips don't wedge the TCP stream. */
const MAX_SCAN_BYTES = 200 * 1024 * 1024;

export async function scanBuffer(buffer: Buffer, label = "upload"): Promise<AvVerdict> {
  if (!clamavEnabled()) return { ok: true };
  if (buffer.byteLength > MAX_SCAN_BYTES) {
    console.error(`[av] ${label}: ${buffer.byteLength} bytes exceeds scanner limit`);
    return { ok: false, unavailable: true };
  }

  const httpUrl = process.env.CLAMAV_URL?.trim();
  try {
    return httpUrl ? await scanViaHttp(httpUrl, buffer) : await scanViaTcp(buffer);
  } catch (e) {
    console.error(`[av] scanner unreachable for ${label}:`, e instanceof Error ? e.message : e);
    return { ok: false, unavailable: true };
  }
}

/** Simplest integration: any HTTP proxy that accepts a body and replies "OK" or "FOUND <sig>". */
async function scanViaHttp(url: string, buffer: Buffer): Promise<AvVerdict> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/scan`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(buffer),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, unavailable: true };
    const text = (await res.text()).trim();
    if (/^OK\b/i.test(text)) return { ok: true };
    const sig = /FOUND[:\s]+(.+)$/i.exec(text)?.[1];
    return { ok: false, virus: sig ?? "unknown", unavailable: false };
  } finally {
    clearTimeout(timer);
  }
}

/** clamd INSTREAM: "zINSTREAM\0" + [4-byte BE chunk size + chunk]* + 0-length. */
async function scanViaTcp(buffer: Buffer): Promise<AvVerdict> {
  const net = await import("net");
  const host = process.env.CLAMAV_HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.CLAMAV_PORT) || 3310;

  return new Promise<AvVerdict>((resolve) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    const finish = (v: AvVerdict) => {
      socket.destroy();
      resolve(v);
    };

    const timer = setTimeout(() => finish({ ok: false, unavailable: true }), TIMEOUT_MS);

    socket.on("error", () => {
      clearTimeout(timer);
      finish({ ok: false, unavailable: true });
    });

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const CHUNK = 1024 * 64;
      for (let off = 0; off < buffer.byteLength; off += CHUNK) {
        const slice = buffer.subarray(off, Math.min(off + CHUNK, buffer.byteLength));
        const head = Buffer.alloc(4);
        head.writeUInt32BE(slice.byteLength, 0);
        socket.write(Buffer.concat([head, slice]));
      }
      socket.write(Buffer.alloc(4)); // zero-length chunk = end of stream
    });

    socket.on("data", (d) => {
      chunks.push(d);
      const text = Buffer.concat(chunks).toString("latin1").trim();
      // clamd closes the connection after the verdict, but answer immediately when we can
      if (/^stream:\s*OK\b/i.test(text)) {
        clearTimeout(timer);
        finish({ ok: true });
      } else if (/^stream:\s*(.+?)\s*FOUND\b/i.test(text)) {
        clearTimeout(timer);
        finish({ ok: false, virus: /^stream:\s*(.+?)\s*FOUND\b/i.exec(text)?.[1], unavailable: false });
      }
    });

    socket.on("close", () => {
      clearTimeout(timer);
      const text = Buffer.concat(chunks).toString("latin1").trim();
      if (/^stream:\s*OK\b/i.test(text)) return finish({ ok: true });
      const m = /^stream:\s*(.+?)\s*FOUND\b/i.exec(text);
      if (m) return finish({ ok: false, virus: m[1], unavailable: false });
      if (!text) return; // socket error already resolved
      finish({ ok: false, unavailable: true });
    });
  });
}
