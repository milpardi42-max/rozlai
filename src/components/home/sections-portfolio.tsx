"use client";

import { useLocale } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { BentoGrid, bentoSpan } from "@/components/ui/BentoGrid";
import { Carousel } from "@/components/ui/Carousel";
import { PortfolioCard, type PortfolioCardData } from "@/components/cards/PortfolioCard";
import { StyleCard } from "@/components/cards/StyleCard";
import { cn, faNum, href, t } from "@/lib/utils";
import type { Category, Space } from "@/lib/types";

/* ------------------------------------------------------------------ */
export function PortfoliosSection({ items, title, description, eyebrow, hrefPath }: { items: PortfolioCardData[]; title: string; description: string; eyebrow: string; hrefPath: string }) {
  const { locale, dict } = useLocale();
  if (!items.length) return null;
  const capped = items.slice(0, 4);
  return (
    <section className="container-x section-y">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} href={href(locale, hrefPath)} hrefLabel={dict.nav.viewAll} />
      <Reveal className="mt-10">
        {capped.length >= 4 ? (
          <BentoGrid>
            {capped.map((p, i) => (
              <div key={p.id} className={bentoSpan[i === 0 ? "hero" : i === 1 ? "tall" : i === 2 ? "square" : "wide"]}>
                <PortfolioCard item={p} priority={i === 0} />
              </div>
            ))}
          </BentoGrid>
        ) : (
          <div className={cn("grid gap-5", capped.length === 1 ? "" : capped.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
            {capped.map((p, i) => (
              <div key={p.id} className="aspect-[4/3]"><PortfolioCard item={p} priority={i === 0} /></div>
            ))}
          </div>
        )}
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/** Projects — grid مستقیم ۳ ستون، متمایز از PortfoliosSection */
export function ProjectsSection({ items }: { items: PortfolioCardData[] }) {
  const { locale, dict } = useLocale();
  if (!items.length) return null;
  return (
    <section className="bg-background-secondary">
      <div className="container-x section-y">
        <SectionHeader eyebrow={dict.nav.projects} title={dict.home.projectsTitle} description={dict.home.projectsDesc} href={href(locale, "/projects")} hrefLabel={dict.nav.viewAll} />
        <Reveal className="mt-10">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 3).map((p, i) => (
              <div key={p.id} className="aspect-[4/3]"><PortfolioCard item={p} priority={i === 0} /></div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/** Compute a safe BentoGrid col-span for StylesSection based on item count + index. */
function styleSpan(i: number, total: number): string {
  if (total <= 1) return "col-span-2 md:col-span-6 lg:col-span-12";
  if (total <= 3) return i === 0 ? "col-span-2 md:col-span-6 lg:col-span-6" : "col-span-1 md:col-span-3 lg:col-span-3";
  // ≥4 items: hero at 0, wide at last-1 (if total is even), square otherwise
  if (i === 0) return "col-span-2 row-span-2 md:col-span-3 lg:col-span-5 lg:row-span-2";
  if (total >= 4 && i === total - 2) return "col-span-2 md:col-span-3 lg:col-span-4";
  return "col-span-1 md:col-span-3 lg:col-span-3";
}

export function StylesSection({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const { locale, dict } = useLocale();
  const cats = categories.slice(0, 7);
  if (!cats.length) return null;
  return (
    <section className="bg-background-secondary">
      <div className="container-x section-y">
        <SectionHeader eyebrow={dict.nav.styles} title={dict.home.stylesTitle} description={dict.home.stylesDesc} href={href(locale, "/styles")} hrefLabel={dict.nav.viewAll} />
        <Reveal className="mt-10">
          <BentoGrid rows="auto-rows-[180px] md:auto-rows-[220px]">
            {cats.map((c, i) => {
              const span = styleSpan(i, cats.length);
              const n = counts[c.id] ?? 0;
              return (<StyleCard key={c.id} big={i === 0} href={href(locale, `/styles/${c.slug}`)} title={t(c.name, locale)} description={t(c.description, locale)} image={c.image} className={span} count={`${locale === "fa" ? faNum(n) : n} ${dict.common.patterns}`} />);
            })}
          </BentoGrid>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function SpacesSection({ spaces }: { spaces: Space[] }) {
  const { locale, dict } = useLocale();
  if (!spaces.length) return null;
  return (
    <section className="container-x section-y">
      <SectionHeader eyebrow={dict.nav.spaces} title={dict.home.spacesTitle} description={dict.home.spacesDesc} href={href(locale, "/spaces")} hrefLabel={dict.nav.viewAll} />
      <Reveal className="mt-10">
        <Carousel itemClassName="w-[70vw] xs:w-[50vw] sm:w-[36vw] md:w-[28vw] lg:w-[22vw] xl:w-[260px]">
          {spaces.map((s) => (<StyleCard key={s.id} href={href(locale, `/spaces/${s.slug}`)} title={t(s.name, locale)} image={s.image} className="aspect-[3/4]" />))}
        </Carousel>
      </Reveal>
    </section>
  );
}
