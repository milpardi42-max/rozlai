"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Carousel } from "@/components/ui/Carousel";
import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { cn, href, t } from "@/lib/utils";
import type { Category, Space } from "@/lib/types";

/* ── Space icons ─────────────────────────────────────────── */
const SpaceIcons: Record<string, React.ReactNode> = {
  "living-room": (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><path d="M6 30 Q6 22 14 22 L34 22 Q42 22 42 30 L42 38 L6 38 Z" /><path d="M6 30 L6 38 M42 30 L42 38" /><path d="M14 22 L14 14 L34 14 L34 22" /></svg>),
  bedroom:       (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><rect x="4" y="20" width="40" height="20" rx="2" /><path d="M4 28 L44 28" /><path d="M12 20 L12 12 Q12 8 16 8 L32 8 Q36 8 36 12 L36 20" /></svg>),
  "kids-room":   (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><circle cx="24" cy="16" r="8" /><path d="M14 40 Q14 30 24 30 Q34 30 34 40" /><path d="M8 40 L40 40" /></svg>),
  office:        (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><rect x="8" y="8" width="32" height="22" rx="2" /><path d="M16 30 L16 38 M32 30 L32 38 M10 38 L38 38" /><path d="M18 18 L30 18 M18 23 L26 23" /></svg>),
  hospitality:   (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><path d="M8 40 L8 14 L24 6 L40 14 L40 40" /><rect x="18" y="26" width="12" height="14" /><path d="M8 40 L40 40" /></svg>),
  cafe:          (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><path d="M10 18 L10 36 Q10 40 14 40 L34 40 Q38 40 38 36 L38 18 Z" /><path d="M38 22 Q44 22 44 28 Q44 34 38 34" /><path d="M8 18 L40 18" /><path d="M18 10 Q18 6 22 6 Q22 10 26 10 Q26 6 30 6" /></svg>),
  default:       (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><path d="M8 40 L8 20 L24 8 L40 20 L40 40 Z" /><rect x="18" y="28" width="12" height="12" /></svg>),
};
function getSpaceIcon(slug: string): React.ReactNode {
  const key = slug.toLowerCase();
  if (SpaceIcons[key]) return SpaceIcons[key];
  for (const [k, icon] of Object.entries(SpaceIcons)) { if (key.includes(k)) return icon; }
  return SpaceIcons.default;
}

