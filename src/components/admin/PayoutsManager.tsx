"use client";

/**
 * Admin royalty/payout console (Phase 3).
 * Shows each artist's royalty total (share of verified digital sales),
 * paid-out settlements and open balance — and records new payouts.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Coins,
  HandCoins,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { cn, faNum, t } from "@/lib/utils";
import type { Localized } from "@/lib/i18n/types";

interface EarningRow {
  orderId: string;
  at: string;
  patternId: string;
  patternTitle: Localized | null;
  license: string;
  grossToman: number;
  royaltyToman: number;
}

interface ArtistEarnings {
  artistId: string;
  artistName: Localized | null;
  royaltyPercent: number;
  salesCount: number;
  grossToman: number;
  royaltyToman: number;
  paidOutToman: number;
  balanceToman: number;
  rows: EarningRow[];
}

interface PayoutRecord {
  id: string;
  artistId: string;
  method: string;
  amountToman: number;
  note?: string;
  createdAt: string;
}

const toman = (n: number) => `${faNum(n.toLocaleString("en-US"))} تومان`;

export function PayoutsManager() {
  const [earnings, setEarnings] = useState<ArtistEarnings[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [pct, setPct] = useState(70);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const [artistId, setArtistId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payouts", { credentials: "same-origin" });
      const data = (await res.json()) as {
        ok?: boolean;
        earnings?: ArtistEarnings[];
        payouts?: PayoutRecord[];
        royaltyPercent?: number;
      };
      if (res.ok && data.ok) {
        setEarnings(data.earnings ?? []);
        setPayouts(data.payouts ?? []);
        if (data.royaltyPercent) setPct(data.royaltyPercent);
      } else {
        setError(`error_${res.status}`);
      }
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      earnings.reduce(
        (acc, a) => ({
          gross: acc.gross + a.grossToman,
          royalty: acc.royalty + a.royaltyToman,
          paidOut: acc.paidOut + a.paidOutToman,
          balance: acc.balance + a.balanceToman,
        }),
        { gross: 0, royalty: 0, paidOut: 0, balance: 0 },
      ),
    [earnings],
  );

  const artistName = useCallback(
    (id: string) => {
      const a = earnings.find((x) => x.artistId === id);
      return a?.artistName ? t(a.artistName, "fa") : id;
    },
    [earnings],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !artistId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          artistId,
          amountToman: Number(amount.replace(/[,٬]/g, "")),
          method: method.trim(),
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `error_${res.status}`);
        return;
      }
      setAmount("");
      setMethod("");
      setNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const kpis = [
    { label: "فروش ناخالص (طرح‌های هنرمندان)", value: totals.gross, icon: <Coins className="h-4 w-4" /> },
    { label: `سهم هنرمندان (${faNum(pct)}٪)`, value: totals.royalty, icon: <Wallet className="h-4 w-4" /> },
    { label: "تسویه‌شده", value: totals.paidOut, icon: <HandCoins className="h-4 w-4" /> },
    { label: "مانده قابل پرداخت", value: totals.balance, icon: <Banknote className="h-4 w-4" />, accent: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Banknote className="h-5 w-5" />
          درآمد و تسویه هنرمندان
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

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={cn(
              "rounded-xl border p-4",
              k.accent ? "border-green-600/40 bg-green-600/5" : "border-border bg-surface",
            )}
          >
            <p className="flex items-center gap-1.5 text-caption text-foreground-secondary">
              {k.icon}
              {k.label}
            </p>
            <p className={cn("mt-2 font-display text-xl font-bold tabular", k.accent && "text-green-700 dark:text-green-300")}>
              {toman(k.value)}
            </p>
          </div>
        ))}
      </div>

      {error && <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

      {/* Record payout */}
      <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-5">
        <p className="font-semibold">ثبت تسویه جدید</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-caption text-muted">هنرمند</span>
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              required
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">انتخاب…</option>
              {earnings.map((a) => (
                <option key={a.artistId} value={a.artistId}>
                  {a.artistName ? t(a.artistName, "fa") : a.artistId}
                  {a.balanceToman > 0 ? ` — مانده ${toman(a.balanceToman)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-muted">مبلغ (تومان)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputMode="numeric"
              dir="ltr"
              placeholder="1500000"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">روش پرداخت / شناسه</span>
            <input
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              required
              placeholder="شبا IR… / فیش شماره…"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">یادداشت (اختیاری)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || !artistId}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            ثبت تسویه
          </button>
          {saved && <span className="text-sm text-green-700 dark:text-green-300">ثبت شد</span>}
        </div>
      </form>

      {/* Artist ledger */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-foreground-secondary" />
        </div>
      ) : earnings.length === 0 ? (
        <p className="rounded-md border border-border p-5 text-sm text-foreground-secondary">
          هنوز فروش دیجیتالی ثبت نشده است.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-background-secondary text-start text-caption text-foreground-secondary">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">هنرمند</th>
                <th className="px-4 py-2.5 text-start font-medium">فروش‌ها</th>
                <th className="px-4 py-2.5 text-start font-medium">فروش ناخالص</th>
                <th className="px-4 py-2.5 text-start font-medium">سهم هنرمند</th>
                <th className="px-4 py-2.5 text-start font-medium">تسویه‌شده</th>
                <th className="px-4 py-2.5 text-start font-medium">مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {earnings.map((a) => (
                <tr key={a.artistId}>
                  <td className="px-4 py-3 font-medium">{a.artistName ? t(a.artistName, "fa") : a.artistId}</td>
                  <td className="px-4 py-3 tabular">{faNum(a.salesCount)}</td>
                  <td className="px-4 py-3 tabular">{toman(a.grossToman)}</td>
                  <td className="px-4 py-3 tabular">{toman(a.royaltyToman)}</td>
                  <td className="px-4 py-3 tabular text-foreground-secondary">{toman(a.paidOutToman)}</td>
                  <td className={cn("px-4 py-3 font-semibold tabular", a.balanceToman > 0 && "text-green-700 dark:text-green-300")}>
                    {toman(a.balanceToman)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="rounded-xl border border-border">
          <p className="border-b border-border px-4 py-3 font-semibold">تاریخچه تسویه‌ها</p>
          <ul className="divide-y divide-border">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="font-medium">{artistName(p.artistId)}</span>
                <span className="tabular font-semibold">{toman(p.amountToman)}</span>
                <span className="text-foreground-secondary">— {p.method}</span>
                {p.note && <span className="text-caption text-muted">({p.note})</span>}
                <span className="ms-auto text-caption text-foreground-secondary" dir="ltr">
                  {new Date(p.createdAt).toLocaleDateString("fa-IR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-caption text-foreground-secondary">
        سهم هنرمند با متغیر محیطی <code dir="ltr">ARTIST_ROYALTY_PERCENT</code> تنظیم می‌شود (پیش‌فرض {faNum(70)}٪) و فقط روی فروش
        طرح‌هایی اعمال می‌شود که به یک هنرمند منتسب‌اند؛ طرح‌های داخلی سایت درآمد پلتفرم محسوب می‌شوند.
      </p>
    </div>
  );
}
