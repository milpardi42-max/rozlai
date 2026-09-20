import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/ui/States";
import { enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { filterPatterns, filterProducts, type SP } from "@/lib/data/filters";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { t } from "@/lib/utils";
import { DiscoverClient } from "./DiscoverClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const fa = locale === "fa";
  return {
    title: fa ? "فروشگاه — الگوها و محصولات | رزی آتلیه" : "Shop — Patterns & Products | Rozi Atelier",
    description: fa
      ? "الگوهای اورجینال و محصولات اختصاصی رزی آتلیه را در یک‌جا کاوش و خریداری کنید."
      : "Browse and shop original patterns and exclusive products by Rozi Atelier in one place.",
  };
}

export default async function DiscoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SP & { type?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const site = await getSite();
  const d = dictionaries[locale];
  const fa = locale === "fa";

  // ── Maps ─────────────────────────────────────────────────────────────────
  const catMap   = Object.fromEntries(site.categories.map((c) => [c.slug, c.id]));
  const spaceMap = Object.fromEntries(site.spaces.map((s) => [s.slug, s.id]));

  // ── Filtered lists (strip "type" so it doesn't confuse filter fns) ────────
  const spWithoutType = { ...sp } as Record<string, string | string[] | undefined>;
  delete spWithoutType.type;

  const patterns  = filterPatterns(site.patterns, spWithoutType, catMap, spaceMap).map((p) => enrichPattern(site, p));
  const products  = filterProducts(site.products, spWithoutType, catMap).map((p)  => enrichProduct(site, p));

  // ── Shared categories: union of categories used by both patterns & products
  // Ordered by pattern usage (dominant identity), products contribute extra ones
  const patternCatIds = new Set(site.patterns.map((p) => p.categoryId));
  const productCatIds = new Set(site.products.map((p) => p.categoryId));
  const allUsedCatIds = new Set([...patternCatIds, ...productCatIds]);

  const categories = site.categories
    .filter((c) => allUsedCatIds.has(c.id))
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.slug,
      label: t(c.name, locale),
      // count = patterns + products in this category
      count:
        site.patterns.filter((p) => p.categoryId === c.id).length +
        site.products.filter((p) => p.categoryId === c.id).length,
    }));

  // ── Shared sorts — superset of both pages ────────────────────────────────
  const sorts = [
    { id: "new",        label: d.common.new },
    { id: "trending",   label: d.common.trending },
    { id: "best",       label: d.common.bestSeller },
    { id: "popular",    label: fa ? "محبوب‌ترین" : "Most liked" },
    { id: "price-asc",  label: fa ? "ارزان‌ترین" : "Price: low to high" },
    { id: "price-desc", label: fa ? "گران‌ترین"  : "Price: high to low" },
  ];

  return (
    <>
      <div id="catalog">
        <Suspense fallback={<GridSkeleton />}>
          <DiscoverClient
            locale={locale}
            fa={fa}
            patterns={patterns}
            products={products}
            categories={categories}
            sorts={sorts}
          />
        </Suspense>
      </div>
    </>
  );
}
