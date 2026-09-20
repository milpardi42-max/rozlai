"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  Crown,
  ExternalLink,
  Heart,
  ImageIcon,
  Layers,
  LayoutGrid,
  Loader2,
  LogOut,
  PackagePlus,
  Palette,
  Pencil,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Trash2,
  Upload,
  User,
  X,
  DollarSign,
  ChevronRight,
  Package,
  Clock,
  Store,
} from "lucide-react";
import { useAuth, useCart, useFavorites, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, EmptyState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { faNum, formatPrice, href } from "@/lib/utils";
import type { Artist, Category, Colorway, Pattern, Product, Space } from "@/lib/types";
import type { Order } from "@/lib/data/orders";

type Tab = "overview" | "patterns" | "products" | "profile" | "stats" | "shop" | "plan";
type FormMode = "idle" | "new-pattern" | "new-product" | "edit-pattern" | "edit-product";

interface ArtistData {
  patterns: Pattern[];
  products: Product[];
  categories: Category[];
  spaces: Space[];
}

/* ------------------------------------------------------------------ */
/* Main Dashboard                                                        */
/* ------------------------------------------------------------------ */
export function ArtistDashboard() {
  const { user, logout } = useAuth();
  const { ids } = useFavorites();
  const { lines } = useCart();
  const { locale } = useLocale();
  const fa = locale === "fa";

  const [data, setData] = useState<ArtistData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [editTarget, setEditTarget] = useState<Pattern | Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/artist/patterns", { ...SESSION_FETCH });
      if (!r.ok) throw new Error();
      const d = await r.json() as ArtistData & { ok: boolean };
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const r = await fetch("/api/orders", { ...SESSION_FETCH });
      if (r.ok) {
        const d = (await r.json()) as { ok: boolean; orders?: Order[] };
        setOrders(d.orders ?? []);
      }
    } catch { /* non-fatal */ }
    finally { setOrdersLoaded(true); }
  }, []);

  useEffect(() => { void load(); void loadOrders(); }, [load, loadOrders]);

  const deleteItem = async (id: string, type: "pattern" | "product") => {
    if (!confirm(fa ? "حذف شود؟" : "Delete this item?")) return;
    await fetch(`/api/artist/patterns?id=${id}&type=${type}`, { ...SESSION_FETCH, method: "DELETE" });
    void load();
  };

  const handleFormSaved = (savedType?: "pattern" | "product") => {
    setFormMode("idle");
    setEditTarget(null);
    void load();
    // Auto-navigate to the matching tab after save
    if (savedType === "product") setTab("products");
    else if (savedType === "pattern") setTab("patterns");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={fa ? "خطا در بارگذاری اطلاعات." : "Could not load your data."} onRetry={load} />;
  }

  const totalRevenue = orders.reduce((s, o) => s + (typeof o.total === "number" ? o.total : (o.total as { fa: number; en: number })[locale === "fa" ? "fa" : "en"] ?? 0), 0);
  const n = (v: number) => locale === "fa" ? faNum(v) : String(v);

  /* Initials for avatar */
  const initials = (user?.name ?? "A")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: fa ? "خلاصه" : "Overview", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "patterns", label: fa ? `الگوها (${data?.patterns.length ?? 0})` : `Patterns (${data?.patterns.length ?? 0})`, icon: <Palette className="h-4 w-4" /> },
    { id: "products", label: fa ? `محصولات (${data?.products.length ?? 0})` : `Products (${data?.products.length ?? 0})`, icon: <PackagePlus className="h-4 w-4" /> },
    { id: "profile", label: fa ? "پروفایل" : "Profile", icon: <User className="h-4 w-4" /> },
    { id: "stats", label: fa ? "آمار" : "Stats", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "shop", label: fa ? "خرید از فروشگاه" : "Shop", icon: <ShoppingBag className="h-4 w-4" /> },
    { id: "plan", label: fa ? "پلن و پروفایل عمومی" : "Plan & Public Profile", icon: <Crown className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background-secondary pt-[calc(var(--announce-h,0px)+var(--header-h))]">

      {/* ── Cover Banner ── */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-accent/80 via-primary/70 to-blue/70">
        <div className="absolute inset-0 bg-[url('/images/collections/s01.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-background-secondary/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 container-x pb-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            {fa ? "داشبورد هنرمند" : "Artist Dashboard"}
          </div>
        </div>
      </div>

      <div className="container-x pb-28">
        {/* ── Profile row ── */}
        <div className="relative -mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background-secondary bg-gradient-to-br from-accent/20 to-blue/20 shadow-medium">
              <span className="font-display text-2xl font-bold text-accent">{initials}</span>
            </div>
            <div className="pb-1">
              <h1 className="font-display text-h2">{fa ? `سلام، ${user?.name}` : `Hello, ${user?.name}`}</h1>
              <p className="text-sm text-foreground-secondary" dir="ltr">{user?.email}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-caption font-medium text-accent">
                <Palette className="h-3 w-3" />
                {fa ? "هنرمند" : "Artist"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Link href={href(locale as "fa" | "en", "/shop")} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground-secondary transition hover:border-accent hover:text-accent">
              <Store className="h-3.5 w-3.5" />
              {fa ? "فروشگاه" : "Shop"}
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground-secondary transition hover:border-error hover:text-error"
            >
              <LogOut className="h-3.5 w-3.5" />
              {fa ? "خروج" : "Sign out"}
            </button>
          </div>
        </div>

        {/* ── Quick stat chips ── */}
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { label: fa ? "الگوها" : "Patterns", value: n(data?.patterns.length ?? 0), icon: <Palette className="h-3.5 w-3.5 text-accent" />, color: "bg-accent/8 text-accent" },
            { label: fa ? "محصولات" : "Products", value: n(data?.products.length ?? 0), icon: <PackagePlus className="h-3.5 w-3.5 text-blue" />, color: "bg-blue/8 text-blue" },
            { label: fa ? "علاقه‌مندی‌ها" : "Favorites", value: n(ids.size), icon: <Heart className="h-3.5 w-3.5 text-error" />, color: "bg-error/8 text-error" },
            { label: fa ? "سفارش‌ها" : "Orders", value: n(orders.length), icon: <Package className="h-3.5 w-3.5 text-success" />, color: "bg-success/8 text-success" },
          ].map((chip) => (
            <div key={chip.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${chip.color}`}>
              {chip.icon}
              {chip.value} {chip.label}
            </div>
          ))}
        </div>

        {/* ── Main layout: sidebar + content ── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* ── Sidebar ── */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start space-y-3">
            <nav className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                {fa ? "بخش‌ها" : "Sections"}
              </p>
              <ul className="pb-2">
                {tabs.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                        tab === t.id
                          ? "bg-accent/8 font-semibold text-accent"
                          : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">{t.icon}{t.label}</span>
                      <ChevronRight className={`h-3.5 w-3.5 opacity-40 ${fa ? "rotate-180" : ""}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Add buttons */}
            <div className="rounded-2xl border border-border bg-surface p-3 shadow-soft space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted px-1 pb-1">
                {fa ? "آپلود محتوا" : "Upload content"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => { setEditTarget(null); setFormMode("new-pattern"); }}
              >
                <Plus className="h-4 w-4" />
                {fa ? "الگوی جدید" : "New pattern"}
              </Button>
              <Button
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => { setEditTarget(null); setFormMode("new-product"); }}
              >
                <Plus className="h-4 w-4" />
                {fa ? "محصول جدید" : "New product"}
              </Button>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{fa ? "خلاصه" : "Summary"}</p>
              <div className="mt-3 space-y-3">
                {[
                  { label: fa ? "الگوها" : "Patterns", value: data?.patterns.length ?? 0, icon: <Palette className="h-3.5 w-3.5" /> },
                  { label: fa ? "محصولات" : "Products", value: data?.products.length ?? 0, icon: <PackagePlus className="h-3.5 w-3.5" /> },
                  { label: fa ? "سفارش‌ها" : "Orders", value: orders.length, icon: <Package className="h-3.5 w-3.5" /> },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-foreground-secondary">{row.icon}{row.label}</span>
                    <span className="text-sm font-semibold">{n(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main>
            {tab === "overview" && (
              <OverviewPanel
                data={data}
                orders={orders}
                ordersLoaded={ordersLoaded}
                fa={fa}
                locale={locale}
                ids={ids}
                lines={lines}
                totalRevenue={totalRevenue}
                onTabChange={setTab}
              />
            )}
            {tab === "patterns" && (
              <ItemGrid
                items={data?.patterns ?? []}
                type="pattern"
                fa={fa}
                locale={locale}
                onEdit={(item) => { setEditTarget(item); setFormMode("edit-pattern"); }}
                onDelete={(id) => deleteItem(id, "pattern")}
              />
            )}
            {tab === "products" && (
              <ItemGrid
                items={data?.products ?? []}
                type="product"
                fa={fa}
                locale={locale}
                onEdit={(item) => { setEditTarget(item); setFormMode("edit-product"); }}
                onDelete={(id) => deleteItem(id, "product")}
              />
            )}
            {tab === "profile" && <ProfileEditor fa={fa} />}
            {tab === "stats" && <StatsPanel data={data} fa={fa} locale={locale} orders={orders} />}
            {tab === "shop" && <ShopPanel fa={fa} locale={locale} />}
            {tab === "plan" && <PlanPanel fa={fa} locale={locale} />}
          </main>
        </div>
      </div>

      {/* Slide-in Form Panel */}
      {formMode !== "idle" && (
        <FormPanel
          mode={formMode}
          initial={editTarget}
          fa={fa}
          categories={data?.categories ?? []}
          spaces={data?.spaces ?? []}
          onSaved={handleFormSaved}
          onClose={() => { setFormMode("idle"); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview Panel                                                        */
/* ------------------------------------------------------------------ */
function OverviewPanel({
  data,
  orders,
  ordersLoaded,
  fa,
  locale,
  ids,
  lines,
  totalRevenue,
  onTabChange,
}: {
  data: ArtistData | null;
  orders: Order[];
  ordersLoaded: boolean;
  fa: boolean;
  locale: string;
  ids: Set<string>;
  lines: unknown[];
  totalRevenue: number;
  onTabChange: (t: Tab) => void;
}) {
  const n = (v: number) => locale === "fa" ? faNum(v) : String(v);

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: fa ? "الگوها" : "Patterns", value: n(data?.patterns.length ?? 0), icon: <Palette className="h-5 w-5" />, color: "text-accent", bg: "bg-accent/10", action: () => onTabChange("patterns") },
          { label: fa ? "محصولات" : "Products", value: n(data?.products.length ?? 0), icon: <PackagePlus className="h-5 w-5" />, color: "text-blue", bg: "bg-blue/10", action: () => onTabChange("products") },
          { label: fa ? "علاقه‌مندی‌ها" : "Favorites", value: n(ids.size), icon: <Heart className="h-5 w-5" />, color: "text-error", bg: "bg-error/10", action: undefined },
          { label: fa ? "سبد خرید" : "Cart items", value: n((lines as unknown[]).length), icon: <ShoppingBag className="h-5 w-5" />, color: "text-success", bg: "bg-success/10", action: undefined },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.action}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 text-start shadow-soft transition-all hover:border-${card.color.split("-")[1]}/40 hover:shadow-medium ${card.action ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className={`absolute -end-4 -top-4 h-20 w-20 rounded-full opacity-10 transition group-hover:opacity-20 ${card.bg}`} />
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>{card.icon}</div>
            <p className="mt-4 font-display text-h2 tabular">{card.value}</p>
            <p className="text-caption text-foreground-secondary">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Revenue card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-caption text-foreground-secondary">{fa ? "مجموع خریدهای شما" : "Your total purchases"}</p>
            <p className="font-display text-h2 tabular">{formatPrice({ fa: totalRevenue, en: totalRevenue }, locale as "fa" | "en")}</p>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-border bg-surface shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <p className="font-semibold">{fa ? "آخرین سفارش‌ها" : "Recent orders"}</p>
          {orders.length > 0 && (
            <button type="button" onClick={() => onTabChange("shop")} className="text-caption text-accent hover:underline">
              {fa ? "مشاهده همه" : "View all"}
            </button>
          )}
        </div>
        <div className="p-4">
          {!ordersLoaded ? (
            <div className="space-y-2"><div className="skeleton h-14 rounded-lg" /><div className="skeleton h-14 rounded-lg" /></div>
          ) : orders.length === 0 ? (
            <EmptyState
              title={fa ? "هنوز سفارشی ندارید." : "No orders yet."}
              action={<Button href={href(locale as "fa" | "en", "/shop")} size="sm" variant="outline">{fa ? "رفتن به فروشگاه" : "Go to shop"}</Button>}
            />
          ) : (
            <ul className="space-y-2">
              {orders.slice(0, 3).map((order) => (
                <li key={order.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background-secondary">
                      <Clock className="h-4 w-4 text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" dir="ltr">{order.id}</p>
                      <p className="text-caption text-foreground-secondary">
                        {new Date(order.createdAt).toLocaleDateString(fa ? "fa-IR" : "en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular">{formatPrice(order.total, locale as "fa" | "en")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onTabChange("plan")}
          className="group flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5 text-start transition hover:border-accent hover:bg-accent/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-accent">{fa ? "پروفایل عمومی هنرمند" : "Public Artist Profile"}</p>
            <p className="mt-0.5 text-caption text-foreground-secondary">{fa ? "پلن بخرید و پروفایل عمومی خود را فعال کنید" : "Purchase a plan to activate your public profile"}</p>
          </div>
          <ChevronRight className={`ms-auto h-4 w-4 text-accent ${fa ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => onTabChange("shop")}
          className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-start transition hover:border-foreground hover:shadow-medium"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{fa ? "خرید از فروشگاه" : "Shop products"}</p>
            <p className="mt-0.5 text-caption text-foreground-secondary">{fa ? "به‌عنوان هنرمند از فروشگاه خرید کنید" : "Purchase from the store as an artist"}</p>
          </div>
          <ChevronRight className={`ms-auto h-4 w-4 text-muted ${fa ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item Grid                                                             */
/* ------------------------------------------------------------------ */
function ItemGrid({
  items,
  type,
  fa,
  locale,
  onEdit,
  onDelete,
}: {
  items: (Pattern | Product)[];
  type: "pattern" | "product";
  fa: boolean;
  locale: string;
  onEdit: (item: Pattern | Product) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title={fa ? `هنوز ${type === "pattern" ? "الگویی" : "محصولی"} ندارید.` : `No ${type}s yet.`}
        description={fa ? "اولین آیتم خود را اضافه کنید." : "Add your first item."}
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const image = "image" in item ? item.image : (("colors" in item && item.colors[0]?.image) || "/images/collections/s01.jpg");
        const title = typeof item.title === "object" ? (locale === "fa" ? item.title.fa : item.title.en) : item.title;
        const slug = item.slug;
        const viewPath = type === "pattern" ? `/patterns/${slug}` : `/shop/${slug}`;

        return (
          <li key={item.id} className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition hover:shadow-medium">
            <div className="relative aspect-square overflow-hidden">
              <Image src={image} alt="" fill sizes="280px" className="object-cover transition-transform group-hover:scale-105" />
              {item.isNew && (
                <span className="absolute left-2 top-2">
                  <Badge tone="accent">{fa ? "جدید" : "New"}</Badge>
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-caption text-foreground-secondary" dir="ltr">{item.sku}</p>
              {(() => {
                const dots =
                  type === "pattern" && "colorways" in item && item.colorways?.length
                    ? item.colorways
                    : type === "product" && "colors" in item && item.colors?.length
                      ? item.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex, image: c.image }))
                      : [];
                if (!dots.length) return null;
                return (
                  <div className="mt-2 flex items-center gap-1.5">
                    {dots.slice(0, 6).map((d) => (
                      <span key={d.id} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: d.hex }} title={typeof d.name === "object" ? d.name.en : ""} />
                    ))}
                    {dots.length > 6 && <span className="text-[10px] text-muted">+{dots.length - 6}</span>}
                  </div>
                );
              })()}
              <p className="mt-1 text-sm font-semibold tabular">
                {formatPrice(item.price, locale as "fa" | "en")}
              </p>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {fa ? "ویرایش" : "Edit"}
                </Button>
                <Button size="sm" variant="ghost" href={href(locale as "fa" | "en", viewPath)} external>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Stats Panel                                                           */
/* ------------------------------------------------------------------ */
function StatsPanel({ data, fa, locale, orders }: { data: ArtistData | null; fa: boolean; locale: string; orders: Order[] }) {
  const totalPatterns = data?.patterns.length ?? 0;
  const totalProducts = data?.products.length ?? 0;
  const totalLikes = data?.patterns.reduce((n, p) => n + (p.likes ?? 0), 0) ?? 0;
  const avgPrice =
    totalPatterns > 0
      ? (data?.patterns.reduce((n, p) => n + p.price[locale === "fa" ? "fa" : "en"], 0) ?? 0) / totalPatterns
      : 0;

  const n = (v: number) => locale === "fa" ? v.toLocaleString("fa-IR") : v.toLocaleString("en-US");
  const topPattern = data?.patterns.reduce<Pattern | null>((top, p) => (p.likes ?? 0) > (top?.likes ?? 0) ? p : top, null);
  const topTitle = topPattern ? (locale === "fa" ? topPattern.title?.fa : topPattern.title?.en) ?? "—" : "—";
  const prices = (data?.patterns ?? []).map((p) => p.price[locale === "fa" ? "fa" : "en"]);
  const maxPrice = prices.length ? Math.max(...prices) : 1;
  const totalItems = totalPatterns + totalProducts;
  const patternPct = totalItems ? Math.round((totalPatterns / totalItems) * 100) : 0;
  const productPct = 100 - patternPct;
  const totalOrderRevenue = orders.reduce((s, o) => s + (typeof o.total === "number" ? o.total : (o.total as { fa: number; en: number })[locale === "fa" ? "fa" : "en"] ?? 0), 0);

  const kpiCards = [
    { label: fa ? "تعداد الگوها" : "Total patterns", value: n(totalPatterns), icon: <LayoutGrid className="h-5 w-5" />, color: "text-accent", bg: "bg-accent/10", trend: null },
    { label: fa ? "تعداد محصولات" : "Total products", value: n(totalProducts), icon: <PackagePlus className="h-5 w-5" />, color: "text-blue", bg: "bg-blue/10", trend: null },
    { label: fa ? "مجموع لایک‌ها" : "Total likes", value: n(totalLikes), icon: <Heart className="h-5 w-5" />, color: "text-error", bg: "bg-error/10", trend: totalLikes > 0 ? "up" : null },
    { label: fa ? "میانگین قیمت الگو" : "Avg pattern price", value: locale === "fa" ? `${avgPrice.toLocaleString("fa-IR")} ت` : `$${avgPrice.toFixed(0)}`, icon: <DollarSign className="h-5 w-5" />, color: "text-success", bg: "bg-success/10", trend: avgPrice > 0 ? "up" : null },
    { label: fa ? "سفارش‌های خریداری‌شده" : "Purchases made", value: n(orders.length), icon: <Package className="h-5 w-5" />, color: "text-primary", bg: "bg-primary/10", trend: orders.length > 0 ? "up" : null },
    { label: fa ? "مجموع خرید" : "Total spent", value: formatPrice({ fa: totalOrderRevenue, en: totalOrderRevenue }, locale as "fa" | "en"), icon: <ShoppingBag className="h-5 w-5" />, color: "text-warning", bg: "bg-warning/10", trend: null },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => (
          <div key={card.label} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>{card.icon}</div>
            <p className="mt-4 font-display text-h2 tabular">{card.value}</p>
            <p className="mt-1 text-caption text-foreground-secondary">{card.label}</p>
            {card.trend && (
              <span className={`absolute end-4 top-4 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.trend === "up" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                {card.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {card.trend === "up" ? (fa ? "رشد" : "Up") : (fa ? "کاهش" : "Down")}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted" />
            <p className="font-semibold">{fa ? "توزیع محتوا" : "Content breakdown"}</p>
          </div>
          <div className="mt-5 space-y-4">
            {[{ label: fa ? "الگوها" : "Patterns", pct: patternPct, color: "bg-accent" }, { label: fa ? "محصولات" : "Products", pct: productPct, color: "bg-blue" }].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-secondary">{row.label}</span>
                  <span className="font-semibold tabular">{row.pct}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background-secondary">
                  <div className={`h-full rounded-full ${row.color} transition-all duration-700`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-caption text-muted">{fa ? `جمع کل: ${n(totalItems)} آیتم` : `Total: ${n(totalItems)} items`}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-error" />
            <p className="font-semibold">{fa ? "محبوب‌ترین الگو" : "Most liked pattern"}</p>
          </div>
          {topPattern ? (
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border">
                <Image src={topPattern.image ?? "/images/collections/s01.jpg"} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{topTitle}</p>
                <p className="text-caption text-foreground-secondary" dir="ltr">{topPattern.sku}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 fill-error text-error" />
                  <span className="text-sm font-semibold text-error tabular">{n(topPattern.likes ?? 0)}</span>
                  <span className="text-caption text-muted">{fa ? "لایک" : "likes"}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-foreground-secondary">{fa ? "هنوز الگویی اضافه نکرده‌اید." : "No patterns yet."}</p>
          )}
        </div>
      </div>

      {prices.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted" />
            <p className="font-semibold">{fa ? "توزیع قیمت الگوها" : "Pattern price distribution"}</p>
          </div>
          <div className="mt-5 flex items-end gap-1.5 h-20">
            {(data?.patterns ?? []).map((p) => {
              const price = p.price[locale === "fa" ? "fa" : "en"];
              const heightPct = maxPrice > 0 ? Math.round((price / maxPrice) * 100) : 4;
              const title = locale === "fa" ? p.title?.fa : p.title?.en;
              return (
                <div key={p.id} title={`${title}: ${locale === "fa" ? `${price.toLocaleString("fa-IR")} ت` : `$${price}`}`} className="group relative flex-1 min-w-0 cursor-default">
                  <div className="w-full rounded-t-sm bg-accent/40 transition-all group-hover:bg-accent" style={{ height: `${Math.max(heightPct, 4)}%` }} />
                  <div className="pointer-events-none absolute bottom-full mb-1 start-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background group-hover:block">
                    {locale === "fa" ? `${price.toLocaleString("fa-IR")} ت` : `$${price}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted">
            <span>{locale === "fa" ? `کم‌ترین: ${Math.min(...prices).toLocaleString("fa-IR")} ت` : `Min: $${Math.min(...prices)}`}</span>
            <span>{locale === "fa" ? `بیش‌ترین: ${maxPrice.toLocaleString("fa-IR")} ت` : `Max: $${maxPrice}`}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shop Panel (artist buys from store)                                   */
/* ------------------------------------------------------------------ */
function ShopPanel({ fa, locale }: { fa: boolean; locale: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/orders", { ...SESSION_FETCH });
        if (r.ok) {
          const d = (await r.json()) as { ok: boolean; orders?: Order[] };
          setOrders(d.orders ?? []);
        }
      } catch { /* non-fatal */ }
      finally { setLoaded(true); }
    })();
  }, []);

  const statusLabel = (status: Order["status"]) => {
    const map: Record<Order["status"], { fa: string; en: string }> = {
      pending: { fa: "در انتظار تأیید", en: "Pending" },
      confirmed: { fa: "تأیید شده", en: "Confirmed" },
      shipped: { fa: "ارسال شده", en: "Shipped" },
      delivered: { fa: "تحویل داده شده", en: "Delivered" },
      cancelled: { fa: "لغو شده", en: "Cancelled" },
    };
    return fa ? map[status].fa : map[status].en;
  };

  const statusTone = (status: Order["status"]): "neutral" | "accent" | "success" | "error" | "outline" => {
    if (status === "delivered") return "success";
    if (status === "cancelled") return "error";
    if (status === "shipped" || status === "confirmed") return "accent";
    return "outline";
  };

  return (
    <div className="space-y-6">
      {/* CTA to shop */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div>
          <h2 className="font-display text-lg font-semibold">{fa ? "خرید از فروشگاه" : "Shop from the store"}</h2>
          <p className="mt-1 text-sm text-foreground-secondary">{fa ? "به‌عنوان هنرمند می‌توانید محصولات فروشگاه را خریداری کنید." : "As an artist you can purchase products from the store."}</p>
        </div>
        <Button href={href(locale as "fa" | "en", "/shop")} size="sm" external>
          <ShoppingBag className="h-4 w-4" />
          {fa ? "رفتن به فروشگاه" : "Go to shop"}
        </Button>
      </div>

      {/* Order history */}
      <div className="rounded-2xl border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-6 py-4">
          <p className="font-semibold">{fa ? "تاریخچه سفارش‌ها" : "Order history"}</p>
        </div>
        <div className="p-4">
          {!loaded ? (
            <div className="space-y-2"><div className="skeleton h-16 rounded-lg" /><div className="skeleton h-16 rounded-lg" /></div>
          ) : orders.length === 0 ? (
            <EmptyState title={fa ? "هنوز سفارشی ندارید." : "No orders yet."} action={<Button href={href(locale as "fa" | "en", "/shop")} size="sm" variant="outline">{fa ? "خرید کنید" : "Shop now"}</Button>} />
          ) : (
            <ul className="space-y-2">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-secondary">
                      <Package className="h-4 w-4 text-muted" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold" dir="ltr">{order.id}</span>
                        <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
                      </div>
                      <p className="mt-0.5 text-caption text-foreground-secondary">
                        {new Date(order.createdAt).toLocaleDateString(fa ? "fa-IR" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                        {" · "}{order.lines.length}{" "}{fa ? "قلم" : order.lines.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular">{formatPrice(order.total, locale as "fa" | "en")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan Panel (profile activation + plan purchase)                       */
/* ------------------------------------------------------------------ */
function PlanPanel({ fa, locale }: { fa: boolean; locale: string }) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/artist/profile", { ...SESSION_FETCH });
        if (r.ok) {
          const d = (await r.json()) as { ok: boolean; artist: Artist | null };
          setArtist(d.artist);
        }
      } catch { /* non-fatal */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  const isApproved = artist?.status === "approved";
  const isPending = !artist?.status || artist?.status === "pending";
  const isRejected = artist?.status === "rejected";

  const plans = [
    {
      id: "basic",
      name: fa ? "پلن پایه" : "Basic Plan",
      price: fa ? "۱۴۹,۰۰۰ تومان / ماه" : "$9.99 / month",
      features: fa
        ? ["پروفایل عمومی", "آپلود تا ۱۰ الگو", "آپلود تا ۵ محصول", "آمار پایه"]
        : ["Public profile", "Upload up to 10 patterns", "Upload up to 5 products", "Basic analytics"],
      highlight: false,
    },
    {
      id: "pro",
      name: fa ? "پلن حرفه‌ای" : "Professional Plan",
      price: fa ? "۳۴۹,۰۰۰ تومان / ماه" : "$24.99 / month",
      features: fa
        ? ["پروفایل عمومی ویژه", "آپلود نامحدود الگو", "آپلود نامحدود محصول", "آمار پیشرفته", "نمایش در صفحه هنرمندان", "پشتیبانی اولویت‌دار"]
        : ["Featured public profile", "Unlimited pattern uploads", "Unlimited product uploads", "Advanced analytics", "Listed on artists page", "Priority support"],
      highlight: true,
    },
    {
      id: "studio",
      name: fa ? "پلن استودیو" : "Studio Plan",
      price: fa ? "۷۴۹,۰۰۰ تومان / ماه" : "$49.99 / month",
      features: fa
        ? ["همه امکانات حرفه‌ای", "صفحه استودیو اختصاصی", "لینک‌های اختصاصی", "مدیریت تیم", "پشتیبانی ۲۴/۷"]
        : ["Everything in Professional", "Dedicated studio page", "Custom links", "Team management", "24/7 support"],
      highlight: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-2xl border p-5 ${isApproved ? "border-success/30 bg-success/5" : isPending ? "border-accent/30 bg-accent/5" : "border-error/30 bg-error/5"}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isApproved ? "bg-success/10 text-success" : isPending ? "bg-accent/10 text-accent" : "bg-error/10 text-error"}`}>
            {isApproved ? <CheckCircle2 className="h-5 w-5" /> : isPending ? <Bell className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold">
              {isApproved
                ? (fa ? "پروفایل شما تأیید شده است" : "Your profile is approved")
                : isPending
                  ? (fa ? "پروفایل در انتظار تأیید" : "Profile pending review")
                  : (fa ? "پروفایل رد شده" : "Profile rejected")}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              {isApproved
                ? (fa ? "پروفایل عمومی شما در سایت نمایش داده می‌شود. برای امکانات بیشتر پلن خود را ارتقا دهید." : "Your public profile is live. Upgrade your plan for more features.")
                : isPending
                  ? (fa ? "تیم ما در حال بررسی پروفایل شما هستند. معمولاً ظرف ۲۴ تا ۴۸ ساعت بررسی می‌شود." : "Our team is reviewing your profile. Usually within 24–48 hours.")
                  : (fa ? `علت رد: ${artist?.rejectionNote ?? ""}. لطفاً پروفایل خود را ویرایش کرده و مجدداً ارسال کنید.` : `Reason: ${artist?.rejectionNote ?? ""}. Please edit your profile and resubmit.`)}
            </p>
            {isApproved && artist && (
              <div className="mt-3">
                <Button size="sm" href={href(locale as "fa" | "en", `/artists/${artist.slug}`)} external variant="outline">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {fa ? "مشاهده پروفایل عمومی" : "View public profile"}
                </Button>
              </div>
            )}
            {!artist && (
              <p className="mt-2 text-sm text-foreground-secondary">
                {fa ? "برای فعال‌سازی پروفایل عمومی، ابتدا پروفایل خود را در بخش «پروفایل» کامل کنید و سپس یک پلن خریداری نمایید." : "To activate your public profile, first complete your profile in the 'Profile' tab, then purchase a plan."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-4">{fa ? "انتخاب پلن" : "Choose a plan"}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${plan.highlight ? "border-accent bg-accent/5 shadow-medium" : "border-border bg-surface shadow-soft"}`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-[11px] font-bold text-white shadow">
                  {fa ? "پیشنهاد ویژه" : "Most popular"}
                </span>
              )}
              <div>
                <p className={`font-display text-base font-bold ${plan.highlight ? "text-accent" : "text-foreground"}`}>{plan.name}</p>
                <p className={`mt-1 text-xl font-bold tabular ${plan.highlight ? "text-accent" : "text-foreground"}`}>{plan.price}</p>
              </div>
              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground-secondary">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-accent" : "text-success"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.highlight ? "primary" : "outline"}
                onClick={() => alert(fa ? "سیستم پرداخت به‌زودی فعال می‌شود." : "Payment system coming soon.")}
              >
                <Star className="h-4 w-4" />
                {fa ? "خرید پلن" : "Get plan"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Rejected note */}
      {isRejected && (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-5">
          <p className="font-semibold text-error">{fa ? "علت رد پروفایل:" : "Rejection reason:"}</p>
          <p className="mt-1 text-sm text-foreground-secondary">{artist?.rejectionNote ?? (fa ? "توضیحی ارائه نشده است." : "No reason provided.")}</p>
          <p className="mt-3 text-sm text-foreground-secondary">
            {fa ? "لطفاً پروفایل خود را در بخش «پروفایل» ویرایش کنید و مجدداً ارسال نمایید." : "Please edit your profile in the 'Profile' tab and resubmit."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ImageUpload                                                           */
/* ------------------------------------------------------------------ */
function ImageUpload({
  name,
  value,
  onChange,
  fa,
  label,
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
  fa: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [drag, setDrag] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    setUploadErr("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/artist/upload", { method: "POST", body: fd });
      const d = (await r.json()) as { ok: boolean; url?: string; error?: string };
      if (!r.ok || !d.ok || !d.url) {
        const errMap: Record<string, { fa: string; en: string }> = {
          unsupported_type: { fa: "فرمت تصویر پشتیبانی نمی‌شود.", en: "Unsupported image format." },
          file_too_large: { fa: "حجم فایل بیش از ۸ مگابایت است.", en: "File exceeds the 8 MB limit." },
        };
        const msg = errMap[d.error ?? ""] ?? { fa: "آپلود ناموفق بود.", en: "Upload failed." };
        setUploadErr(fa ? msg.fa : msg.en);
      } else {
        onChange(d.url);
      }
    } catch {
      setUploadErr(fa ? "خطای شبکه." : "Network error.");
    } finally {
      setUploading(false);
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors ${drag ? "border-accent bg-accent/8" : "border-border hover:border-accent/60 hover:bg-background-secondary"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        {value ? (
          <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border">
            <Image src={value} alt="" fill sizes="400px" className="object-contain" onError={() => onChange("")} />
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); }} className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2 text-muted">
            {uploading ? <Loader2 className="h-7 w-7 animate-spin text-accent" /> : <Upload className="h-7 w-7 opacity-50" />}
            <p className="text-center text-xs">
              {uploading ? (fa ? "در حال آپلود…" : "Uploading…") : (fa ? "کلیک کنید یا فایل را اینجا رها کنید" : "Click or drop image here")}
            </p>
            <p className="text-[10px] text-muted">{fa ? "JPG · PNG · WebP · GIF — حداکثر ۸ مگابایت" : "JPG · PNG · WebP · GIF — max 8 MB"}</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" onChange={pick} disabled={uploading} />
        <input type="hidden" name={name} value={value} />
      </div>
      {uploadErr && <p className="rounded-lg bg-error/10 px-3 py-1.5 text-xs text-error">{uploadErr}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ColorwayEditor                                                        */
/* ------------------------------------------------------------------ */
function ColorwayEditor({ fa, initial }: { fa: boolean; initial?: Colorway[] | { id: string; name: { fa: string; en: string }; hex: string; image: string; stock?: number }[] }) {
  type Row = { nameFa: string; nameEn: string; hex: string; image: string; stock: string };
  const seed: Row[] = initial && initial.length
    ? initial.map((c) => ({ nameFa: c.name?.fa ?? "", nameEn: c.name?.en ?? "", hex: c.hex ?? "#888888", image: ("image" in c ? c.image : "") || "", stock: String(("stock" in c ? (c as { stock?: number }).stock : 12) ?? 12) }))
    : [{ nameFa: fa ? "اصلی" : "Default", nameEn: "Default", hex: "#8fa08e", image: "", stock: "12" }];

  const [rows, setRows] = useState<Row[]>(seed);
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const add = () => setRows((r) => [...r, { nameFa: "", nameEn: "", hex: "#c99a92", image: "", stock: "12" }]);
  const remove = (i: number) => setRows((r) => (r.length <= 1 ? r : r.filter((_, idx) => idx !== i)));

  return (
    <div className="rounded-lg border border-border bg-background-secondary/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{fa ? "رنگ‌بندی‌ها (Colorways)" : "Colourways"}</p>
          <p className="mt-0.5 text-caption text-foreground-secondary">
            {fa ? "هر رنگ یک پیش‌نمایش جدا دارد و روی کارت به‌صورت دایره نمایش داده می‌شود." : "Each colour has its own preview and shows as a circle on cards."}
          </p>
        </div>
        <button type="button" onClick={add} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-caption font-medium hover:border-foreground">
          <Plus className="h-3.5 w-3.5" />
          {fa ? "افزودن رنگ" : "Add colour"}
        </button>
      </div>
      <input type="hidden" name="colorway_count" value={rows.length} />
      <ul className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded-md border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full ring-1 ring-border" style={{ background: row.hex || "#ccc" }} />
                <span className="text-caption text-muted">{fa ? `رنگ ${i + 1}` : `Colour ${i + 1}`}{i === 0 ? (fa ? " · پیش‌فرض" : " · default") : ""}</span>
              </div>
              {rows.length > 1 && <button type="button" onClick={() => remove(i)} className="text-caption text-error hover:underline">{fa ? "حذف" : "Remove"}</button>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name={`cw_name_fa_${i}`} dir="rtl" placeholder={fa ? "نام فارسی" : "Name (fa)"} value={row.nameFa} onChange={(e) => update(i, { nameFa: e.target.value })} />
              <Input name={`cw_name_en_${i}`} dir="ltr" placeholder="Name (en)" value={row.nameEn} onChange={(e) => update(i, { nameEn: e.target.value })} />
              <div className="flex items-center gap-2">
                <input type="color" aria-label="hex" value={/^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#888888"} onChange={(e) => update(i, { hex: e.target.value })} className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5" />
                <Input name={`cw_hex_${i}`} dir="ltr" placeholder="#8fa08e" value={row.hex} onChange={(e) => update(i, { hex: e.target.value })} className="flex-1" />
              </div>
              <div>
                <ImageUpload name={`cw_image_${i}`} value={row.image} onChange={(url) => update(i, { image: url })} fa={fa} label={fa ? "تصویر رنگ" : "Colour image"} />
              </div>
              <Input name={`cw_stock_${i}`} type="number" min={0} dir="ltr" placeholder="Stock" value={row.stock} onChange={(e) => update(i, { stock: e.target.value })} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form Panel                                                            */
/* ------------------------------------------------------------------ */
function FormPanel({
  mode,
  initial,
  fa,
  categories,
  spaces,
  onSaved,
  onClose,
}: {
  mode: FormMode;
  initial: Pattern | Product | null;
  fa: boolean;
  categories: Category[];
  spaces: Space[];
  onSaved: (savedType: "pattern" | "product") => void;
  onClose: () => void;
}) {
  const isProduct = mode === "new-product" || mode === "edit-product";
  const isEdit = mode === "edit-pattern" || mode === "edit-product";
  const pat = !isProduct && initial ? (initial as Pattern) : null;
  const prod = isProduct && initial ? (initial as Product) : null;

  // ── Product-type sub-categories ──────────────────────────────────────
  const PRODUCT_TYPE_PARENT = "cat-product-types";
  const productTypeCats = categories.filter((c) => c.parentId === PRODUCT_TYPE_PARENT);
  const otherCats = categories.filter((c) => !c.parentId && c.id !== PRODUCT_TYPE_PARENT);
  const defaultCatId = initial?.categoryId ?? (productTypeCats[0]?.id ?? categories[0]?.id ?? "");
  const [selectedCatId, setSelectedCatId] = useState<string>(defaultCatId);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [priceFaVal, setPriceFaVal] = useState(initial?.price?.fa ?? 0);
  const [priceEnVal, setPriceEnVal] = useState(initial?.price?.en ?? 0);

  const existingDiscount = (() => {
    if (!prod?.compareAt) return 0;
    const base = prod.compareAt.fa;
    const sale = prod.price.fa;
    if (base <= 0 || sale <= 0) return 0;
    return Math.round((1 - sale / base) * 100);
  })();
  const [discountPct, setDiscountPct] = useState<number>(existingDiscount);
  const compareAtFa = discountPct > 0 ? Math.round(priceFaVal / (1 - discountPct / 100)) : 0;
  const compareAtEn = discountPct > 0 ? Math.round((priceEnVal / (1 - discountPct / 100)) * 100) / 100 : 0;

  const [tags, setTags] = useState<string[]>(pat?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const addTag = (raw: string) => { const t = raw.trim().toLowerCase().replace(/\s+/g, "-"); if (t && !tags.includes(t)) setTags((p) => [...p, t]); setTagInput(""); };

  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(pat?.spaceIds ?? []);
  const toggleSpace = (id: string) => setSelectedSpaces((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const [sizes, setSizes] = useState<string[]>(prod?.sizes?.map((s) => (fa ? s.fa : s.en)) ?? []);
  const [sizeInput, setSizeInput] = useState("");
  const addSize = (raw: string) => { const s = raw.trim(); if (s && !sizes.includes(s)) setSizes((p) => [...p, s]); setSizeInput(""); };

  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [prodImageVal, setProdImageVal] = useState(isProduct ? ((initial as Product | null)?.colors?.[0]?.image ?? "") : "");
  const [patImageVal, setPatImageVal] = useState(!isProduct ? ((initial as Pattern | null)?.image ?? "") : "");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    const priceFa = Number(fd.get("price_fa")) || 0;
    const priceEn = Number(fd.get("price_en")) || 0;
    const categoryId = String(fd.get("categoryId") || categories[0]?.id || "");
    const compareFa = discountPct > 0 ? Math.round(priceFa / (1 - discountPct / 100)) : 0;
    const compareEn = discountPct > 0 ? Math.round((priceEn / (1 - discountPct / 100)) * 100) / 100 : 0;

    const colorways: Colorway[] = [];
    if (!isProduct) {
      const count = Number(fd.get("colorway_count") || 0);
      for (let i = 0; i < count; i++) {
        const hex = String(fd.get(`cw_hex_${i}`) || "").trim();
        const img = String(fd.get(`cw_image_${i}`) || "").trim();
        const nameFa = String(fd.get(`cw_name_fa_${i}`) || "").trim();
        const nameEn = String(fd.get(`cw_name_en_${i}`) || "").trim();
        if (!hex && !img) continue;
        colorways.push({ id: `cw-${i}-${Date.now().toString(36)}`, name: { fa: nameFa || `رنگ ${i + 1}`, en: nameEn || `Colour ${i + 1}` }, hex: hex || "#888888", image: img || String(fd.get("image") || "/images/collections/s01.jpg"), isDefault: i === 0 });
      }
    }

    const payload: Record<string, unknown> = {
      _type: isProduct ? "product" : "pattern",
      ...(isEdit && initial ? { id: initial.id } : {}),
      title: { fa: String(fd.get("title_fa") || ""), en: String(fd.get("title_en") || "") },
      description: { fa: String(fd.get("desc_fa") || ""), en: String(fd.get("desc_en") || "") },
      price: { fa: priceFa, en: priceEn },
      ...(compareFa > 0 || compareEn > 0 ? { compareAt: { fa: compareFa, en: compareEn } } : { compareAt: null }),
      slug: String(fd.get("slug") || "").toLowerCase().replace(/\s+/g, "-"),
      sku: String(fd.get("sku") || ""),
      categoryId,
      ...(!isProduct ? {
        image: colorways[0]?.image || String(fd.get("image") || "/images/collections/s01.jpg"),
        colorways,
        palette: colorways.map((c) => c.hex),
        spaceIds: selectedSpaces,
        tags,
        specs: {
          repeat: { fa: String(fd.get("repeat_fa") || "تکرار کامل"), en: String(fd.get("repeat_en") || "Full repeat") },
          dpi: String(fd.get("dpi") || "300 DPI"),
          formats: String(fd.get("formats") || "AI · PDF · TIFF"),
          colors: colorways.length || Number(fd.get("color_count") || 1),
          scale: { fa: String(fd.get("scale_fa") || "متوسط"), en: String(fd.get("scale_en") || "Medium") },
        },
      } : {}),
      ...(isProduct ? {
        materials: { fa: String(fd.get("mat_fa") || ""), en: String(fd.get("mat_en") || "") },
        sizes: sizes.map((s) => ({ fa: s, en: s })),
        colors: (() => {
          const count = Number(fd.get("colorway_count") || 0);
          const mainImg = String(fd.get("product_image") || "").trim();
          const cols = [];
          for (let i = 0; i < count; i++) {
            const hex = String(fd.get(`cw_hex_${i}`) || "").trim();
            const img = String(fd.get(`cw_image_${i}`) || "").trim() || mainImg;
            const nameFa = String(fd.get(`cw_name_fa_${i}`) || "").trim();
            const nameEn = String(fd.get(`cw_name_en_${i}`) || "").trim();
            if (!hex && !img) continue;
            cols.push({ id: `col-${i}`, name: { fa: nameFa || `رنگ ${i + 1}`, en: nameEn || `Colour ${i + 1}` }, hex: hex || "#888888", image: img || "/images/collections/s01.jpg", stock: Number(fd.get(`cw_stock_${i}`) || 12) });
          }
          if (cols.length === 0 && mainImg) {
            cols.push({ id: "col-0", name: { fa: "پیش‌فرض", en: "Default" }, hex: "#888888", image: mainImg, stock: 12 });
          }
          return cols;
        })(),
        image: String(fd.get("product_image") || "").trim() || undefined,
      } : {}),
    };

    try {
      const r = await fetch("/api/artist/patterns", {
        ...SESSION_FETCH,
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      onSaved(isProduct ? "product" : "pattern");
    } catch {
      setErr(fa ? "خطایی رخ داد. دوباره تلاش کنید." : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const SectionHeading = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 border-b border-border pb-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-accent">{icon}</span>
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="ltr" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div ref={modalRef} className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl" dir={fa ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{isEdit ? (fa ? "ویرایش" : "Edit") : (fa ? "افزودن جدید" : "Add new")}</p>
            <h2 className="mt-0.5 font-display text-lg font-semibold">{isProduct ? (fa ? "محصول" : "Product") : (fa ? "الگو" : "Pattern")}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-background-secondary"><X className="h-5 w-5" /></button>
        </div>

        {/* Form body */}
        <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-6 p-6">

            {/* Section 1: Basic info */}
            <div className="space-y-4">
              <SectionHeading icon={<Pencil className="h-3.5 w-3.5" />} label={fa ? "اطلاعات پایه" : "Basic info"} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "عنوان فارسی *" : "Title (fa) *"}><Input name="title_fa" required dir="rtl" defaultValue={initial?.title?.fa ?? ""} placeholder={fa ? "نام الگو یا محصول" : "Persian title"} /></Field>
                <Field label={fa ? "عنوان انگلیسی *" : "Title (en) *"}><Input name="title_en" required dir="ltr" defaultValue={initial?.title?.en ?? ""} placeholder="English title" /></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "Slug (اختیاری)" : "Slug (optional)"}><Input name="slug" dir="ltr" defaultValue={initial?.slug ?? ""} placeholder="my-pattern-name" /></Field>
                <Field label={fa ? "SKU (اختیاری)" : "SKU (optional)"}><Input name="sku" dir="ltr" defaultValue={initial?.sku ?? ""} placeholder={isProduct ? "PROD-001" : "PAT-001"} /></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "توضیحات فارسی" : "Description (fa)"}><Textarea name="desc_fa" dir="rtl" rows={3} defaultValue={initial?.description?.fa ?? ""} placeholder={fa ? "توضیح کوتاه..." : "Persian description"} /></Field>
                <Field label={fa ? "توضیحات انگلیسی" : "Description (en)"}><Textarea name="desc_en" dir="ltr" rows={3} defaultValue={initial?.description?.en ?? ""} placeholder="Short description..." /></Field>
              </div>
            </div>

            {/* Section 2: Category */}
            <div className="space-y-3">
              <SectionHeading icon={<Layers className="h-3.5 w-3.5" />} label={fa ? "دسته‌بندی محصول" : "Product Category"} />
              {/* Hidden input carries the real value */}
              <input type="hidden" name="categoryId" value={selectedCatId} />
              {/* Product-type quick-select pills — prominent for product/pattern uploads */}
              {productTypeCats.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                    {fa ? "دسته‌بندی‌های الگو" : "Pattern Product Types"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {productTypeCats.map((cat) => {
                      const active = selectedCatId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCatId(cat.id)}
                          className={`rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition-all ${
                            active
                              ? "border-accent bg-accent/10 text-accent shadow-soft"
                              : "border-border text-foreground-secondary hover:border-accent/60 hover:text-foreground"
                          }`}
                        >
                          {fa ? cat.name.fa : cat.name.en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Other style categories in a dropdown */}
              {otherCats.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {fa ? "سبک‌های طراحی (اختیاری)" : "Design Styles (optional)"}
                  </p>
                  <div className="relative">
                    <select
                      value={otherCats.some((c) => c.id === selectedCatId) ? selectedCatId : ""}
                      onChange={(e) => { if (e.target.value) setSelectedCatId(e.target.value); }}
                      className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2.5 pe-10 text-sm font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      dir={fa ? "rtl" : "ltr"}
                    >
                      <option value="">{fa ? "— انتخاب سبک طراحی —" : "— Select design style —"}</option>
                      {otherCats.map((cat) => (
                        <option key={cat.id} value={cat.id}>{fa ? cat.name.fa : cat.name.en}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </div>
                </div>
              )}
              {/* Selected category badge */}
              {(() => {
                const sel = categories.find((c) => c.id === selectedCatId);
                return sel ? (
                  <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="text-[12px] text-foreground-secondary">
                      {fa ? "دسته انتخاب‌شده:" : "Selected:"}{" "}
                      <strong className="font-semibold text-foreground">{fa ? sel.name.fa : sel.name.en}</strong>
                    </span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Section 3: Spaces (pattern only) */}
            {!isProduct && spaces.length > 0 && (
              <div className="space-y-3">
                <SectionHeading icon={<LayoutGrid className="h-3.5 w-3.5" />} label={fa ? "فضاهای کاربرد" : "Spaces"} />
                <div className="flex flex-wrap gap-2">
                  {spaces.map((sp) => {
                    const active = selectedSpaces.includes(sp.id);
                    return (
                      <button key={sp.id} type="button" onClick={() => toggleSpace(sp.id)} className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${active ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground"}`}>
                        {fa ? sp.name.fa : sp.name.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 4: Pricing */}
            <div className="space-y-4">
              <SectionHeading icon={<DollarSign className="h-3.5 w-3.5" />} label={fa ? "قیمت‌گذاری" : "Pricing"} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "قیمت (تومان) *" : "Price (IRT) *"}><Input name="price_fa" type="number" min={0} required dir="ltr" value={priceFaVal} onChange={(e) => setPriceFaVal(Number(e.target.value) || 0)} /></Field>
                <Field label={fa ? "قیمت (دلار) *" : "Price (USD) *"}><Input name="price_en" type="number" min={0} step="0.01" required dir="ltr" value={priceEnVal} onChange={(e) => setPriceEnVal(Number(e.target.value) || 0)} /></Field>
              </div>
              <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{fa ? "درصد تخفیف" : "Discount"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{fa ? "قیمت قبل از تخفیف محاسبه می‌شود" : "Compare-at price is auto-calculated"}</p>
                  </div>
                  <div className="relative shrink-0">
                    <select value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} className="appearance-none rounded-lg border border-border bg-background py-2 ps-3 pe-9 text-sm font-semibold focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" dir="ltr">
                      <option value={0}>{fa ? "بدون تخفیف" : "No discount"}</option>
                      {[5, 10, 15, 20, 25, 30, 35, 40, 50].map((p) => (<option key={p} value={p}>{p}%</option>))}
                    </select>
                    <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                  </div>
                </div>
                {discountPct > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                    <div className="rounded-lg bg-background p-2.5 text-center">
                      <p className="text-[10px] text-muted">{fa ? "قیمت اصلی (تومان)" : "Original (IRT)"}</p>
                      <p className="mt-1 text-sm font-semibold tabular text-foreground-secondary line-through">{compareAtFa.toLocaleString(fa ? "fa-IR" : "en-US")}</p>
                    </div>
                    <div className="rounded-lg bg-background p-2.5 text-center">
                      <p className="text-[10px] text-muted">{fa ? "قیمت اصلی (دلار)" : "Original (USD)"}</p>
                      <p className="mt-1 text-sm font-semibold tabular text-foreground-secondary line-through">${compareAtEn.toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-success/10 px-3 py-2 text-center">
                      <p className="text-xs font-semibold text-success">
                        {fa ? `${discountPct}٪ تخفیف — مشتری ${priceFaVal.toLocaleString("fa-IR")} تومان می‌پردازد` : `${discountPct}% off — customer pays $${priceEnVal.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5a: Product image */}
            {isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<ImageIcon className="h-3.5 w-3.5" />} label={fa ? "تصویر محصول" : "Product image"} />
                <ImageUpload name="product_image" value={prodImageVal} onChange={setProdImageVal} fa={fa} />
                <p className="text-[11px] text-muted">{fa ? "در صورت خالی بودن، از تصویر اولین رنگ‌بندی استفاده می‌شود." : "If left empty, the first colourway image is used."}</p>
              </div>
            )}

            {/* Section 5b: Pattern image & specs */}
            {!isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<BarChart3 className="h-3.5 w-3.5" />} label={fa ? "تصویر و مشخصات فنی" : "Image & technical specs"} />
                <ImageUpload name="image" value={patImageVal} onChange={setPatImageVal} fa={fa} label={fa ? "تصویر اصلی الگو" : "Main pattern image"} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={fa ? "نوع تکرار (فا)" : "Repeat type (fa)"}><Input name="repeat_fa" dir="rtl" defaultValue={pat?.specs?.repeat?.fa ?? "تکرار کامل"} /></Field>
                  <Field label={fa ? "نوع تکرار (en)" : "Repeat type (en)"}><Input name="repeat_en" dir="ltr" defaultValue={pat?.specs?.repeat?.en ?? "Full repeat"} /></Field>
                  <Field label="DPI"><Input name="dpi" dir="ltr" defaultValue={pat?.specs?.dpi ?? "300 DPI"} placeholder="300 DPI" /></Field>
                  <Field label={fa ? "فرمت‌ها" : "Formats"}><Input name="formats" dir="ltr" defaultValue={pat?.specs?.formats ?? "AI · PDF · TIFF"} placeholder="AI · PDF · TIFF" /></Field>
                  <Field label={fa ? "مقیاس (فا)" : "Scale (fa)"}><Input name="scale_fa" dir="rtl" defaultValue={pat?.specs?.scale?.fa ?? "متوسط"} /></Field>
                  <Field label={fa ? "مقیاس (en)" : "Scale (en)"}><Input name="scale_en" dir="ltr" defaultValue={pat?.specs?.scale?.en ?? "Medium"} /></Field>
                </div>
              </div>
            )}

            {/* Section 6: Product details */}
            {isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<PackagePlus className="h-3.5 w-3.5" />} label={fa ? "جزئیات محصول" : "Product details"} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={fa ? "متریال (فارسی)" : "Material (fa)"}><Input name="mat_fa" dir="rtl" defaultValue={prod?.materials?.fa ?? ""} placeholder={fa ? "مثال: پارچه پنبه‌ای" : "e.g. Cotton fabric"} /></Field>
                  <Field label={fa ? "متریال (انگلیسی)" : "Material (en)"}><Input name="mat_en" dir="ltr" defaultValue={prod?.materials?.en ?? ""} placeholder="e.g. Cotton fabric" /></Field>
                </div>
                <Field label={fa ? "سایزها" : "Sizes"}>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background p-2">
                    {sizes.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                        {s}
                        <button type="button" onClick={() => setSizes((p) => p.filter((x) => x !== s))} className="rounded-full hover:text-error">×</button>
                      </span>
                    ))}
                    <input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSize(sizeInput); } }} onBlur={() => { if (sizeInput.trim()) addSize(sizeInput); }} placeholder={fa ? "سایز + Enter" : "Size + Enter"} className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" dir={fa ? "rtl" : "ltr"} />
                  </div>
                </Field>
              </div>
            )}

            {/* Section 7: Tags (pattern only) */}
            {!isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<TrendingUp className="h-3.5 w-3.5" />} label={fa ? "برچسب‌ها" : "Tags"} />
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background p-2">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-background-secondary px-2.5 py-0.5 text-xs font-medium">
                      #{t}
                      <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="rounded-full text-muted hover:text-error">×</button>
                    </span>
                  ))}
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }} onBlur={() => { if (tagInput.trim()) addTag(tagInput); }} placeholder={fa ? "برچسب + Enter" : "Tag + Enter"} className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" dir={fa ? "rtl" : "ltr"} />
                </div>
                <p className="text-[11px] text-muted">{fa ? "با Enter یا کاما جدا کنید" : "Separate with Enter or comma"}</p>
              </div>
            )}

            {/* Section 8: Colorways */}
            <div className="space-y-3">
              <SectionHeading icon={<Heart className="h-3.5 w-3.5" />} label={fa ? "رنگ‌بندی‌ها" : "Colourways"} />
              <ColorwayEditor
                fa={fa}
                initial={
                  isProduct
                    ? ((initial as Product | null)?.colors?.map((c) => ({ id: c.id, name: c.name, hex: c.hex, image: c.image, stock: c.stock })) as Colorway[] | undefined)
                    : ((initial as Pattern | null)?.colorways ?? undefined)
                }
              />
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
            {err && <p className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {isEdit ? (fa ? "ذخیره تغییرات" : "Save changes") : (fa ? "ایجاد" : "Create")}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>{fa ? "لغو" : "Cancel"}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile Editor                                                        */
/* ------------------------------------------------------------------ */
function ProfileEditor({ fa }: { fa: boolean }) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/artist/profile", { ...SESSION_FETCH });
        if (!r.ok) throw new Error();
        const d = (await r.json()) as { ok: boolean; artist: Artist | null };
        if (d.artist) {
          setArtist(d.artist);
          setAvatarUrl(d.artist.avatar ?? "");
          setCoverUrl(d.artist.cover ?? "");
          setTags(d.artist.tags ?? []);
        }
      } catch {
        setErr(fa ? "خطا در بارگذاری پروفایل." : "Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fa]);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: { fa: String(fd.get("name_fa") || ""), en: String(fd.get("name_en") || "") },
      profession: { fa: String(fd.get("profession_fa") || ""), en: String(fd.get("profession_en") || "") },
      bio: { fa: String(fd.get("bio_fa") || ""), en: String(fd.get("bio_en") || "") },
      location: { fa: String(fd.get("location_fa") || ""), en: String(fd.get("location_en") || "") },
      social: {
        instagram: String(fd.get("instagram") || "") || undefined,
        behance: String(fd.get("behance") || "") || undefined,
        website: String(fd.get("website") || "") || undefined,
      },
      avatar: avatarUrl || undefined,
      cover: coverUrl || undefined,
      tags,
      licenseType: (fd.get("licenseType") as Artist["licenseType"]) ?? "standard",
    };
    try {
      const r = await fetch("/api/artist/profile", {
        ...SESSION_FETCH,
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as { ok: boolean; error?: string; artist?: Artist };
      if (!d.ok) {
        setErr(d.error === "slug_taken" ? (fa ? "این نام قبلاً استفاده شده است." : "This name is already taken.") : (fa ? "خطا در ذخیره‌سازی." : "Could not save profile."));
      } else {
        if (d.artist) setArtist(d.artist);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setErr(fa ? "خطای شبکه." : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  if (!artist) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <User className="mx-auto h-10 w-10 text-muted" />
        <p className="mt-3 font-semibold">{fa ? "پروفایل هنرمند یافت نشد." : "Artist profile not found."}</p>
        <p className="mt-1 text-sm text-foreground-secondary">{fa ? "با ادمین تماس بگیرید تا پروفایل شما ایجاد شود." : "Contact admin to create your profile."}</p>
      </div>
    );
  }

  const statusColor = artist.status === "approved" ? "bg-green-50 text-green-700 border-green-200" : artist.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-200";
  const statusLabel = artist.status === "approved" ? (fa ? "تأیید شده" : "Approved") : artist.status === "rejected" ? (fa ? "رد شده" : "Rejected") : (fa ? "در انتظار تأیید" : "Pending review");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status */}
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${statusColor}`}>
        <span className="h-2 w-2 rounded-full bg-current" />
        {statusLabel}
      </div>

      {/* Cover + Avatar uploads */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-4">
        <p className="font-semibold">{fa ? "تصاویر پروفایل" : "Profile images"}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload name="avatar_upload" value={avatarUrl} onChange={setAvatarUrl} fa={fa} label={fa ? "آواتار" : "Avatar"} />
          <ImageUpload name="cover_upload" value={coverUrl} onChange={setCoverUrl} fa={fa} label={fa ? "تصویر کاور" : "Cover image"} />
        </div>
      </div>

      {/* Name + Profession */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-4">
        <p className="font-semibold">{fa ? "اطلاعات پایه" : "Basic info"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={fa ? "نام (فارسی)" : "Name (fa)"}><Input name="name_fa" dir="rtl" defaultValue={artist.name?.fa ?? ""} /></Field>
          <Field label={fa ? "نام (انگلیسی)" : "Name (en)"}><Input name="name_en" dir="ltr" defaultValue={artist.name?.en ?? ""} /></Field>
          <Field label={fa ? "تخصص (فارسی)" : "Profession (fa)"}><Input name="profession_fa" dir="rtl" defaultValue={artist.profession?.fa ?? ""} /></Field>
          <Field label={fa ? "تخصص (انگلیسی)" : "Profession (en)"}><Input name="profession_en" dir="ltr" defaultValue={artist.profession?.en ?? ""} /></Field>
          <Field label={fa ? "شهر (فارسی)" : "Location (fa)"}><Input name="location_fa" dir="rtl" defaultValue={artist.location?.fa ?? ""} /></Field>
          <Field label={fa ? "شهر (انگلیسی)" : "Location (en)"}><Input name="location_en" dir="ltr" defaultValue={artist.location?.en ?? ""} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={fa ? "بیوگرافی (فارسی)" : "Bio (fa)"}><Textarea name="bio_fa" dir="rtl" rows={4} defaultValue={artist.bio?.fa ?? ""} /></Field>
          <Field label={fa ? "بیوگرافی (انگلیسی)" : "Bio (en)"}><Textarea name="bio_en" dir="ltr" rows={4} defaultValue={artist.bio?.en ?? ""} /></Field>
        </div>
      </div>

      {/* Social links */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-4">
        <p className="font-semibold">{fa ? "شبکه‌های اجتماعی" : "Social links"}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Instagram"><Input name="instagram" dir="ltr" placeholder="@username" defaultValue={artist.social?.instagram ?? ""} /></Field>
          <Field label="Behance"><Input name="behance" dir="ltr" placeholder="behance.net/..." defaultValue={artist.social?.behance ?? ""} /></Field>
          <Field label="Website"><Input name="website" dir="ltr" placeholder="yoursite.com" defaultValue={artist.social?.website ?? ""} /></Field>
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-3">
        <p className="font-semibold">{fa ? "برچسب‌ها" : "Tags"}</p>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background p-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
              #{t}
              <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="hover:text-error">×</button>
            </span>
          ))}
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }} onBlur={() => { if (tagInput.trim()) addTag(tagInput); }} placeholder={fa ? "برچسب + Enter" : "Tag + Enter"} className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" dir={fa ? "rtl" : "ltr"} />
        </div>
      </div>

      {/* License */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-3">
        <p className="font-semibold">{fa ? "نوع لایسنس" : "License type"}</p>
        <div className="relative">
          <select name="licenseType" defaultValue={artist.licenseType ?? "standard"} className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2.5 pe-10 text-sm font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" dir={fa ? "rtl" : "ltr"}>
            <option value="standard">{fa ? "استاندارد" : "Standard"}</option>
            <option value="exclusive">{fa ? "اختصاصی" : "Exclusive"}</option>
            <option value="custom">{fa ? "سفارشی" : "Custom"}</option>
          </select>
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="min-w-32">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {fa ? "ذخیره پروفایل" : "Save profile"}
        </Button>
        {success && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" />
            {fa ? "ذخیره شد!" : "Saved!"}
          </span>
        )}
        {err && <p className="text-sm text-error">{err}</p>}
      </div>
    </form>
  );
}
