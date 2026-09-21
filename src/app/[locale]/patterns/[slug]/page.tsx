import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PatternDetailView } from "@/components/product/PatternDetailView";
import { DigitalLicensePanel } from "@/components/product/DigitalLicensePanel";
import { PatternCard } from "@/components/cards/PatternCard";
import { ProductCard } from "@/components/cards/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { listApprovedForPattern } from "@/lib/files/storage";
import { toPublicMeta } from "@/lib/files/types";
import { wmSrc } from "@/lib/files/watermark";
import { isExclusiveDelisted } from "@/lib/types";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.patterns.map((pattern) => ({ locale, slug: pattern.slug })));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const p = site.patterns.find((x) => x.slug === slug);
  return p ? { title: t(p.title, locale), description: t(p.description, locale) } : {};
}

export default async function PatternPage({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const raw = site.patterns.find((x) => x.slug === slug);
  if (!raw) notFound();
  const d = dictionaries[locale];
  const p = enrichPattern(site, raw);
  const delisted = isExclusiveDelisted(p);
  const related = site.patterns
    .filter((x) => x.id !== p.id && !isExclusiveDelisted(x) && (x.categoryId === p.categoryId || x.artistId === p.artistId))
    .slice(0, 4)
    .map((x) => enrichPattern(site, x));
  const products = site.products.filter((x) => x.patternId === p.id).map((x) => enrichProduct(site, x));
  const spaces = site.spaces.filter((s) => p.spaceIds.includes(s.id));
  // Phase 1: approved digital deliverables for the instant-download panel
  const deliverableMeta = p.digital && !delisted
    ? (await listApprovedForPattern(p.id)).map(toPublicMeta)
    : [];

  // Phase 2: digital patterns expose only watermarked previews publicly
  const wmPattern = p.digital
    ? {
        ...p,
        image: wmSrc(p.image),
        gallery: (p.gallery ?? []).map(wmSrc),
        colorways: p.colorways?.map((c) => ({ ...c, image: wmSrc(c.image), gallery: c.gallery?.map(wmSrc) })),
      }
    : p;

  return (
    <article className="pt-[calc(var(--header-h)+1.5rem)]">
      <div className="container-x">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-caption text-foreground-secondary">
          <Link href={href(locale, "/patterns")} className="hover:text-foreground">
            {d.nav.patterns}
          </Link>
          <span>/</span>
          {p.category && (
            <>
              <Link href={href(locale, `/styles/${p.category.slug}`)} className="hover:text-foreground">
                {t(p.category.name, locale)}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{t(p.title, locale)}</span>
        </nav>

        <PatternDetailView
          pattern={wmPattern as typeof p}
          artist={p.artist}
          spaces={spaces}
          soldExclusively={delisted}
          digitalSlot={
            p.digital && !delisted && deliverableMeta.length > 0 ? (
              <DigitalLicensePanel patternId={p.id} licensePrices={p.licensePrices} files={deliverableMeta} />
            ) : null
          }
        />
      </div>

      {products.length > 0 && (
        <section className="bg-background-secondary">
          <div className="container-x section-y">
            <SectionHeader eyebrow={d.nav.products} title={d.common.relatedProducts} href={href(locale, "/shop")} hrefLabel={d.nav.viewAll} />
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
              {products.map((pr) => (
                <ProductCard key={pr.id} product={pr} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-x section-y">
        <SectionHeader eyebrow={d.nav.patterns} title={d.common.relatedPatterns} href={href(locale, "/patterns")} hrefLabel={d.nav.viewAll} />
        <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
          {related.map((x, i) => (
            <Reveal key={x.id} delay={i * 60}>
              <PatternCard pattern={x} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href={href(locale, "/patterns")} className="inline-flex items-center gap-2 border-b border-foreground pb-0.5 text-sm font-medium">
            {d.nav.startExploring}
            <ArrowUpRight className="h-4 w-4 rtl-flip" />
          </Link>
        </div>
      </section>
    </article>
  );
}
