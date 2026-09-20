"use client";

/**
 * «کتابخانه دانلود من» — the buyer's digital library.
 * Lists entitlements with their licence-covered master files and secure
 * download buttons. Also shows the payment result banner after the
 * gateway callback redirects here.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { AlertCircle, ArrowUpRight, BadgeCheck, CheckCircle2, Download, FileDown, Loader2, LogIn } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, faNum, href, t } from "@/lib/utils";
import type { PublicFileMeta } from "@/lib/files/types";
import type { Localized } from "@/lib/i18n/types";

interface LibraryFile extends PublicFileMeta {
  downloadsUsed: number;
  downloadsLeft: number;
}

interface LibraryItem {
  id: string;
  orderId: string;
  license: "personal" | "commercial" | "exclusive";
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  maxDownloads: number;
  pattern: { id: string; slug: string; title: Localized; image: string } | null;
  files: LibraryFile[];
}

type LoadState = "loading" | "ready" | "guest" | "error";

export function DownloadsView() {
  const { locale, dict } = useLocale();
  const d = dict.digital;
  const params = useSearchParams();
  const status = params.get("status");
  const order = params.get("order");

  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<LibraryItem[]>([]);

  const licenseLabels: Record<LibraryItem["license"], string> = {
    personal: d.licensePersonal,
    commercial: d.licenseCommercial,
    exclusive: d.licenseExclusive,
  };

  useEffect(() => {
    let alive = true;
    fetch("/api/my/downloads", { credentials: "same-origin" })
      .then(async (r): Promise<{ items?: LibraryItem[]; guest?: boolean }> => {
        if (r.status === 401) return { guest: true };
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as { items?: LibraryItem[] };
      })
      .then((data) => {
        if (!alive) return;
        if (data.guest) {
          setState("guest");
        } else {
          setItems(data.items ?? []);
          setState("ready");
        }
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [status]);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] section-y min-h-[60vh]">
      <h1 className="font-display text-h1 text-balance">{d.libraryTitle}</h1>
      <p className="mt-2 text-sm text-foreground-secondary">{d.remainingNote}</p>

      {/* Payment result banner (callback redirect) */}
      {status && (
        <div
          className={cn(
            "mt-6 flex items-start gap-3 rounded-lg border p-4",
            status === "success"
              ? "border-green-600/40 bg-green-600/5 text-green-800 dark:text-green-300"
              : "border-red-600/40 bg-red-600/5 text-red-700 dark:text-red-300",
          )}
          role="status"
        >
          {status === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
          <div>
            <p className="text-sm font-medium">
              {status === "success" && d.statusSuccess}
              {status === "failed" && d.statusFailed}
              {status === "cancelled" && d.statusCancelled}
              {status === "unknown" && d.statusUnknown}
            </p>
            {order && (
              <p className="mt-1 text-caption opacity-80">
                {d.orderCode}: <span className="font-mono">{order}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {state === "loading" && (
        <div className="mt-16 flex items-center justify-center gap-2 text-foreground-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {state === "guest" && (
        <div className="mt-10 rounded-lg border border-border bg-background-secondary p-8 text-center">
          <LogIn className="mx-auto h-8 w-8 text-foreground-secondary" />
          <p className="mt-3 text-sm font-medium">{d.loginToSee}</p>
          <Link
            href={href(locale, `/login?next=${encodeURIComponent(href(locale, "/downloads"))}`)}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background"
          >
            {dict.nav.login}
          </Link>
        </div>
      )}

      {state === "ready" && items.length === 0 && (
        <div className="mt-10 rounded-lg border border-border bg-background-secondary p-8 text-center">
          <FileDown className="mx-auto h-8 w-8 text-foreground-secondary" />
          <p className="mt-3 text-sm font-medium">{d.libraryEmpty}</p>
          <Link
            href={href(locale, "/patterns")}
            className="mt-5 inline-flex items-center gap-2 border-b border-foreground pb-0.5 text-sm font-medium"
          >
            {d.libraryEmptyHint}
            <ArrowUpRight className="h-4 w-4 rtl-flip" />
          </Link>
        </div>
      )}

      {state === "ready" && items.length > 0 && (
        <div className="mt-8 space-y-6">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-background-secondary/50 p-5">
              <div className="flex flex-wrap items-center gap-4">
                {item.pattern && (
                  <Link href={href(locale, `/patterns/${item.pattern.slug}`)} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border">
                    <Image src={item.pattern.image} alt="" fill sizes="64px" className="object-cover" />
                  </Link>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold">
                    {item.pattern ? (
                      <Link href={href(locale, `/patterns/${item.pattern.slug}`)} className="hover:text-accent">
                        {t(item.pattern.title, locale)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-foreground-secondary">
                    <span className="rounded-full border border-border px-2 py-0.5">{licenseLabels[item.license]}</span>
                    <span>
                      {d.orderCode}: <span className="font-mono" dir="ltr">{item.orderId}</span>
                    </span>
                    <span className={item.expired ? "text-red-600" : undefined}>
                      {d.validUntil} {fmtDate(item.expiresAt)}
                      {item.expired && ` · ${d.expiredLabel}`}
                    </span>
                  </p>
                </div>
                <a
                  href={`/api/license/${item.id}`}
                  title={d.certificateNote}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:border-foreground"
                >
                  <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                  {d.certificateLabel}
                </a>
                <Link
                  href={href(locale, `/license/${item.id}`)}
                  title={d.certificatePrintNote}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:border-foreground"
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {d.certificatePrintLabel}
                </Link>
              </div>

              <div className="mt-4 divide-y divide-border rounded-md border border-border bg-background">
                {item.files.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <FileDown className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.label}</p>
                      <p className="text-caption uppercase text-foreground-secondary">
                        {f.ext} · {(f.size / (1024 * 1024)).toFixed(f.size > 10 * 1024 * 1024 ? 0 : 1)} MB ·{" "}
                        {locale === "fa" ? faNum(f.downloadsLeft) : f.downloadsLeft} {d.downloadsLeft}
                      </p>
                    </div>
                    {item.expired || f.downloadsLeft <= 0 ? (
                      <span className="rounded-md border border-border px-4 py-2 text-caption text-foreground-secondary">
                        {item.expired ? d.expiredLabel : "0"}
                      </span>
                    ) : (
                      <a
                        href={`/api/download/${item.id}/${f.id}`}
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85"
                      >
                        <Download className="h-4 w-4" />
                        {d.downloadFile}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {state === "error" && (
        <p className="mt-10 text-center text-sm text-red-600">—</p>
      )}
    </div>
  );
}
