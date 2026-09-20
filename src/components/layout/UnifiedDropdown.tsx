"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, ShoppingBag, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge, Sku } from "@/components/ui/Badge";
import { AddToCartButton } from "@/components/product/Actions";
import { ColorSwatches } from "@/components/product/ColorSwatches";
import { cn, formatPrice, href, t } from "@/lib/utils";
import type { NavData } from "./nav-data";

type Tab = "patterns" | "store";
type PatternGroup = "patterns" | "categories" | "collections" | "artists" | "portfolio" | "education";

const PAGE = 3;

export function UnifiedDropdown({ nav, onNavigate }: { nav: NavData; onNavigate: () => void }) {
  const { locale, dict } = useLocale();
  const fa = locale === "fa";

  // Default to "store" tab since the header nav-link label is «فروشگاه»
  const [tab, setTab] = useState<Tab>("store");

  // ── PATTERNS tab ───────────────────────────────────────────────────────────
  const patternGroups: { id: PatternGroup; label: string; href: string; preview: string; desc: string }[] = [
    { id: "patterns",    label: dict.nav.patterns,    href: "/discover?tab=patterns",  preview: nav.patterns[0]?.image ?? "",      desc: fa ? "کتابخانه‌ی الگوهای اورجینال" : "The original pattern library" },
    { id: "categories",  label: dict.nav.styles,      href: "/styles",                 preview: nav.categories[1]?.image ?? "",    desc: fa ? "کاوش بر اساس سبک" : "Browse by style" },
    { id: "collections", label: dict.nav.collections, href: "/collections",            preview: nav.collections[0]?.cover ?? "",   desc: fa ? "گزیده‌های ویراسته" : "Curated selections" },
    { id: "artists",     label: dict.nav.artists,     href: "/artists",                preview: nav.artists[0]?.avatar ?? "",      desc: fa ? "آدم‌های پشت الگوها" : "The people behind the patterns" },
    { id: "portfolio",   label: dict.nav.portfolio,   href: "/portfolio",              preview: nav.portfolios[0]?.cover ?? "",    desc: fa ? "گالری پروژه‌ها" : "Project gallery" },
    { id: "education",   label: dict.nav.education,   href: "/academy",                preview: nav.education[0]?.image ?? "",     desc: fa ? "یادگیری طراحی الگو" : "Learn pattern design" },
  ];
  const [hover, setHover] = useState<PatternGroup>("patterns");
  const activeGroup = patternGroups.find((g) => g.id === hover) ?? patternGroups[0];

  const secondary: Record<PatternGroup, { label: string; href: string; image?: string }[]> = {
    patterns:    nav.categories.slice(0, 6).map((c) => ({ label: t(c.name, locale), href: `/discover?tab=patterns&category=${c.slug}`, image: c.image })),
    categories:  nav.categories.slice(0, 6).map((c) => ({ label: t(c.name, locale), href: `/styles/${c.slug}`, image: c.image })),
    collections: nav.collections.map((c) => ({ label: t(c.title, locale), href: `/collections/${c.slug}`, image: c.cover })),
    artists:     nav.artists.map((a) => ({ label: t(a.name, locale), href: `/artists/${a.slug}`, image: a.avatar })),
    portfolio:   nav.portfolios.slice(0, 6).map((p) => ({ label: t(p.title, locale), href: `/portfolio/${p.slug}`, image: p.cover })),
    education:   nav.education.slice(0, 6).map((e) => ({ label: t(e.title, locale), href: `/academy/${e.slug}`, image: e.image })),
  };

  // ── STORE tab ──────────────────────────────────────────────────────────────
  const items = nav.storeProducts;
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const [page, setPage] = useState(0);
  const visible = useMemo(() => items.slice(page * PAGE, page * PAGE + PAGE), [items, page]);
  const [colorSel, setColorSel] = useState<Record<string, string>>({});

  return (
    <div className="glass border-t border-border/60 shadow-elevated">
      <div className="container-x py-6">

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-1 border-b border-border pb-4">

          {/* Patterns tab */}
          <button
            type="button"
            onClick={() => setTab("patterns")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-colors",
              tab === "patterns"
                ? "bg-foreground text-background"
                : "text-foreground-secondary hover:text-foreground hover:bg-background-secondary"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            {dict.nav.patterns}
          </button>

          {/* Store tab */}
          <button
            type="button"
            onClick={() => setTab("store")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-colors",
              tab === "store"
                ? "bg-foreground text-background"
                : "text-foreground-secondary hover:text-foreground hover:bg-background-secondary"
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {dict.nav.products}
          </button>

          {/* View-all shortcut (context-aware) */}
          <Link
            href={href(locale, tab === "patterns" ? "/discover?tab=patterns" : "/discover?tab=shop")}
            onClick={onNavigate}
            className="ms-auto inline-flex items-center gap-1 text-[12px] font-medium text-foreground-secondary hover:text-accent transition-colors"
          >
            {fa ? "مشاهده همه" : "View all"}
            <ArrowUpRight className="h-3.5 w-3.5 rtl-flip" />
          </Link>
        </div>

        {/* ── PATTERNS panel ──────────────────────────────────────────────── */}
        {tab === "patterns" && (
          <div className="grid grid-cols-12 gap-8">
            {/* primary list */}
            <ul className="col-span-3 flex flex-col border-e border-border pe-6">
              {patternGroups.map((g, i) => (
                <li key={g.id} className="anim-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <Link
                    href={href(locale, g.href)}
                    onMouseEnter={() => setHover(g.id)}
                    onFocus={() => setHover(g.id)}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center justify-between rounded-md px-3 py-2.5 font-display text-[26px] leading-none transition-colors",
                      hover === g.id
                        ? "text-foreground bg-background-secondary"
                        : "text-foreground-secondary hover:text-foreground"
                    )}
                  >
                    {g.label}
                    <ArrowUpRight className={cn("h-4 w-4 rtl-flip transition-[opacity,transform] duration-200", hover === g.id ? "opacity-100" : "opacity-0 -translate-x-1")} />
                  </Link>
                </li>
              ))}
            </ul>

            {/* secondary grid */}
            <div className="col-span-6">
              <p className="text-label text-muted mb-4">{activeGroup.label}</p>
              <ul key={activeGroup.id} className="grid grid-cols-3 gap-3">
                {secondary[activeGroup.id].map((it, i) => (
                  <li key={it.href} className="anim-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                    <Link
                      href={href(locale, it.href)}
                      onClick={onNavigate}
                      className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-background-secondary"
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-background-secondary">
                        {it.image && (
                          <Image src={it.image} alt="" fill sizes="48px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                        )}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">{it.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* preview card */}
            <Link
              href={href(locale, activeGroup.href)}
              onClick={onNavigate}
              className="group col-span-3 relative overflow-hidden rounded-lg bg-background-secondary anim-scale-fade"
              key={`prev-${activeGroup.id}`}
            >
              {activeGroup.preview && (
                <Image src={activeGroup.preview} alt="" fill sizes="320px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 vignette" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-caption text-white/70">{activeGroup.desc}</p>
                <p className="mt-1 flex items-center gap-2 font-display text-h3">
                  {activeGroup.label}
                  <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* ── STORE panel ─────────────────────────────────────────────────── */}
        {tab === "store" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-label text-accent">{dict.common.siteExclusive}</p>
                <h3 className="mt-1 font-display text-h3">{dict.nav.products}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-caption text-muted tabular">{page + 1} / {pages}</span>
                <button
                  type="button"
                  aria-label="previous"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4 rtl-flip" />
                </button>
                <button
                  type="button"
                  aria-label="next"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4 rtl-flip" />
                </button>
                <Link
                  href={href(locale, "/discover?tab=shop")}
                  onClick={onNavigate}
                  className="ms-2 hidden items-center gap-1 text-sm font-medium text-foreground hover:text-accent sm:inline-flex"
                >
                  {dict.nav.viewAll}
                  <ArrowUpRight className="h-4 w-4 rtl-flip" />
                </Link>
              </div>
            </div>

            <ul key={page} className="grid grid-cols-3 gap-4">
              {visible.map((p, i) => {
                const colorId = colorSel[p.slug] ?? p.colors[0]?.id;
                const color = p.colors.find((c) => c.id === colorId) ?? p.colors[0];
                const url = href(locale, `/shop/${p.slug}`);
                return (
                  <li
                    key={p.slug}
                    className="anim-fade-up rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-medium"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex gap-3">
                      <Link href={url} onClick={onNavigate} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-background-secondary">
                        <Image
                          key={color.image}
                          src={color.image}
                          alt={`${t(p.title, locale)} — ${t(color.name, locale)}`}
                          fill
                          sizes="96px"
                          className="object-cover anim-scale-fade"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={url} onClick={onNavigate} className="line-clamp-2 text-sm font-medium text-foreground hover:text-accent">
                            {t(p.title, locale)}
                          </Link>
                          <span className="shrink-0 text-sm font-semibold tabular">{formatPrice(p.price, locale)}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Sku value={p.sku} />
                          {p.siteOwned
                            ? <Badge tone="accent">{dict.common.siteExclusive}</Badge>
                            : <Badge tone="blue">{dict.common.artistProduct}</Badge>
                          }
                        </div>
                        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
                          {p.specs.slice(0, 2).map((s) => (
                            <div key={t(s.label, "en")} className="flex gap-1 text-[11px] leading-snug">
                              <dt className="text-muted">{t(s.label, locale)}:</dt>
                              <dd className="truncate text-foreground-secondary">{t(s.value, locale)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <ColorSwatches
                          size="sm"
                          label={dict.common.color}
                          options={p.colors.map((c) => ({ id: c.id, name: t(c.name, locale), hex: c.hex, stock: c.stock }))}
                          value={colorId}
                          onChange={(id) => setColorSel((s) => ({ ...s, [p.slug]: id }))}
                        />
                        <span className="truncate text-caption text-foreground-secondary">{t(color.name, locale)}</span>
                      </div>
                      <AddToCartButton
                        variant="icon"
                        disabled={color.stock <= 0}
                        line={{
                          kind: "product",
                          id: p.id,
                          sku: p.sku,
                          title: t(p.title, locale),
                          image: color.image,
                          price: p.price,
                          colorName: t(color.name, locale),
                          colorHex: color.hex,
                          href: url,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
