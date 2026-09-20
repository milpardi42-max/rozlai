import type { Metadata } from "next";
import { ShopFiltered } from "@/components/product/ShopFiltered";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/shop");
  return { title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.products, description: m ? t(m.description, locale) : undefined };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const PRODUCT_TYPE_PARENT = "cat-product-types";
  const usedCats = site.categories.filter((c) => site.products.some((p) => p.categoryId === c.id));

  // Product-type sub-categories (زیرمجموعه‌ی «الگو») for the sidebar group
  const productTypeCats = site.categories
    .filter((c) => c.parentId === PRODUCT_TYPE_PARENT)
    .slice()
    .sort((a, b) => a.order - b.order);

  // Flat categories excluding the product-type sub-categories and their parent
  const flatUsedCats = usedCats.filter(
    (c) => c.parentId !== PRODUCT_TYPE_PARENT && c.id !== PRODUCT_TYPE_PARENT,
  );

  return (
    <>
      <div className="container-x pt-[calc(var(--header-h)+2rem)] pb-20">
        <ShopFiltered
          site={site}
          locale={locale}
          title={locale === "fa" ? "فروشگاه سطح و دکور" : "Surface & décor shop"}
          categories={flatUsedCats
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c) => ({
              id: c.slug,
              label: t(c.name, locale),
              count: site.products.filter((p) => p.categoryId === c.id).length,
            }))}
          categoryGroups={
            productTypeCats.length > 0
              ? [
                  {
                    groupLabel: locale === "fa" ? "الگو" : "Pattern",
                    options: productTypeCats.map((c) => ({
                      id: c.slug,
                      label: t(c.name, locale),
                      count: site.products.filter((p) => p.categoryId === c.id).length,
                    })),
                  },
                ]
              : undefined
          }
          sorts={[
            { id: "new", label: d.common.new },
            { id: "best", label: d.common.bestSeller },
            { id: "price-asc", label: locale === "fa" ? "ارزان‌ترین" : "Price: low to high" },
            { id: "price-desc", label: locale === "fa" ? "گران‌ترین" : "Price: high to low" },
          ]}
          extra={[
            {
              key: "owner",
              label: d.common.creator,
              options: [
                { id: "site", label: d.brand, count: site.products.filter((p) => !p.artistId).length },
                { id: "artist", label: d.nav.artists, count: site.products.filter((p) => !!p.artistId).length },
              ],
            },
          ]}
        />
      </div>
    </>
  );
}
