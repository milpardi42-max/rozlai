"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Building2, PenTool, Quote } from "lucide-react";
import { useMemo } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { EducationCard, type EducationCardData } from "@/components/cards/EducationCard";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { href, t } from "@/lib/utils";
import type { Artist, Story } from "@/lib/types";

/* ------------------------------------------------------------------ */
export function ExclusiveSection({ products, heroImage }: { products: ProductCardData[]; heroImage: string }) {
  const { locale, dict } = useLocale();
  if (!products.length) return null;
  return (
    <section className="relative overflow-hidden bg-[#0f141c] text-white">
      <div className="pointer-events-none absolute -top-40 end-[-10%] h-[520px] w-[520px] rounded-full bg-accent/20 blur-[140px]" />
      <div className="container-x section-y relative">
        <SectionHeader tone="inverse" eyebrow={dict.common.siteExclusive} title={dict.home.exclusiveTitle} description={dict.home.exclusiveDesc} href={href(locale, "/shop")} hrefLabel={dict.nav.viewAll} />
        <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:items-stretch">
          <Reveal className="h-full lg:self-stretch">
            <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl lg:min-h-0">
              <Image src={heroImage} alt={dict.home.exclusiveTitle} fill sizes="(max-width:1024px) 100vw, 50vw" className="img-zoom object-cover" />
              <div className="absolute inset-0 vignette" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-display text-h2">{dict.home.exclusiveTitle}</h3>
                <p className="mt-2 line-clamp-2 max-w-md text-body-sm text-white/75">{dict.home.exclusiveDesc}</p>
              </div>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {products.slice(0, 4).map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <div className="rounded-xl bg-white text-foreground dark:bg-surface overflow-hidden h-full"><ProductCard product={p} variant="compact" /></div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function EducationSection({ items }: { items: EducationCardData[] }) {
  const { locale, dict } = useLocale();
  const [lead, ...rest] = items;
  if (!lead) return null;
  return (
    <section className="container-x section-y">
      <SectionHeader eyebrow={dict.nav.education} title={dict.home.educationTitle} description={dict.home.educationDesc} href={href(locale, "/academy")} hrefLabel={dict.nav.viewAll} />
      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7"><EducationCard item={lead} variant="large" progress={0} /></Reveal>
        <Reveal className="lg:col-span-5 rounded-xl border border-border p-2 md:p-4">
          <p className="px-3 pt-2 text-label text-muted">{dict.home.educationPopular}</p>
          <div className="mt-2 px-3">{rest.slice(0, 4).map((e) => <EducationCard key={e.id} item={e} variant="row" />)}</div>
          <div className="px-3 pb-2 pt-4">
            <Button href={href(locale, "/academy")} variant="outline" size="sm">{dict.nav.viewAll}<ArrowUpRight className="h-4 w-4 rtl-flip" /></Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function B2BCustomSection({ image1, image2, showB2B = true, showCustom = true }: { image1: string; image2: string; showB2B?: boolean; showCustom?: boolean }) {
  const { locale, dict } = useLocale();
  const allItems = [
    { key: "b2b", show: showB2B, icon: Building2, title: dict.home.b2bTitle, desc: dict.home.b2bDesc, cta: dict.home.b2bCta, path: "/projects", image: image1 },
    { key: "custom", show: showCustom, icon: PenTool, title: dict.home.customTitle, desc: dict.home.customDesc, cta: dict.home.customCta, path: "/custom", image: image2 },
  ];
  const items = allItems.filter((it) => it.show);
  if (!items.length) return null;
  return (
    <section className="container-x section-y">
      <div className={items.length === 1 ? "grid gap-6" : "grid gap-6 lg:grid-cols-2"}>
        {items.map((it, i) => (
          <Reveal key={it.path} delay={i * 80}>
            <Link href={href(locale, it.path)} className={`group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-xl p-8 text-white md:min-h-[480px]${items.length === 1 ? " max-w-2xl" : ""}`}>
              <Image src={it.image} alt="" fill sizes="(max-width:1024px) 100vw, 50vw" className="img-zoom object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/90 via-[#0a0d13]/40 to-[#0a0d13]/10" />
              <div className="relative">
                <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full glass !bg-white/10 !border-white/20"><it.icon className="h-5 w-5 shrink-0" /></span>
                <h3 className="font-display text-h2 text-balance">{it.title}</h3>
                <p className="mt-3 max-w-md text-body-sm text-white/75">{it.desc}</p>
                <span className="mt-6 inline-flex items-center gap-2 border-b border-white/50 pb-1 text-sm font-medium transition-colors group-hover:border-white">{it.cta}<ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" /></span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function StoriesSection({ stories, artists }: { stories: Story[]; artists: Artist[] }) {
  const { locale, dict } = useLocale();
  const artistMap = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists]);
  return (
    <section className="bg-background-secondary">
      <div className="container-x section-y">
        <SectionHeader eyebrow={dict.nav.stories} title={dict.home.storiesTitle} description={dict.home.storiesDesc} href={href(locale, "/stories")} hrefLabel={dict.nav.viewAll} />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {stories.slice(0, 3).map((s, i) => {
            const a = artistMap.get(s.artistId);
            return (
              <Reveal key={s.id} delay={i * 70}>
                <Link href={href(locale, `/stories/${s.slug}`)} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-background">
                    <Image src={s.image} alt="" fill sizes="(max-width:768px) 100vw, 33vw" className="img-zoom object-cover" />
                    <Quote className="absolute top-4 start-4 h-6 w-6 text-white/80" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    {a && <span className="relative h-9 w-9 overflow-hidden rounded-full"><Image src={a.avatar} alt="" fill sizes="36px" className="object-cover" /></span>}
                    <div>
                      <p className="text-caption text-foreground-secondary">{a ? t(a.name, locale) : ""}</p>
                      <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">{t(s.title, locale)}</h3>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-body-sm text-foreground-secondary">{t(s.excerpt, locale)}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function NewsletterSection() {
  const { dict } = useLocale();
  return (
    <section className="container-x section-y">
      <Reveal className="relative overflow-hidden rounded-xl border border-border bg-surface px-6 py-14 text-center md:px-12 md:py-20">
        <div className="pointer-events-none absolute -bottom-32 start-1/2 h-64 w-[60%] -translate-x-1/2 rounded-full bg-accent/15 blur-[100px] rtl:translate-x-1/2" />
        <p className="text-label text-accent">Newsletter</p>
        <h2 className="mt-4 font-display text-h1 text-balance">{dict.common.newsletterTitle}</h2>
        <p className="mx-auto mt-4 max-w-lg text-body-lg text-foreground-secondary">{dict.common.newsletterDesc}</p>
        <div className="mx-auto mt-8 max-w-md"><NewsletterForm /></div>
      </Reveal>
    </section>
  );
}
