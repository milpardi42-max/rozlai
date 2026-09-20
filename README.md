# Rosie Atelier

Premium bilingual (فارسی RTL / English LTR) platform for **patterns · creators · portfolios · products · education**.

Built with Next.js 15 (App Router), React 19, Tailwind v4 and a token-driven design system.
Repository: [`milanorezaee2/Rozadi`](https://github.com/milanorezaee2/Rozadi) · Production host: **Netlify / Vercel** (SSR).

## Run

```bash
npm install
npm run dev      # http://localhost:3000 → redirects to /fa (or /en)
npm run check    # typecheck + lint
npm run build && npm start
```

## Live / Deploy

**GitHub repo:** https://github.com/milanorezaee2/Rozadi  

### One-click deploy

| Platform | Button |
| --- | --- |
| **Netlify** | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/milanorezaee2/Rozadi) |
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/milanorezaee2/Rozadi) |

After import, set environment variables (see `.env.example`):

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL` = your public URL (no trailing slash)
- Optional: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for persistent admin content

Then open `https://<your-site>/api/health` — expect `"ok": true`.

### Local production

```bash
npm ci && npm run build && npm start
# → http://localhost:3000/fa
```

## Structure

```
src/
  app/[locale]/            # all routes, locale-prefixed (fa | en)
    page.tsx               # homepage — sections driven by admin config
    patterns/ shop/ artists/ portfolio/ academy/ styles/ spaces/ collections/
    stories/ projects/ custom/ about/ contact/ faq/ returns/ legal/[doc]/
    login/ signup/ account/ favorites/ checkout/ search/ creators/join/
    owner/                 # owner-only content management (OWNER_EMAIL)
  app/admin/[locale]/      # admin panel — its own layout + login, mounted at /admin/{locale}
  app/api/                 # newsletter, contact, admin content, auth, search-index, health
  app/sitemap.ts robots.ts # generated SEO files (use NEXT_PUBLIC_SITE_URL)
  components/
    ui/                    # Button, Badge/Sku, Tabs/Chips, Modal, Reveal, SpotlightCard,
                           # BentoGrid, GlassPanel, SectionHeader, PageHero, Carousel, States
    layout/                # Header, MegaMenu, StoreDropdown, SearchPalette, CartDrawer, Footer
    cards/                 # PatternCard, ProductCard, ArtistCard, PortfolioCard, EducationCard, StyleCard
    product/               # ColorSwatches, Actions, QuickView, Gallery, FilterBar, BuyBoxes
    portfolio/ profile/ home/ admin/ providers/
  lib/
    i18n/                  # locale types + dictionary
    data/seed.ts           # seed content (patterns, products, artists, portfolios, education…)
    data/store.ts          # content store (Upstash Redis → Vercel Blob → data/content.json)
    data/queries.ts        # enrich/join helpers
    types.ts               # data model
  app/globals.css          # single source of truth: tokens, typography, motion, primitives
public/
  fonts/iransanse-web/     # Persian font family (see README inside), inter/, instrument-serif/
  images/{hero,patterns,products,portfolios,education,collections,artists}
```

## Design system

- **Tokens** in `globals.css`: `--background` (white), `--surface`, `--foreground`, `--primary` (slate),
  `--accent` (copper), `--blue`, shadows (soft/medium/elevated/glow), radii, motion.
- **Dark mode**: `html[data-theme="dark"]` — a real deep/cinematic theme, toggled in header/footer.
- **Typography**: `font-display` (Instrument Serif) for Latin editorial headlines; **all Persian text
  resolves to `iransanse-web`** via `html[lang=fa]` rules; scale utilities `text-display … text-label`.
- **Motion**: `anim-blur-in`, `anim-fade-up`, `anim-scale-fade`, `[data-reveal]` scroll reveal,
  `img-zoom`, `arrow-shift`, `.spotlight` — all respect `prefers-reduced-motion`.
- **RTL/LTR**: logical properties only (`ms/me/ps/pe/start/end/inset-inline`), `rtl-flip` for icons.

## Admin

The panel lives at **`/admin/{locale}`** (e.g. `/admin/fa`) with its own login page at
`/admin/{locale}/login` — it is *not* under the site's locale prefix. Bare `/admin` and the
legacy `/{locale}/admin` both redirect there (`src/middleware.ts`).
Sign in with the admin account (`ADMIN_EMAIL` / `ADMIN_PASSWORD`; in local dev without those env
vars, any `admin@…` email plus a ≥4-character password).
Manage: homepage sections (order/visibility), hero, categories/styles, pattern/product/artist/
portfolio/education flags & ordering, banners, SEO. Every save is live immediately (all pages are dynamic).

