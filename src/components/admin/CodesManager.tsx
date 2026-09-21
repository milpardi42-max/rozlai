"use client";

/**
 * Admin — discount & affiliate codes (Phase 5).
 * Create percent-off codes; optionally bind to an artist (affiliate) with a
 * commission percent of the discounted gross. Toggle/delete + usage stats.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, Percent, Plus, RefreshCw, TicketPercent, Trash2, Users } from "lucide-react";
import { cn, faNum, t } from "@/lib/utils";
import type { Localized } from "@/lib/i18n/types";

interface DiscountCode {
  id: string;
  code: string;
  percentOff: number;
  active: boolean;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  artistId: string | null;
  commissionPercent: number;
  createdAt: string;
}

interface ArtistLite {
  id: string;
  name: Localized;
}

export function CodesManager() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [artists, setArtists] = useState<ArtistLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [codeText, setCodeText] = useState("");
  const [percentOff, setPercentOff] = useState("20");
  const [maxUses, setMaxUses] = useState("0");
  const [affiliateId, setAffiliateId] = useState("");
  const [commission, setCommission] = useState("10");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/codes", { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; codes?: DiscountCode[]; artists?: ArtistLite[] };
      if (res.ok && data.ok) {
        setCodes(data.codes ?? []);
        setArtists(data.artists ?? []);
      } else setError(`error_${res.status}`);
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          code: codeText || undefined,
          percentOff: Number(percentOff),
          maxUses: Number(maxUses) || 0,
          artistId: affiliateId || null,
          commissionPercent: affiliateId ? Number(commission) || 0 : 0,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        setError(d.error ?? `error_${res.status}`);
        return;
      }
      setCodeText("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: DiscountCode) {
    await fetch("/api/admin/codes", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    void load();
  }

  async function remove(c: DiscountCode) {
    if (!window.confirm(`کد ${c.code} حذف شود؟`)) return;
    await fetch(`/api/admin/codes?id=${encodeURIComponent(c.id)}`, { method: "DELETE", credentials: "same-origin" });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TicketPercent className="h-5 w-5" />
          کدهای تخفیف و افیلیت
        </h2>
        <button
          type="button"
          onClick={load}
          className="ms-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          تازه‌سازی
        </button>
      </div>

      {error && <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

      {/* Create form */}
      <form onSubmit={create} className="rounded-xl border border-border bg-surface p-5">
        <p className="font-semibold">ساخت کد جدید</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="text-caption text-muted">کد (خالی = خودکار)</span>
            <input
              value={codeText}
              onChange={(e) => setCodeText(e.target.value.toUpperCase())}
              dir="ltr"
              placeholder="NOWRUZ30"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">درصد تخفیف</span>
            <input
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
              required
              inputMode="numeric"
              dir="ltr"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">سقف استفاده (۰ = نامحدود)</span>
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              inputMode="numeric"
              dir="ltr"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">هنرمند افیلیت (اختیاری)</span>
            <select
              value={affiliateId}
              onChange={(e) => setAffiliateId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— تخفیف ساده —</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {t(a.name, "fa")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-muted">کمیسیون (٪) — فقط افیلیت</span>
            <input
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              inputMode="numeric"
              dir="ltr"
              disabled={!affiliateId}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          ساخت کد
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-foreground-secondary" />
        </div>
      ) : codes.length === 0 ? (
        <p className="rounded-md border border-border p-5 text-sm text-foreground-secondary">هنوز کدی ساخته نشده است.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-background-secondary text-caption text-foreground-secondary">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">کد</th>
                <th className="px-4 py-2.5 text-start font-medium">تخفیف</th>
                <th className="px-4 py-2.5 text-start font-medium">استفاده</th>
                <th className="px-4 py-2.5 text-start font-medium">افیلیت</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
                <th className="px-4 py-2.5 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((c) => {
                const affiliate = c.artistId ? artists.find((a) => a.id === c.artistId) : null;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold" dir="ltr">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 tabular">
                      <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-accent">
                        <Percent className="h-3 w-3" />
                        {faNum(c.percentOff)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular text-foreground-secondary" dir="ltr">
                      {c.uses}/{c.maxUses || "∞"}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {affiliate ? (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {t(affiliate.name, "fa")} · {faNum(c.commissionPercent)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-caption",
                          c.active
                            ? "border-green-600/40 text-green-700 dark:text-green-300"
                            : "border-border text-foreground-secondary",
                        )}
                      >
                        {c.active ? "فعال" : "غیرفعال"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        className="rounded-md p-1.5 text-foreground-secondary hover:bg-error/10 hover:text-error"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-caption text-foreground-secondary">
        کد تخفیف ساده: همان لحظه‌ی خرید از قیمت نهایی کم می‌شود. کد افیلیت: علاوه‌بر تخفیف، کمیسیون تعیین‌شده به موجودی درآمد
        هنرمند اضافه و در دفتر تسویه با باقی درآمدهایش جمع می‌شود.
      </p>
    </div>
  );
}
