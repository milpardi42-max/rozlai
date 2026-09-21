import { promises as fs } from "fs";
import path from "path";

/** Shared JSON-file / Upstash-Redis dual persistence used by the digital-sale
 * registries (payments + entitlements). Mirrors src/lib/data/orders.ts. */

export function redisEnabled(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function redisCmd(args: string[]): Promise<{ result: unknown }> {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()) as { result: unknown };
}

export async function readJsonStore<T>(redisKey: string, filePath: string): Promise<T[]> {
  try {
    if (redisEnabled()) {
      const { result } = await redisCmd(["GET", redisKey]);
      if (typeof result === "string") return JSON.parse(result) as T[];
      return [];
    }
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export async function writeJsonStore<T>(redisKey: string, filePath: string, rows: T[]): Promise<void> {
  if (redisEnabled()) {
    await redisCmd(["SET", redisKey, JSON.stringify(rows)]);
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(rows, null, 2), "utf8");
}
