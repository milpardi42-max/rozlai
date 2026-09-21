import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent } from "@/lib/data/store";
import { getEntitlement } from "@/lib/data/entitlements";
import { listApprovedForPattern } from "@/lib/files/storage";
import { toPublicMeta } from "@/lib/files/types";
import { generateCertificatePdf } from "@/lib/license/certificate";
import { LICENSE_COVERAGE } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/license/[entitlementId]
 * The official PDF licence certificate — owner (or admin) only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ entitlementId: string }> }) {
  const { entitlementId } = await ctx.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }

  const ent = await getEntitlement(entitlementId);
  if (!ent) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }
  const ownsIt = ent.userId === session.id || ent.email === session.email.toLowerCase() || session.role === "admin";
  if (!ownsIt) {
    return NextResponse.json({ ok: false, error: "forbidden" }, withNoStore({ status: 403 }));
  }

  const content = await getContent();
  const pattern = content.patterns.find((p) => p.id === ent.patternId);
  const artist = pattern?.artistId ? content.artists.find((a) => a.id === pattern.artistId) : null;

  const approved = await listApprovedForPattern(ent.patternId);
  const covered = new Set(LICENSE_COVERAGE[ent.license]);
  const files = approved.filter((f) => covered.has(f.tier)).map(toPublicMeta);

  const pdf = generateCertificatePdf({
    entitlement: ent,
    patternTitleEn: pattern?.title.en || pattern?.title.fa || "Digital pattern",
    patternSku: pattern?.sku ?? "—",
    artistNameEn: artist?.name.en || artist?.name.fa || "Rosie Atelier",
    files,
  });

  const headers = new Headers();
  headers.set("content-type", "application/pdf");
  headers.set("content-length", String(pdf.byteLength));
  headers.set("content-disposition", `attachment; filename="rosie-licence-${ent.orderId}.pdf"`);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");

  return new Response(new Uint8Array(pdf), { status: 200, headers });
}
