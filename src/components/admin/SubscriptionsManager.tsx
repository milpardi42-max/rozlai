"use client";

/**
 * Admin — artist subscription plans (Phase 5).
 * Assign assign a plan (+duration) to any artist user id, and watch all
 * current subscriptions with expiry status.
 */
import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2, RefreshCw, Save } from "lucide-react";
import { cn, faNum } from "@/lib/utils";

interface PlanDef {
  id: string;
  priceToman: number;
  priceUsd: number;
  patternQuota: number;
  productQuota: number;
  royaltyBoost: number;
}

interface SubscriptionRow {
  userId: string;
  artistId: string | null;
  planId: string;
  startedAt: string;
  expiresAt: string | null;
  note?: string;
  setBy: string;
}

const PLAN_LABELS: Record<string, string> = {
  starter: "رایگان (Starter)",
  basic: "پایه (Basic)",
  pro: "حرفه‌ای (Pro)",
  studio: "استودیو (Studio)",
};

export function SubscriptionsManager() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [userId, setUserId] = useState("");
  const [artistId, setArtistId] = useState("");
  const [planId, setPlanId] = useState("pro");
  const [days, setDays] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions", { credentials: "same-origin" });
      const d = (await res.json()) as { ok?: boolean; subscriptions?: SubscriptionRow[]; plans?: PlanDef[] };
      if (res.ok && d.ok) {
        setSubs(d.subscriptions ?? []);
        setPlans(d.plans ?? []);
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

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !userId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          userId: userId.trim(),
          artistId: artistId.trim() || undefined,
          planId,
          days: Number(days) || 0,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        setError(d.error ?? `error_${res.status}`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Crown className="h-5 w-5" />
          پلن‌های اشتراک هنرمندان
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

      {/* Plan catalogue */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold">{PLAN_LABELS[p.id] ?? p.id}</p>
            <p className="mt-1 text-caption text-foreground-secondary tabular">
              {p.priceToman > 0 ? `${faNum(p.priceToman.toLocaleString("en-US"))} تومان/ماه` : "رایگان"}
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-foreground-secondary">
              <li>الگو تا {faNum(p.patternQuota)}</li>
              <li>محصول تا {faNum(p.productQuota)}</li>
              <li>بوست رویلتی +{faNum(p.royaltyBoost)}٪</li>
            </ul>
          </div>
        ))}
      </div>

      {/* Assign form */}
      <form onSubmit={assign} className="rounded-xl border border-border bg-surface p-5">
        <p className="font-semibold">تخصیص پلن به هنرمند</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-caption text-muted">شناسه کاربر *</span>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              dir="ltr"
              placeholder="u_…"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">شناسه هنرمند (اختیاری)</span>
            <input
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              dir="ltr"
              placeholder="artist-…"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">پلن</span>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{PLAN_LABELS[p.id] ?? p.id}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-muted">مدت (روز) — ۰ = بدون انقضا</span>
            <input
              value={days}
              onChange={(e) => setDays(e.target.value)}
              inputMode="numeric"
              dir="ltr"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            تخصیص پلن
          </button>
          {saved && <span className="text-sm text-green-700 dark:text-green-300">ثبت شد</span>}
        </div>
      </form>

      {/* Current subscriptions */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-foreground-secondary" />
        </div>
      ) : subs.length === 0 ? (
        <p className="rounded-md border border-border p-5 text-sm text-foreground-secondary">
          هیچ اشتراک فعالی ثبت نشده — هنرمندان جدید روی پلن رایگان (۳ الگو / ۱ محصول) هستند.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-background-secondary text-caption text-foreground-secondary">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">کاربر</th>
                <th className="px-4 py-2.5 text-start font-medium">هنرمند</th>
                <th className="px-4 py-2.5 text-start font-medium">پلن</th>
                <th className="px-4 py-2.5 text-start font-medium">شروع</th>
                <th className="px-4 py-2.5 text-start font-medium">انقضا</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.map((s) => {
                const expired = s.expiresAt !== null && new Date(s.expiresAt).getTime() < Date.now();
                return (
                  <tr key={`${s.userId}-${s.startedAt}`}>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">{s.userId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground-secondary" dir="ltr">{s.artistId ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{PLAN_LABELS[s.planId] ?? s.planId}</td>
                    <td className="px-4 py-3 text-foreground-secondary" dir="ltr">
                      {new Date(s.startedAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary" dir="ltr">
                      {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("fa-IR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-caption",
                          expired ? "border-error/40 text-error" : "border-green-600/40 text-green-700 dark:text-green-300",
                        )}
                      >
                        {expired ? "منقضی" : "فعال"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