- **Auth**: server-side, HMAC-signed HttpOnly cookie (`src/lib/auth.ts`, `/api/auth/*`), with a small
  per-IP+email login throttle (`src/lib/rate-limit.ts`) to blunt brute-force attempts.
  - Production: set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`.
  - Local dev without env vars: any `admin@…` email + ≥4-char password.
  - **Never cached**: `/api/auth/*` and `/api/admin/content` answer with `cache-control: private,
    no-store` + `netlify-cdn-cache-control: no-store` (`src/lib/http.ts`), and the browser sends them
    with `credentials: "same-origin"`. A replayed stale `/api/auth/me` would report "logged out"
    right after login and bounce the admin back to `/login`. `AppProviders` additionally guards the
    session with a version counter (`sessionVersionRef`): a `/me` answer that is older than the
    `login()`/`logout()` that raced it is dropped instead of overwriting the fresh session.
- **Storage** (`src/lib/data/store.ts`, first configured wins):
  1. Upstash Redis — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`  ← **required on Netlify**
  2. Vercel Blob — `BLOB_READ_WRITE_TOKEN` (practical on Vercel only)
  3. Local file — `data/content.json` (dev / VPS / Docker volume; **read-only on serverless**)

  If a save fails on a read-only filesystem the API answers `502 storage_write_failed` with the
  reason in the log — check `GET /api/health`, which reports the active backend.

## Deploy (Netlify — recommended)

This app is **server-rendered**: it uses middleware, route handlers (`/api/*`), a signed-cookie admin
session and admin-managed runtime content. Every page is `force-dynamic`.

1. **app.netlify.com → Add new site → Import an existing project → GitHub** → `milanopardi13/artikel` (branch `main`).
2. The `netlify.toml` in this repo configures everything (build command, `.next` publish,
   `@netlify/plugin-nextjs`, Node 20, security headers). Leave build settings as-is.
3. **Site configuration → Environment variables** — add:
   | Variable | Required? | Purpose |
   | --- | --- | --- |
   | `ADMIN_EMAIL` | yes (prod) | admin login user |
   | `ADMIN_PASSWORD` | yes (prod) | admin login password |
   | `AUTH_SECRET` | strongly recommended | cookie signing key (long random string) |
   | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | yes | persistent admin content (serverless FS is read-only) |
   | `NEXT_PUBLIC_SITE_URL` | yes | canonical URL for `sitemap.xml`, `robots.txt`, OG tags |
   See `.env.example` for details. **Redeploy after adding env vars** (env changes alone do not rebuild).
4. Verify: open `https://<site>/api/health` — expect `"persistent": true` and `"configured": true`.
5. Optional: **Domains** → connect your own domain.

Every push to the production branch rebuilds and redeploys automatically (~2–3 min). Preview deploys
are created for pushes on other branches.

### ⚠️ Not deployable to GitHub Pages / static hosting

The app **cannot** run as a static export: `output: "export"` fails the build because
`/api/*` route handlers use `force-dynamic` and middleware isn't supported in export mode.
Do not add a "Deploy to GitHub Pages" workflow to this repo — it will always fail.
Host it on a Node-capable platform (Netlify, Vercel, VPS, Docker, Liara…).

### Deploy (Vercel)

Import the same repo at **vercel.com/new** (framework auto-detected), set the same env vars, and
for persistent admin content attach **Storage → Upstash Redis** (or Vercel **Blob** — the code talks
to both over plain REST) → **Redeploy**. `vercel.json` pins the region to `fra1`; change it if your
audience is elsewhere.

### Other hosts (VPS / Docker / Liara / etc.)

`npm ci && npm run build && npm start` on Node 20+. Set the same env vars; without Redis/Blob, content persists
to `data/content.json` — keep that directory on a persistent volume.

## Digital pattern sales (Phase 1)

Full **upload → review → sell → secure download** cycle for digital licences of
patterns (Patternbank-style tiers: `personal` / `commercial` / `exclusive`).

**Artist side**
- `/[locale]/artist/files` — private master-file uploader (ZIP · TIFF · PSD/PSB · AI ·
  EPS · PDF · PNG · JPG · SVG, ≤ 200 MB) with magic-byte sniffing + per-tier attach.
- `/[locale]/upload-guide` — public standards page (formats, 300+ DPI, seamless
  repeat, ICC profile, naming, spec-sheet), linked from the artist dashboard.
- Files land in private storage with status `pending`; an admin approves/rejects
  (with note) under **Admin → فایل‌های ماستر** (`/api/admin/files`).

**Buyer side**
- Digital patterns (`digital: true` + approved files) show an instant-download
  licence panel on the PDP.
- `POST /api/digital/checkout` → ZarinPal v4 (`ZARINPAL_MERCHANT_ID`, prices are
  stored in Toman → sent ×10 as Rial; `ZARINPAL_SANDBOX=1` for the sandbox).
  **No merchant id → mock gateway** so the whole cycle runs locally.
- `/api/digital/callback` verifies, mints an **entitlement** (10 downloads/file,
  90-day window) and lands the buyer on `/[locale]/downloads` — their library.
- `GET /api/download/[entitlementId]/[fileId]` is the only way bytes leave:
  signed-in owner + valid window + licence-covered + approved + under cap.
  S3 backend → 302 to a 5-minute presigned URL; local backend → authenticated stream.

**Storage** — master binaries go to S3-compatible object storage when configured
(`S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`, region optional
— works with Cloudflare R2 & Backblaze B2); otherwise privately in `data/private/`.
Both fall under the same registry pattern as the rest of the codebase
(Upstash Redis iff configured, else `data/{files,payments,entitlements}.json`).

## Digital pattern sales (Phase 2)

**Watermarked previews.** Digital patterns never expose raw pixels publicly:
every PDP preview is rewritten through `GET /api/wmimg?src=…`, which bakes a
tiled diagonal “Rosie Atelier” overlay (sharp/libvips) and caches the derivative
on disk (`data/wm-cache/`, encode misses rate-limited). New uploads through
`/api/artist/upload` additionally receive a baked `-w.webp` derivative up front
(`watermarkedUrl` in the response). Local runtime uploads are served via
`GET /api/pub/<file>` because a standalone `next start` snapshots `/public` at
build time.

**Licence certificate (PDF).** `GET /api/license/[entitlementId]` — owner/admin
only — generates the official A4 licence certificate (dependency-free, PDF core
fonts, English): order ref, licensee, artist, tier terms, delivered file list,
and an HMAC verification code so forged certificates can be detected. Linked
from every purchase in `/[locale]/downloads`.

**Exclusive sale → auto-delist.** When a verified payment lands on an
`exclusive` licence, the callback stamps `pattern.exclusiveSale` and the design
instantly disappears from storefront discovery (patterns grid, home, nav mega
menu, search index + sitemap — `revalidatePath` busts their caches), the PDP
swaps both buy boxes for a “sold exclusively” notice, and checkout permanently
rejects further licences (`409 exclusive_sold`). Existing buyers keep their
downloads and certificates; physical products derived from the design (fabric
prints etc.) stay on sale. Posting `exclusiveSale` through artist POST/PUT is
rejected — only the payment callback can stamp it; admins may override.

## Digital pattern sales (Phase 3)

**Automatic seamless-repeat check.** Every master-file upload of a raster tile
(TIFF/PNG/JPG) and every preview upload runs `checkSeamless()`
(`src/lib/files/seamless.ts`): the tile is down-sampled to 256² raw pixels and
the mean |ΔRGB| across the wrap edges is compared against the average
adjacent-pixel difference of the whole texture. Score ≈1.0 → seamless; the
report ({seamless, ratioX, ratioY, score}) is stored on the file record
(`DeliverableFile.seam`) and shown as an advisory badge in the artist's master
files page and the admin moderation queue. It never blocks an upload —
threshold `1.65` was tuned on synthetic tiles
(`scripts/test-phase3.ts`: seamless stripe tile scores 1.04, broken tile 38.7).

**Automatic mockups.** `POST /api/artist/mockups` (multipart `file`, ≤8 MB,
artist/admin) renders four presentation-ready previews
(`src/lib/files/mockups.ts`): normalized tile (512²), 3×3 repeat (1020²),
wallpaper with lighting gradient + baseboard (1600×1100) and fabric with soft
wave shading (1200²). Tiling is done with SVG `<pattern>` rendered through
librsvg/sharp — note librsvg can't decode WebP inside SVG `<image>`, so the
embedded data-URI is PNG. Every output is WebP and watermarked; artists get a
dropzone UI at `/[locale]/artist/files` («استودیو موکاپ خودکار») together with
the instant seamless verdict.

**Persian licence certificate (print).** `/[locale]/license/[entitlementId]` —
owner/admin only — renders the licence certificate as a styled FA/EN HTML page
with the bundled Iransans webfont and a print-to-PDF button (server-side PDF
generation can't shape Arabic/Persian script without a font pipeline, so the
official downloadable PDF stays English and the FA certificate is delivered as
a printable document). Print CSS isolates the certificate node. Linked from
every purchase in `/[locale]/downloads` next to the EN PDF.

**Artist royalties & payouts.** Verified payments in
`data/payments.json` joined to pattern ownership produce each artist's royalty
(`src/lib/data/earnings.ts`): gross × `ARTIST_ROYALTY_PERCENT` (default 70%).
Site-owned designs count as platform revenue. Settlements are recorded in
`data/payouts.json` (`src/lib/data/payouts.ts`). Artist sees the full statement
in the dashboard's «درآمد و تسویه» tab (`GET /api/artist/earnings`; admins can
pass `?artistId=`); admins record payouts in the panel's «درآمد و تسویه»
section (`GET`/`POST /api/admin/payouts`). Open balance = royalty − payouts.

## Performance notes

- All page payloads render on demand; images use `next/image` with explicit `sizes`.
- The global search palette does **not** receive the full catalog via props anymore — it lazily
  fetches `/api/search-index` (public, cacheable 5 min, locale-agnostic) on first use and warms it
  during browser idle time. This keeps the catalog listing out of every page's RSC payload.
- `sitemap.xml` / `robots.txt` are generated and revalidated hourly so new admin slugs appear
  without a redeploy.
