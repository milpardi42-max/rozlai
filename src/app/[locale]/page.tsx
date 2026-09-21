import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import { Hero } from "@/components/home/Hero";
import {
  ArtistsSection,
  B2BCustomSection,
  BestSellersSection,
  CategoriesSection,
  DiscoverySection,
  EducationSection,
  ExclusiveSection,
  NewsletterSection,
  NewArrivalsSection,
  PatternRail,
  PortfoliosSection,
  ProjectsSection,
  SpacesSection,
  StoriesSection,
  StylesSection,
} from "@/components/home/sections";
import { artistStats, enrichEducation, enrichPattern, enrichPortfolio, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import type { HomeSectionKey } from "@/lib/types";
import { isExclusiveDelisted } from "@/lib/types";
import { t } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const meta = site.seo.find((s) => s.path === "/");
  return { title: meta ? { absolute: t(meta.title, locale) } : undefined, description: meta ? t(meta.description, locale) : undefined };
}

/**
 * Sections that must stay pinned to the top of the page no matter what order
 * the admin configures: the hero is a sticky, full-viewport block — rendering
 * it anywhere else breaks the layout.
 */
const PINNED_FIRST: HomeSectionKey[] = ["hero"];

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];

  /* -------- order comes from the admin panel (homeSections[].order) -------- */
  const enabled = site.homeSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const on = (k: string) => enabled.some((s) => s.key === k);

  // Phase 2 — exclusively-sold patterns are delisted from the storefront
  const publicPatterns = site.patterns.filter((p) => !isExclusiveDelisted(p));
  const patterns = publicPatterns.map((p) => enrichPattern(site, p));
  const products = site.products.slice().sort((a, b) => a.order - b.order).map((p) => enrichProduct(site, p));
  const portfolios = site.portfolios.map((p) => enrichPortfolio(site, p));
  const education = site.education.map((e) => enrichEducation(site, e));
  const artists = site.artists
    .filter((a) => a.featured)
    .map((a) => {
      const s = artistStats(site, a.id);
      return { ...a, featuredPattern: s.patterns[0] ?? null, portfolioPreview: s.portfolios.map((p) => p.cover), counts: { patterns: s.patterns.length, projects: s.portfolios.length } };
    });
  const heroPatterns = site.hero.featuredPatternIds
    .map((id) => publicPatterns.find((p) => p.id === id))
    .filter(Boolean) as typeof site.patterns;
  const styleCounts = Object.fromEntries(site.categories.map((c) => [c.id, publicPatterns.filter((p) => p.categoryId === c.id).length]));
  const featuredCats = site.categories.filter((c) => c.featured).sort((a, b) => a.order - b.order);
  const spaces = site.spaces.slice().sort((a, b) => a.order - b.order);

  /* education: featured first, then popular-only — dedup by id */
  const educationItems = (() => {
    const seen = new Set<string>();
    return [...education.filter((e) => e.featured), ...education.filter((e) => !e.featured && e.popular)]
      .filter((e) => !seen.has(e.id) && (seen.add(e.id), true));
  })();

  /* -------- one renderer per section key -------- */
  const renderers: Partial<Record<HomeSectionKey, () => ReactNode>> = {
    hero: () => (
      <Hero
        hero={site.hero}
        patterns={heroPatterns}
        categories={featuredCats}
        stats={{
          patterns: site.hero.stats?.patterns ?? site.patterns.length,
          artists: site.hero.stats?.artists ?? site.artists.length,
          projects: site.hero.stats?.projects ?? site.portfolios.length,
        }}
      />
    ),
    discovery: () => <DiscoverySection patterns={patterns.filter((p) => p.featured)} categories={featuredCats} />,
    categories: () => <CategoriesSection spaces={spaces} />,
    trending: () => (
      <PatternRail
        id="trending"
        eyebrow={d.common.trending}
        title={d.home.trendingTitle}
        description={d.home.trendingDesc}
        patterns={patterns.filter((p) => p.trending)}
        hrefPath="/patterns?sort=trending"
        tone="secondary"
      />
    ),
    bestSellers: () => <BestSellersSection patterns={patterns.filter((p) => p.bestSeller)} products={products.filter((p) => p.bestSeller)} />,
    newPatterns: () => <NewArrivalsSection patterns={patterns.filter((p) => p.isNew)} products={products.filter((p) => p.isNew)} />,
    artists: () => <ArtistsSection artists={artists} />,
    portfolios: () => (
      <PortfoliosSection
        items={portfolios.filter((p) => p.featured)}
        eyebrow={d.nav.portfolio}
        title={d.home.portfolioTitle}
        description={d.home.portfolioDesc}
        hrefPath="/portfolio"
      />
    ),
    styles: () => <StylesSection categories={featuredCats} counts={styleCounts} />,
    spaces: () => <SpacesSection spaces={spaces} />,
    exclusive: () => (
      <ExclusiveSection
        products={products.filter((p) => !p.artistId && p.featured)}
        heroImage={site.editorialImages?.exclusiveHero ?? site.hero.image}
      />
    ),
    projects: () => <ProjectsSection items={portfolios.filter((p) => p.isProject)} />,
    education: () => <EducationSection items={educationItems} />,
    stories: () => <StoriesSection stories={site.stories} artists={site.artists} />,
    newsletter: () => <NewsletterSection />,
  };

  /* -------- "b2b" and "custom" are two flags of ONE component -------- */
  // Render it once, at the position of whichever key the admin placed first,
  // and skip the sibling key so it can never appear twice.
  const b2bFirst = enabled.find((s) => s.key === "b2b" || s.key === "custom")?.key;
  const skip = new Set<HomeSectionKey>();
  if (b2bFirst) {
    renderers[b2bFirst] = () => (
      <B2BCustomSection
        showB2B={on("b2b")}
        showCustom={on("custom")}
        image1={site.editorialImages?.b2bImage1 ?? site.hero.image}
        image2={site.editorialImages?.b2bImage2 ?? site.hero.image}
      />
    );
    skip.add(b2bFirst === "b2b" ? "custom" : "b2b");
  }

  /* -------- assemble in configured order, pinned sections first -------- */
  const keys = enabled.map((s) => s.key).filter((k) => !skip.has(k));
  const ordered = [
    ...PINNED_FIRST.filter((k) => on(k)),
    ...keys.filter((k) => !PINNED_FIRST.includes(k)),
  ];

  return (
    <>
      {ordered.map((key) => (
        <Fragment key={key}>{renderers[key]?.()}</Fragment>
      ))}
    </>
  );
}
