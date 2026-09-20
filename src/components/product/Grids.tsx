"use client";

import { Layers, ShoppingBag } from "lucide-react";
import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils";

/** Editorial pattern grid: every 7th item becomes a wide feature — controlled variation. */
export function PatternGrid({ patterns, className }: { patterns: PatternCardData[]; className?: string }) {
  if (!patterns.length) return <EmptyState />;
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4", className)}>
      {patterns.map((p, i) => {
        const feature = i % 7 === 0 && patterns.length > 3;
        return (
          <Reveal key={p.id} delay={(i % 4) * 50} className={cn(feature && "col-span-2")}>
            <PatternCard pattern={p} variant={feature ? "wide" : "default"} priority={i < 4} />
          </Reveal>
        );
      })}
    </div>
  );
}

export function ProductGrid({ products, className }: { products: ProductCardData[]; className?: string }) {
  if (!products.length) return <EmptyState />;
  return (
    <div className={cn("grid grid-cols-1 gap-x-4 gap-y-8 xs:grid-cols-2 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <Reveal key={p.id} delay={(i % 4) * 50}>
          <ProductCard product={p} priority={i < 4} />
        </Reveal>
      ))}
    </div>
  );
}

type MixedItem =
  | { kind: "pattern"; data: PatternCardData }
  | { kind: "product"; data: ProductCardData };

/**
 * Unified grid: interleaves patterns and products with a small type badge.
 * Layout: 4 columns on xl, 3 on md, 2 on sm.
 * Every 8th item that is a pattern gets the "wide" (col-span-2) treatment.
 */
export function MixedGrid({
  patterns,
  products,
  locale,
}: {
  patterns: PatternCardData[];
  products: ProductCardData[];
  locale: string;
}) {
  const fa = locale === "fa";

  // Interleave: 2 patterns, 1 product, 2 patterns, 1 product …
  const items: MixedItem[] = [];
  let pi = 0;
  let qi = 0;
  while (pi < patterns.length || qi < products.length) {
    // 2 patterns
    for (let k = 0; k < 2 && pi < patterns.length; k++, pi++) {
      items.push({ kind: "pattern", data: patterns[pi] });
    }
    // 1 product
    if (qi < products.length) {
      items.push({ kind: "product", data: products[qi++] });
    }
  }

  if (!items.length) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
      {items.map((item, i) => {
        const isPattern = item.kind === "pattern";
        // Wide feature: every 7th pattern slot, only when enough items
        const feature = isPattern && i % 7 === 0 && items.length > 3;

        return (
          <Reveal
            key={isPattern ? `p-${item.data.id}` : `q-${item.data.id}`}
            delay={(i % 4) * 40}
            className={cn("relative", feature && "col-span-2")}
          >
            {/* tiny type badge — top-left, above the card */}
            <span className={cn(
              "mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              isPattern
                ? "bg-background-secondary text-foreground-secondary"
                : "bg-accent-soft text-accent",
            )}>
              {isPattern
                ? <><Layers className="h-2.5 w-2.5" />{fa ? "الگو" : "Pattern"}</>
                : <><ShoppingBag className="h-2.5 w-2.5" />{fa ? "محصول" : "Product"}</>
              }
            </span>

            {isPattern ? (
              <PatternCard
                pattern={item.data as PatternCardData}
                variant={feature ? "wide" : "default"}
                priority={i < 4}
              />
            ) : (
              <ProductCard
                product={item.data as ProductCardData}
                priority={i < 4}
              />
            )}
          </Reveal>
        );
      })}
    </div>
  );
}
