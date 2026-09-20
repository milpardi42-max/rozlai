import "server-only";
import { unstable_cache } from "next/cache";
import { getContent } from "./store";
import type { SiteContent } from "../types";

export type {
  Enriched,
  EnrichedPattern,
  EnrichedProduct,
  EnrichedPortfolio,
  EnrichedEducation,
} from "./enrich";
export {
  artistOf,
  categoryOf,
  patternById,
  productById,
  portfolioById,
  enrichPattern,
  enrichProduct,
  enrichPortfolio,
  enrichEducation,
  artistStats,
} from "./enrich";

/**
 * Cached site content — revalidates every 60 seconds OR immediately when
 * the "site" tag is invalidated (e.g. after an admin save).
 */
export const getSite = unstable_cache(
  async (): Promise<SiteContent> => getContent(),
  ["site-content"],
  { revalidate: 60, tags: ["site"] },
);
