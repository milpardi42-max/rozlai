"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CatalogLayout, FilterSidebar, type CategoryGroup, type FilterGroup, type FilterOption } from "@/components/product/FilterSidebar";
import { ProductGrid } from "@/components/product/Grids";
import { GridSkeleton } from "@/components/ui/States";
import { filterProducts } from "@/lib/data/filters";
import { enrichProduct } from "@/lib/data/enrich";
import type { Locale } from "@/lib/i18n/types";
import type { SiteContent } from "@/lib/types";

interface Props {
  site: SiteContent;
  locale: Locale;
  categories: FilterOption[];
  categoryGroups?: CategoryGroup[];
  sorts: FilterOption[];
  extra: FilterGroup[];
  title?: string;
}

function FilteredContent({ site, categories, categoryGroups, sorts, extra, title }: Props) {
  const sp = useSearchParams();

  const spRecord: Record<string, string | undefined> = {};
  sp.forEach((value, key) => {
    spRecord[key] = value;
  });

  const catMap = Object.fromEntries(site.categories.map((c) => [c.slug, c.id]));
  const list = filterProducts(site.products, spRecord, catMap).map((p) => enrichProduct(site, p));

  return (
    <CatalogLayout
      sidebar={
        <FilterSidebar
          total={list.length}
          categories={categories}
          categoryGroups={categoryGroups}
          sorts={sorts}
          extra={extra}
          title={title}
        />
      }
    >
      <div className="mt-2 lg:mt-0">
        <ProductGrid products={list} />
      </div>
    </CatalogLayout>
  );
}

export function ShopFiltered(props: Props) {
  return (
    <Suspense fallback={<GridSkeleton ratio="aspect-square" />}>
      <FilteredContent {...props} />
    </Suspense>
  );
}
