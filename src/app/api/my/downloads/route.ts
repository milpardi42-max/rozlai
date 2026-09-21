import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent } from "@/lib/data/store";
import { listEntitlementsFor, downloadCountFor } from "@/lib/data/entitlements";
import { listApprovedForPattern } from "@/lib/files/storage";
import { toPublicMeta } from "@/lib/files/types";
import { LICENSE_COVERAGE } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/my/downloads — the signed-in buyer's digital library:
 * entitlements + the approved files each licence covers, with per-file
 * remaining downloads. Never leaks storage keys or other buyers' data.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }

  const [ents, content] = await Promise.all([
    listEntitlementsFor(session.id, session.email),
    getContent(),
  ]);

  const now = Date.now();
  const items = await Promise.all(
    ents.map(async (ent) => {
      const pattern = content.patterns.find((p) => p.id === ent.patternId);
      const approved = await listApprovedForPattern(ent.patternId);
      const covered = new Set(LICENSE_COVERAGE[ent.license]);
      const files = approved
        .filter((f) => covered.has(f.tier))
        .map((f) => ({
          ...toPublicMeta(f),
          downloadsUsed: downloadCountFor(ent, f.id),
          downloadsLeft: Math.max(0, ent.maxDownloads - downloadCountFor(ent, f.id)),
        }));

      return {
        id: ent.id,
        orderId: ent.orderId,
        license: ent.license,
        createdAt: ent.createdAt,
        expiresAt: ent.expiresAt,
        expired: Date.parse(ent.expiresAt) <= now,
        maxDownloads: ent.maxDownloads,
        pattern: pattern
          ? { id: pattern.id, slug: pattern.slug, title: pattern.title, image: pattern.image }
          : null,
        files,
      };
    }),
  );

  return NextResponse.json({ ok: true, items }, withNoStore());
}