/* ------------------------------------------------------------------ */
export function DiscoverySection({ patterns, categories }: { patterns: PatternCardData[]; categories: Category[] }) {
  const { locale, dict } = useLocale();
  if (!patterns.length) return null;
  const [lead, ...rest] = patterns;
  return (
    <section id="discover" className="container-x section-y">
      <SectionHeader eyebrow={dict.home.discoveryEyebrow} title={dict.home.discoveryTitle} description={dict.home.discoveryDesc} href={href(locale, "/patterns")} hrefLabel={dict.nav.viewAll} size="lg" />
      <div className="mt-10 grid gap-5 lg:grid-cols-12 lg:gap-6">
        <Reveal className="lg:col-span-6"><PatternCard pattern={lead} variant="large" priority /></Reveal>
        <div className="grid grid-cols-2 gap-5 lg:col-span-6 lg:gap-6">
          {rest.slice(0, 4).map((p, i) => (<Reveal key={p.id} delay={i * 60}><PatternCard pattern={p} variant="compact" /></Reveal>))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/** CategoriesSection — گرید فضاها با آیکون، داده‌ها از site.spaces */
export function CategoriesSection({ spaces }: { spaces: Space[] }) {
  const { locale, dict } = useLocale();
  const items = spaces.slice(0, 6);
  if (!items.length) return null;
  return (
    <section className="bg-background-secondary">
      <div className="container-x section-y">
        <Reveal><div className="text-center">
          <p className="text-label text-accent mb-3">{dict.home.categoriesEyebrow}</p>
          <h2 className="font-display text-h1 text-balance">{dict.home.categoriesTitle}</h2>
          <p className="mx-auto mt-3 max-w-lg text-body-lg text-foreground-secondary">{dict.home.categoriesDesc}</p>
        </div></Reveal>
        <Reveal className="mt-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {items.map((s, i) => (
              <Reveal key={s.id} delay={i * 55}>
                <Link href={href(locale, `/spaces/${s.slug}`)} className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-surface transition-shadow duration-300 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <div className="relative w-full overflow-hidden" style={{ paddingBottom: "100%" }}>
                    <Image src={s.image} alt={t(s.name, locale)} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 17vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/30 text-white opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">{getSpaceIcon(s.slug)}</span>
                    </span>
                  </div>
                  <div className="w-full px-2 py-2.5 text-center"><p className="truncate font-semibold text-foreground text-xs leading-snug">{t(s.name, locale)}</p></div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Reveal>
        <Reveal className="mt-8 flex justify-center">
          <Link href={href(locale, "/spaces")} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground">
            {dict.nav.viewAll}<ArrowUpRight className="h-3.5 w-3.5 rtl-flip" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function PatternRail({ id, eyebrow, title, description, patterns, hrefPath, tone = "default" }: { id: string; eyebrow?: string; title: string; description?: string; patterns: PatternCardData[]; hrefPath: string; tone?: "default" | "secondary" }) {
  const { locale, dict } = useLocale();
  if (!patterns.length) return null;
  return (
    <section id={id} className={cn(tone === "secondary" && "bg-background-secondary")}>
      <div className="container-x section-y">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} href={href(locale, hrefPath)} hrefLabel={dict.nav.viewAll} />
        <Reveal className="mt-10"><Carousel>{patterns.map((p) => <PatternCard key={p.id} pattern={p} />)}</Carousel></Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function BestSellersSection({ patterns, products }: { patterns: PatternCardData[]; products: ProductCardData[] }) {
  const { locale, dict } = useLocale();
  if (!patterns.length && !products.length) return null;
  return (
    <section className="container-x section-y">
      <SectionHeader eyebrow={dict.common.bestSeller} title={dict.home.bestTitle} description={dict.home.bestDesc} href={href(locale, "/patterns?sort=best")} hrefLabel={dict.nav.viewAll} />
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {patterns.slice(0, 2).map((p, i) => (<Reveal key={p.id} delay={i * 60}><PatternCard pattern={p} /></Reveal>))}
        {products.slice(0, 2).map((p, i) => (<Reveal key={p.id} delay={(i + 2) * 60}><ProductCard product={p} /></Reveal>))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/** Mixed new arrivals: interleaved product + pattern */
export function NewArrivalsSection({ patterns, products }: { patterns: PatternCardData[]; products: ProductCardData[] }) {
  const { locale, dict } = useLocale();
  const items: Array<{ key: string; kind: "pattern" | "product"; pattern?: PatternCardData; product?: ProductCardData }> = [];
  const P = products.slice(0, 5);
  const A = patterns.slice(0, 3);
  const max = Math.max(P.length, A.length);
  for (let i = 0; i < max; i++) {
    if (P[i]) items.push({ key: P[i].id, kind: "product", product: P[i] });
    if (A[i]) items.push({ key: A[i].id, kind: "pattern", pattern: A[i] });
  }
  if (!items.length) return null;
  return (
    <section id="new" className="container-x section-y">
      <SectionHeader eyebrow={dict.common.new} title={dict.home.newTitle} description={dict.home.newDesc} href={href(locale, "/shop?sort=new")} hrefLabel={dict.nav.viewAll} />
      <Reveal className="mt-10">
        <Carousel>
          {items.map((it) => it.kind === "product" && it.product ? (<ProductCard key={it.key} product={it.product} />) : it.pattern ? (<PatternCard key={it.key} pattern={it.pattern} />) : null)}
        </Carousel>
      </Reveal>
    </section>
  );
}
