import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server routes, API handlers, middleware, and authentication in the distributable bundle.
  output: "standalone",
  distDir: "dist/.next",
  // Sandbox/preview hosts serve this dev server under a proxied origin; without
  // this Next logs "Cross origin request detected … configure allowedDevOrigins"
  // for every /_next/* asset. Dev-only setting — ignored in production builds.
  allowedDevOrigins: ["*.e2b.app"],
  images: {
    // The default candidate list tops out at 3840w, which appends dead weight to every srcset.
    // Nothing on this site renders wider than 2×1920; capping the list trims ~40% off each <img>.
    deviceSizes: [640, 750, 1080, 1200, 1920, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Only these qualities are ever requested: 75 is Next's default (used by most
    // <Image> tags), the rest are the explicit values in Hero/PfHero/PfAbout/PfAcademic.
    // Listing them silences the Next 16 "unconfigured qualities" deprecation warning and
    // keeps the optimizer from rejecting a legitimate request.
    qualities: [75, 85, 90, 95, 100],
  },
};

export default nextConfig;
