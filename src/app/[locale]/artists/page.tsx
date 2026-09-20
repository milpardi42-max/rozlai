import type { Metadata } from "next";
import Image from "next/image";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { artistStats, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.artists };
}

export default async function ArtistsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const artists = site.artists.map((a) => {
    const s = artistStats(site, a.id);
    return { ...a, featuredPattern: s.patterns[0] ?? null, portfolioPreview: [] as string[], counts: { patterns: s.patterns.length, projects: 0 } };
  });

  const heroImage = site.artists[0]?.cover ?? site.hero.image;

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.artists },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#0a0d13]" style={{ minHeight: "calc(65svh - 30px)" }}>
        {/* Background image */}
        {heroImage && (
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-55 hero-zoom-in"
            />
          </div>
        )}

        {/* Layered gradients for clean separation from page below */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0d13]/95 via-[#0a0d13]/50 to-[#0a0d13]/20" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--background)] to-transparent" />

        {/* Thin accent rule at very bottom */}
        <div className="absolute inset-x-0 bottom-0 gradient-strip opacity-40" />

        {/* Content */}
        <div className="container-x relative flex flex-col justify-end" style={{ minHeight: "calc(65svh - 30px)", paddingBottom: "4rem", paddingTop: "calc(var(--header-h) + 3rem)" }}>
          {/* Breadcrumb */}
          <Breadcrumb
            items={breadcrumb}
            locale={locale}
            className="mb-8 text-white/50 [&_a]:text-white/50 [&_a:hover]:text-white [&_.text-foreground]:text-white [&_.text-foreground-secondary]:text-white/50 [&_.text-border]:text-white/20"
          />

          {/* Eyebrow */}
          <p className="anim-blur-in text-label text-accent" style={{ animationDelay: "0ms" }}>
            {d.nav.artists}
          </p>

          {/* Title */}
          <h1
            className="anim-blur-in mt-4 font-display text-h1 text-white text-balance"
            style={{ animationDelay: "100ms", maxWidth: "28ch" }}
          >
            {d.home.artistsTitle}
          </h1>

          {/* Description */}
          <p
            className="anim-blur-in mt-5 text-body-lg text-white/70"
            style={{ animationDelay: "200ms", maxWidth: "50ch" }}
          >
            {d.home.artistsDesc}
          </p>

          {/* CTA */}
          <div className="anim-fade-up mt-8" style={{ animationDelay: "320ms" }}>
            <Button href={href(locale, "/creators/join")} variant="outline">
              {d.nav.becomeCreator}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Artists grid ─────────────────────────────────────────────────── */}
      <section className="container-x py-16 md:py-20">
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {artists.map((a, i) => (
            <Reveal key={a.id} delay={(i % 3) * 80}>
              <ArtistCard artist={a} variant="large" />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
