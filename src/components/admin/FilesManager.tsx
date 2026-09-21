"use client";

/**
 * Admin moderation queue for master deliverable files.
 * Approve → file becomes sellable/deliverable. Reject (with note) → artist sees the reason.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileArchive, Loader2, RefreshCw, XCircle } from "lucide-react";
import { cn, t } from "@/lib/utils";
import type { Localized } from "@/lib/i18n/types";
import type { MasterFileStatus } from "@/lib/files/types";

interface AdminFileRow {
  id: string;
  patternId: string;
  patternSlug: string | null;
  patternTitle: Localized | null;
  artistName: Localized | null;
  ownerUserId: string;
  tier: string;
  label: string;
  filename: string;
  ext: string;
  size: number;
  status: MasterFileStatus;
  note?: string;
  seam?: { seamless: boolean; score: number } | null;
  createdAt: string;
}

type Filter = "pending" | "approved" | "rejected" | "all";

export function FilesManager() {
  const [files, setFiles] = useState<AdminFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/files", { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; files?: AdminFileRow[] };
      if (res.ok && data.ok) setFiles(data.files ?? []);
      else setError(data.ok ? null : `error_${res.status}`);
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moderate(fileId: string, status: MasterFileStatus) {
    let note: string | undefined;
    if (status === "rejected") {
      note = window.prompt("دلیل رد فایل (برای هنرمند نمایش داده می‌شود):") ?? undefined;
      if (note === undefined) return; // cancelled
    }
    setBusyId(fileId);
    try {
      const res = await fetch("/api/admin/files", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fileId, status, note }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `error_${res.status}`);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const filtered = files.filter((f) => filter === "all" || f.status === filter);
  const counts = {
    pending: files.filter((f) => f.status === "pending").length,
    approved: files.filter((f) => f.status === "approved").length,
    rejected: files.filter((f) => f.status === "rejected").length,
    all: files.length,
  };

  const tierFa: Record<string, string> = {
    personal: "شخصی",
    commercial: "تجاری",
    exclusive: "اختصاصی",
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileArchive className="h-5 w-5" />
          بازبینی فایل‌های ماستر (فروش دانلودی)
        </h2>
        <button
          type="button"
          onClick={load}
          className="ms-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          بروزرسانی
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as Filter[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              filter === k ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50",
            )}
          >
            {{ pending: "در انتظار", approved: "تأییدشده", rejected: "ردشده", all: "همه" }[k]} ({counts[k]})
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-foreground-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 rounded-md border border-border p-5 text-sm text-foreground-secondary">
          موردی در این وضعیت نیست.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border rounded-md border border-border">
          {filtered.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={f.filename}>
                  {f.label}
                </p>
                <p className="mt-0.5 text-caption text-foreground-secondary">
                  <span className="uppercase" dir="ltr">{f.ext}</span> · {(f.size / (1024 * 1024)).toFixed(1)} MB · لایسنس {tierFa[f.tier] ?? f.tier}
                  {f.patternTitle && <> · الگو «{t(f.patternTitle, "fa")}»</>}
                  {f.artistName && <> · {t(f.artistName, "fa")}</>}
                </p>
                {f.note && <p className="mt-0.5 text-caption text-red-600">{f.note}</p>}
                {/* Phase 3 — seamless-repeat probe (advisory) */}
                {f.seam && (
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                      f.seam.seamless
                        ? "border-green-600/30 text-green-700 dark:text-green-300"
                        : "border-amber-500/40 text-amber-700 dark:text-amber-300",
                    )}
                    title={`seam score: ${f.seam.score}`}
                  >
                    {f.seam.seamless ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {f.seam.seamless ? "تکرار بی‌درز" : "درز محتمل در تکرار"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {f.status !== "approved" && (
                  <button
                    type="button"
                    disabled={busyId === f.id}
                    onClick={() => moderate(f.id, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    {busyId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    تأیید
                  </button>
                )}
                {f.status !== "rejected" && (
                  <button
                    type="button"
                    disabled={busyId === f.id}
                    onClick={() => moderate(f.id, "rejected")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-600/50 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-600/10 disabled:opacity-50 dark:text-red-300"
                  >
                    <XCircle className="h-4 w-4" />
                    رد
                  </button>
                )}
                {f.status === "approved" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-600/40 px-2.5 py-1 text-caption text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    تأییدشده
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-caption text-foreground-secondary">
        نکته: فایلِ تأییدشده بلافاصله در پنل «خرید دانلودی» صفحه‌ی الگو (در صورت فعال بودن فروش دانلودی الگو) و در
        کتابخانه‌ی خریدارانِ همان لایسنس نمایش داده می‌شود. فایل‌های ردشده با دلیل به هنرمند برمی‌گردند.
      </p>
    </div>
  );
}
