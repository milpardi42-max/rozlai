"use client";

/**
 * Digital licence purchase box on the pattern PDP.
 * Picks a licence tier → ZarinPal (or dev mock) → entitlement → secure downloads.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Check, Download, FileDown, Loader2, Lock, Percent, ShieldCheck, Tag } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, formatPrice, href } from "@/lib/utils";
import type { PublicFileMeta } from "@/lib/files/types";
import { DEFAULT_LICENSE_PRICES, LICENSE_COVERAGE, type LicenseTier } from "@/lib/types";

interface Props {
  patternId: string;
  licensePrices?: Partial<Record<LicenseTier, { fa: number; en: number }>>;
  /** Approved deliverables across all tiers (public metadata only). */
  files: PublicFileMeta[];
}

const TIERS: LicenseTier[] = ["personal", "commercial", "exclusive"];

export function DigitalLicensePanel({ patternId, licensePrices, files }: Props) {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const d = dict.digital;

  const [tier, setTier] = useState<LicenseTier | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<null | boolean>(null);
  // Phase 5 — discount code field (+server-authoritative quote)
  const [codeInput, setCodeInput] = useState("");
  const [quote, setQuote] = useState<{
    code: string;
    percentOff: number;
    toman: number;
    usdCents: number;
  } | null>(null);

  const tierLabels: Record<LicenseTier, { label: string; desc: string }> = {
    personal: { label: d.licensePersonal, desc: d.licensePersonalDesc },
    commercial: { label: d.licenseCommercial, desc: d.licenseCommercialDesc },
    exclusive: { label: d.licenseExclusive, desc: d.licenseExclusiveDesc },
  };

  const filesForTier = useMemo(
    () => (t: LicenseTier) => {
      const covered = new Set(LICENSE_COVERAGE[t]);
      return files.filter((f) => covered.has(f.tier));
    },
    [files],
  );

  const available = useMemo(() => TIERS.filter((t) => filesForTier(t).length > 0), [filesForTier]);

  // Pre-select the cheapest tier that actually has deliverables
  useEffect(() => {
    if (!tier && available.length > 0) setTier(available[0]);
  }, [available, tier]);

  // Already purchased? (silently ignores guests / errors)
  useEffect(() => {
    let alive = true;
    fetch("/api/my/downloads", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        const items = (data?.items ?? []) as Array<{ pattern?: { id?: string } | null; expired?: boolean }>;
        setOwned(items.some((i) => i.pattern?.id === patternId && !i.expired));
      })
      .catch(() => alive && setOwned(false));
    return () => {
      alive = false;
    };
  }, [patternId]);

  // Refresh the server-side quote whenever the tier or code changes
  useEffect(() => {
    if (!tier) {
      setQuote(null);
      return;
    }
    let alive = true;
    fetch("/api/digital/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patternId, license: tier, discountCode: codeInput || undefined }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.ok) return;
        if (data.discount?.code) {
          setQuote({
            code: data.discount.code,
            percentOff: data.discount.percentOff,
            toman: data.discounted.toman,
            usdCents: data.discounted.usdCents,
          });
        } else {
          setQuote(null);
        }
      })
      .catch(() => alive && setQuote(null));
    return () => {
      alive = false;
    };
  }, [tier, codeInput, patternId]);

  async function buy() {
    if (!tier || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          patternId,
          license: tier,
          locale: params?.locale ?? locale,
          ...(quote?.code ? { discountCode: quote.code } : {}),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; redirectUrl?: string; error?: string };
      if (res.status === 401) {
        window.location.href = href(locale, `/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!res.ok || !data.redirectUrl) {
        setError(data.error ?? "checkout_failed");
        setBusy(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("network_error");
      setBusy(false);
    }
  }

  if (files.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-background-secondary p-5">
      <div className="flex items-center gap-2.5">
        <FileDown className="h-5 w-5 text-accent" />
        <div>
          <h2 className="text-base font-semibold">{d.panelTitle}</h2>
          <p className="text-caption text-foreground-secondary">{d.panelSubtitle}</p>
        </div>
      </div>

      {owned ? (
        <Link
          href={href(locale, "/downloads")}
          className="mt-4 flex items-center justify-between gap-3 rounded-md border border-foreground bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-background-secondary"
        >
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            {d.owned}
          </span>
          <Download className="h-4 w-4" />
        </Link>
      ) : (
        <>
          <div role="radiogroup" aria-label={d.panelTitle} className="mt-4 grid gap-2">
            {TIERS.map((t) => {
              const tierFiles = filesForTier(t);
              const price = licensePrices?.[t] ?? DEFAULT_LICENSE_PRICES[t];
              const disabled = tierFiles.length === 0;
              const selected = tier === t;
              const showDiscounted = selected && quote;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => setTier(t)}
                  className={cn(
                    "rounded-md border px-4 py-3 text-start transition-colors",
                    selected ? "border-foreground bg-background" : "border-border hover:border-foreground/50",
                    disabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{tierLabels[t].label}</span>
                    <span className="text-sm font-medium tabular">
                      {showDiscounted ? (
                        <span className="flex items-baseline gap-2">
                          <span className="text-caption font-normal text-foreground-secondary line-through">
                            {formatPrice(price, locale)}
                          </span>
                          <span className="text-success">
                            {formatPrice({ fa: quote.toman, en: quote.usdCents / 100 }, locale)}
                          </span>
                        </span>
                      ) : (
                        formatPrice(price, locale)
                      )}
                    </span>
                  </span>
                  <span className="mt-1 block text-caption text-foreground-secondary">
                    {disabled ? d.noTier : tierLabels[t].desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Phase 5 — discount / affiliate code */}
          <label className="mt-4 block">
            <span className="flex items-center gap-1.5 text-label text-muted">
              <Tag className="h-3 w-3" />
              {locale === "fa" ? "کد تخفیف" : "Discount code"}
            </span>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder={locale === "fa" ? "مثلاً NOWRUZ30" : "e.g. LAUNCH20"}
              dir="ltr"
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase tracking-wide focus:border-foreground focus:outline-none"
            />
          </label>
          {quote && (
            <p className="mt-2 flex items-center gap-1.5 rounded-md bg-green-600/10 px-3 py-2 text-caption text-green-700 dark:text-green-300">
              <Percent className="h-3 w-3" />
              {locale === "fa"
                ? `کد ${quote.code} فعال شد — ${quote.percentOff}% تخفیف اعمال می‌شود.`
                : `Code ${quote.code} applied — ${quote.percentOff}% off.`}
            </p>
          )}

          {tier && (
            <div className="mt-4 rounded-md border border-border bg-background p-4">
              <p className="text-label text-muted">{d.filesIncluded}</p>
              <ul className="mt-2 space-y-1.5">
                {filesForTier(tier).map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                    <span className="truncate">{f.label}</span>
                    <span className="ms-auto shrink-0 text-caption uppercase text-foreground-secondary">
                      {f.ext} · {(f.size / (1024 * 1024)).toFixed(f.size > 10 * 1024 * 1024 ? 0 : 1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={buy}
            disabled={!tier || busy}
            className={cn(
              "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-foreground text-sm font-medium text-background transition-opacity",
              (!tier || busy) && "opacity-60",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {busy ? d.processing : d.buyNow}
          </button>

          {error && <p className="mt-2 text-caption text-red-600">{error}</p>}

          <p className="mt-3 flex items-center gap-1.5 text-caption text-foreground-secondary">
            <ShieldCheck className="h-3.5 w-3.5" />
            {d.secureNote}
          </p>
        </>
      )}
    </section>
  );
}
