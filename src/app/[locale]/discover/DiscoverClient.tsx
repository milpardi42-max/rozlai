"use client";

import { useSearchParams } from "next/navigation";
import { ShopSidebar, type ShopSidebarProps } from "@/components/product/ShopSidebar";
import { MixedGrid, PatternGrid, ProductGrid } from "@/components/product/Grids";
import { CatalogLayout } from "@/components/product/FilterSidebar";
import type { PatternCardData } from "@/components/cards/PatternCard";
import type { ProductCardData } from "@/components/cards/ProductCard";
import type { FilterOption } from "@/components/product/FilterSidebar";

interface Props {
  locale: string;
  fa: boolean;
  patterns: PatternCardData[];
  products: ProductCardData[];
  categories: FilterOption[];
  sorts: FilterOption[];
}

export function DiscoverClient({ locale, fa, patterns, products, categories, sorts }: Props) {
  const sp = useSearchParams();
  const activeType = sp.get("type") ?? "all";

  const sidebarProps: ShopSidebarProps = {
    categories,
    sorts,
    fa,
    totalPatterns: patterns.length,
    totalProducts: products.length,
  };

  return (
    <div className="container-x pt-[calc(var(--announce-h,0px)+var(--header-h)+1.5rem)] pb-24">
      <CatalogLayout
        sidebar={<ShopSidebar {...sidebarProps} />}
      >
        <div className="mt-2 lg:mt-0">
          {activeType === "pattern" && <PatternGrid patterns={patterns} />}
          {activeType === "product" && <ProductGrid products={products} />}
          {activeType === "all"     && <MixedGrid patterns={patterns} products={products} locale={locale} />}
        </div>
      </CatalogLayout>
    </div>
  );
}
