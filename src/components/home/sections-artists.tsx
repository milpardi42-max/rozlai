"use client";

import { useLocale } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { ArtistCard, type ArtistCardData } from "@/components/cards/ArtistCard";
import { href } from "@/lib/utils";

/* ------------------------------------------------------------------ */
export function ArtistsSection({ artists }: { artists: ArtistCardData[] }) {
  const { locale, dict } = useLocale();
  if (!artists.length) return null;
  return (
    <section className="container-x section-y">
      <SectionHeader eyebrow={dict.nav.artists} title={dict.home.artistsTitle} description={dict.home.artistsDesc} href={href(locale, "/artists")} hrefLabel={dict.nav.viewAll} />
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {artists.slice(0, 4).map((a, i) => (
          <Reveal key={a.id} delay={i * 70}><ArtistCard artist={a} /></Reveal>
        ))}
      </div>
    </section>
  );
}
