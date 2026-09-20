"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Layers, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { href, t } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";
import type { Pattern, Product } from "@/lib/types";

interface Props {
  locale: Locale;
  patterns: Pattern[];
  products: Product[];
  stats: {
    patterns: number;
    products: number;
    artists: number;
  };
}

/** Cross-fade interval in ms */
const BG_INTERVAL = 4500;

export function DiscoverHero({ locale, patterns, products, stats }: Props) {
  const fa = locale === "fa";

  // All images for the background slideshow (patterns first, then products)
  const bgImages = [
    ...patterns.map((p) => p.image),
    ...products.flatMap((p) => p.colors[0]?.image ? [p.colors[0].image] : []),
  ].filter(Boolean).slice(0, 6);

  const [activeBg, setActiveBg] = useState(0);

  // Rotate background every BG_INTERVAL ms
  useEffect(() => {
    if (bgImages.length < 2) return;
    const id = window.setInterval(
      () => setActiveBg((i) => (i + 1) % bgImages.length),
      BG_INTERVAL,
    );
    return () => window.clearInterval(id);
  }, [bgImages.length]);

  // Collage images
  const imgA = patterns[0]?.image;
  const imgB = patterns[1]?.image ?? products[0]?.colors[0]?.image;
  const imgC = patterns[2]?.image ?? products[1]?.colors[0]?.image;

  const featuredPattern = patterns.find((p) => p.featured) ?? patterns[0];
  const featuredProduct = products.find((p) => p.featured) ?? products[0];

  return (
    <section
      dir={fa ? "rtl" : "ltr"}
      className="relative isolate overflow-hidden bg-[#07090f] text-white"
      aria-label={fa ? "فروشگاه رزی آتلیه" : "Rozi Atelier Shop"}
    >
      {/* ── Background slideshow ─────────────────────────────────────────── */}
      {bgImages.map((src, i) => (
        <div
          key={src}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-[1400ms] ease-in-out"
          style={{ opacity: i === activeBg ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ))}

      {/* ── Gradient veil ────────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090f]/85 via-[#07090f]/50 to-[#07090f]/15" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#07090f]/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#07090f]/55 to-transparent" />
      </div>

      {/* ── Slide indicator dots (bottom-center) ─────────────────────────── */}
      {bgImages.length > 1 && (
        <div
          aria-hidden
          className="absolute bottom-[4.5rem] inset-x-0 flex justify-center gap-1.5 z-10"
        >
          {bgImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveBg(i)}
              className="relative h-[3px] overflow-hidden rounded-full transition-all duration-300"
              style={{ width: i === activeBg ? "28px" : "8px", background: "rgba(255,255,255,0.25)" }}
            >
              <span
                className="absolute inset-y-0 start-0 rounded-full bg-white"
                style={{
                  width: i === activeBg ? "100%" : "0%",
                  transition: i === activeBg ? `width ${BG_INTERVAL}ms linear` : "none",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="container-x relative grid min-h-[92svh] grid-rows-[1fr_auto] gap-0 pt-[calc(var(--announce-h,0px)+var(--header-h)+2.5rem)]">

        <div className="grid items-center gap-10 pb-6 lg:grid-cols-[1fr_auto] lg:gap-16">

          {/* ── Copy ──────────────────────────────────────────────────────── */}
          <div className="max-w-xl">
            <p
              className="anim-blur-in mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[12px] font-medium text-white/80 backdrop-blur-sm"
              style={{ animationDelay: "60ms" }}
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              {fa ? "رزی آتلیه — طراحی اورجینال" : "Rozi Atelier — Original Design"}
            </p>

            <h1 className="font-display text-display leading-[1.05] text-balance">
              <span className="anim-blur-in block" style={{ animationDelay: "140ms" }}>
                {fa ? "فروشگاه" : "Shop"}
              </span>
              <span className="anim-blur-in block text-white/55 italic" style={{ animationDelay: "260ms" }}>
                {fa ? "رزی آتلیه" : "Rozi Atelier"}
              </span>
            </h1>

            <p
              className="anim-blur-in mt-6 text-body-lg leading-relaxed text-white/65"
              style={{ animationDelay: "380ms" }}
            >
              {fa
                ? "کتابخانه‌ی الگوهای اورجینال آتلیه — از طرح دیجیتال تا محصول نهایی روی دیوار خانه‌ات."
                : "The atelier's original pattern library — from digital design to finished product on your wall."}
            </p>

            <div
              className="anim-fade-up mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: "480ms" }}
            >
              <Link
                href={href(locale, "/discover?type=pattern")}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-6 text-[14px] font-semibold text-[#07090f] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(255,255,255,0.2)]"
              >
                <Layers className="h-4 w-4" />
                {fa ? "کاوش الگوها" : "Browse patterns"}
              </Link>
              <Link
                href={href(locale, "/discover?type=product")}
                className="inline-flex h-12 items-center gap-2.5 rounded-full border border-white/25 px-6 text-[14px] font-semibold text-white transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/8"
              >
                <ShoppingBag className="h-4 w-4" />
                {fa ? "فروشگاه محصولات" : "Shop products"}
              </Link>
            </div>

            <dl
              className="anim-fade-up mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-7"
              style={{ animationDelay: "580ms" }}
            >
              {[
                { n: stats.patterns, label: fa ? "الگوی اورجینال" : "Original patterns",       icon: <Layers className="h-3.5 w-3.5 text-accent" /> },
                { n: stats.products, label: fa ? "محصول آتلیه"    : "Atelier products",         icon: <ShoppingBag className="h-3.5 w-3.5 text-accent" /> },
                { n: stats.artists,  label: fa ? "هنرمند مشارکت‌کننده" : "Contributing artists", icon: <Sparkles className="h-3.5 w-3.5 text-accent" /> },
              ].map(({ n, label, icon }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8">
                    {icon}
                  </span>
                  <div>
                    <dd className="font-display text-[28px] leading-none tabular text-white">{n}+</dd>
                    <dt className="mt-1 text-[11px] uppercase tracking-widest text-white/45">{label}</dt>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* ── Collage — floating cards with staggered animation ──────────── */}
          <div
            className="anim-scale-fade hidden lg:block"
            style={{ animationDelay: "500ms" }}
          >
            <div className="relative h-[520px] w-[420px]">

              {/* FRAME A — main large card, gentle float */}
              {imgA && (
                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl shadow-elevated"
                  style={{
                    transform: "rotate(-2deg) scale(0.96)",
                    animation: "hero-float-a 6s ease-in-out infinite",
                  }}
                >
                  <Image src={imgA} alt="" fill priority sizes="420px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
              )}

              {/* FRAME B — top-end small card, float with offset phase */}
              {imgB && (
                <div
                  className="absolute -end-10 -top-6 h-[200px] w-[160px] overflow-hidden rounded-xl shadow-elevated ring-2 ring-white/15"
                  style={{
                    transform: "rotate(3.5deg)",
                    animation: "hero-float-b 7s ease-in-out infinite",
                  }}
                >
                  <Image src={imgB} alt="" fill sizes="160px" className="object-cover" />
                </div>
              )}

              {/* FRAME C — bottom-start small card, float with another phase */}
              {imgC && (
                <div
                  className="absolute -start-8 -bottom-4 h-[170px] w-[140px] overflow-hidden rounded-xl shadow-elevated ring-2 ring-white/15"
                  style={{
                    transform: "rotate(-3deg)",
                    animation: "hero-float-c 8s ease-in-out infinite",
                  }}
                >
                  <Image src={imgC} alt="" fill sizes="140px" className="object-cover" />
                </div>
              )}

              {/* Featured pattern chip */}
              {featuredPattern && (
                <Link
                  href={href(locale, `/patterns/${featuredPattern.slug}`)}
                  className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl bg-black/60 px-4 py-3 backdrop-blur-md ring-1 ring-white/10 transition-colors hover:bg-black/75"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                      {fa ? "الگوی منتخب" : "Featured pattern"}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] font-semibold text-white">
                      {t(featuredPattern.title, locale)}
                    </p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#07090f]">
                    <ArrowUpRight className="h-3.5 w-3.5 rtl-flip" />
                  </span>
                </Link>
              )}

              {/* Featured product chip */}
              {featuredProduct && (
                <Link
                  href={href(locale, `/shop/${featuredProduct.slug}`)}
                  className="absolute start-4 top-4 flex items-center gap-2 rounded-full bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm ring-1 ring-white/20 transition-opacity hover:opacity-90"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {t(featuredProduct.title, locale)}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────── */}
        <div
          className="anim-fade-up flex items-center justify-between border-t border-white/8 py-5 text-[12px] text-white/40"
          style={{ animationDelay: "700ms" }}
        >
          <span className="uppercase tracking-[0.2em]">
            {fa ? "الگو · پارچه · کاغذدیواری · دکور" : "Pattern · Fabric · Wallpaper · Décor"}
          </span>
          <a
            href="#catalog"
            className="group inline-flex items-center gap-1.5 transition-colors hover:text-white/70"
          >
            {fa ? "ورود به فروشگاه" : "Enter the shop"}
            <ArrowDownRight className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5 group-hover:translate-x-0.5 rtl-flip" />
          </a>
        </div>
      </div>

      {/* ── Keyframes for floating cards ─────────────────────────────────── */}
      <style>{`
        @keyframes hero-float-a {
          0%, 100% { transform: rotate(-2deg) scale(0.96) translateY(0px);   }
          50%       { transform: rotate(-2deg) scale(0.96) translateY(-10px); }
        }
        @keyframes hero-float-b {
          0%, 100% { transform: rotate(3.5deg) translateY(0px);  }
          50%       { transform: rotate(3.5deg) translateY(-14px); }
        }
        @keyframes hero-float-c {
          0%, 100% { transform: rotate(-3deg) translateY(0px);  }
          50%       { transform: rotate(-3deg) translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="hero-float"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
