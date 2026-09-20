"use client";

import { Check, ChevronDown, Filter, Layers, LayoutGrid, ShoppingBag, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, faNum } from "@/lib/utils";
import type { FilterOption } from "@/components/product/FilterSidebar";

export interface ShopSidebarProps {
  /** shared categories (union of patterns + products) */
  categories: FilterOption[];
  sorts: FilterOption[];
  /** fa / en locale */
  fa: boolean;
  totalPatterns: number;
  totalProducts: number;
}

type ItemType = "all" | "pattern" | "product";

const TYPE_KEY = "type";

export function ShopSidebar({ categories, sorts, fa, totalPatterns, totalProducts }: ShopSidebarProps) {
  const { dict } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeType = (sp.get(TYPE_KEY) as ItemType) ?? "all";
  const activeCategory = sp.get("category") ?? "all";
  const activeSort = sp.get("sort") ?? "all";
  const hasFilters = activeType !== "all" || activeCategory !== "all" || activeSort !== "all";

  const activeCount = [activeType !== "all", activeCategory !== "all", activeSort !== "all"].filter(Boolean).length;

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
    },
    [sp, router, pathname],
  );

  const clear = useCallback(() => {
    start(() => router.replace(pathname, { scroll: false }));
  }, [router, pathname]);

  const total = activeType === "pattern" ? totalPatterns : activeType === "product" ? totalProducts : totalPatterns + totalProducts;

  useEffect(() => { setMobileOpen(false); }, [sp]);
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const typeOptions: { id: ItemType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "all",     label: fa ? "همه"       : "All",      icon: <LayoutGrid className="h-3.5 w-3.5" />, count: totalPatterns + totalProducts },
    { id: "pattern", label: fa ? "الگوها"    : "Patterns", icon: <Layers className="h-3.5 w-3.5" />,    count: totalPatterns },
    { id: "product", label: fa ? "محصولات"   : "Products", icon: <ShoppingBag className="h-3.5 w-3.5" />, count: totalProducts },
  ];

  const sidebarBody = (
    <aside className="flex h-full flex-col bg-surface" aria-label={fa ? "فیلترها" : "Filters"}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background-secondary text-foreground">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                {fa ? "فروشگاه" : "Shop"}
              </p>
              <h2 className="font-display text-h4 leading-tight text-foreground">
                {fa ? "فیلترها" : "Filters"}
              </h2>
            </div>
          </div>
          <p className="mt-2 text-caption text-foreground-secondary tabular">
            <span className="font-semibold text-foreground">{fa ? faNum(total) : total}</span>{" "}
            {dict.common.results}
            {hasFilters && (
              <span className="text-muted">
                {" · "}{fa ? `${faNum(activeCount)} فعال` : `${activeCount} active`}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-2.5 text-[12px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {dict.common.clear}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
            aria-label={dict.nav.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">

        {/* ── TYPE section ─────────────────────────────────────────────── */}
        <CollapsibleSection
          label={fa ? "نوع" : "Type"}
          defaultOpen
          active={activeType !== "all"}
          activeLabel={typeOptions.find((t) => t.id === activeType)?.label}
        >
          <ul className="space-y-0.5" role="listbox">
            {typeOptions.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activeType === opt.id}
                  onClick={() => set(TYPE_KEY, opt.id)}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13px] transition-all duration-200",
                    activeType === opt.id
                      ? "bg-foreground text-background shadow-soft"
                      : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground",
                  )}
                >
                  <span className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    activeType === opt.id
                      ? "border-background/30 bg-background/15"
                      : "border-border bg-surface group-hover:border-foreground/30",
                  )}>
                    {activeType === opt.id ? <Check className="h-3 w-3" strokeWidth={3} /> : opt.icon}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate", activeType === opt.id && "font-medium")}>
                    {opt.label}
                  </span>
                  <span className={cn("tabular text-[11px]", activeType === opt.id ? "text-background/70" : "text-muted")}>
                    {fa ? faNum(opt.count) : opt.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* ── CATEGORY section ─────────────────────────────────────────── */}
        <CollapsibleSection
          label={dict.common.category}
          defaultOpen
          active={activeCategory !== "all"}
          activeLabel={categories.find((c) => c.id === activeCategory)?.label}
        >
          <ul className="space-y-0.5" role="listbox" aria-label={dict.common.category}>
            <SidebarRow
              active={activeCategory === "all"}
              onClick={() => set("category", "all")}
              label={dict.common.all}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
            />
            {categories.map((c) => (
              <SidebarRow
                key={c.id}
                active={activeCategory === c.id}
                onClick={() => set("category", c.id)}
                label={c.label}
                count={c.count}
                fa={fa}
              />
            ))}
          </ul>
        </CollapsibleSection>

        {/* ── SORT section ─────────────────────────────────────────────── */}
        <CollapsibleSection
          label={dict.common.sort}
          defaultOpen={false}
          active={activeSort !== "all"}
          activeLabel={sorts.find((s) => s.id === activeSort)?.label}
        >
          <ul className="space-y-0.5" role="listbox" aria-label={dict.common.sort}>
            <SidebarRow
              active={activeSort === "all"}
              onClick={() => set("sort", "all")}
              label={dict.common.all}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
            />
            {sorts.map((s) => (
              <SidebarRow
                key={s.id}
                active={activeSort === s.id}
                onClick={() => set("sort", s.id)}
                label={s.label}
                fa={fa}
              />
            ))}
          </ul>
        </CollapsibleSection>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-2 text-caption text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>
            {fa
              ? "فیلترها در آدرس صفحه ذخیره می‌شوند."
              : "Filters live in the URL — shareable."}
          </span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop sticky sidebar ─────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h-compact)+1rem)] max-h-[calc(100svh-var(--header-h-compact)-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {sidebarBody}
        </div>
      </div>

      {/* ── Mobile trigger ─────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="sticky top-[var(--header-h-compact)] z-30 -mx-4 border-y border-border bg-background/90 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-soft transition-colors hover:border-foreground"
            >
              <Filter className="h-4 w-4" />
              {fa ? "فیلتر و مرتب‌سازی" : "Filter & sort"}
              {hasFilters && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold tabular text-background">
                  {fa ? faNum(activeCount) : activeCount}
                </span>
              )}
            </button>
            <span className="shrink-0 text-caption tabular text-muted">
              {fa ? faNum(total) : total} {dict.common.results}
            </span>
          </div>

          {hasFilters && (
            <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {activeType !== "all" && (
                <ActiveChip
                  label={typeOptions.find((t) => t.id === activeType)?.label ?? activeType}
                  onClear={() => set(TYPE_KEY, "all")}
                />
              )}
              {activeCategory !== "all" && (
                <ActiveChip
                  label={categories.find((c) => c.id === activeCategory)?.label ?? activeCategory}
                  onClear={() => set("category", "all")}
                />
              )}
              {activeSort !== "all" && (
                <ActiveChip
                  label={sorts.find((s) => s.id === activeSort)?.label ?? activeSort}
                  onClear={() => set("sort", "all")}
                />
              )}
              <button type="button" onClick={clear} className="shrink-0 rounded-full px-2.5 py-1 text-[12px] text-foreground-secondary underline-offset-2 hover:text-foreground hover:underline">
                {dict.common.clear}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label={dict.nav.close} className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[min(100%,22rem)] flex-col bg-surface shadow-elevated anim-fade-up" style={{ animationDuration: "280ms" }}>
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Internal helpers ──────────────────────────────────────────────────── */

function CollapsibleSection({
  label,
  defaultOpen,
  active,
  activeLabel,
  children,
}: {
  label: string;
  defaultOpen: boolean;
  active: boolean;
  activeLabel?: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-3.5 text-start transition-colors hover:bg-background-secondary/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[13px] font-semibold tracking-wide text-foreground">{label}</span>
          {active && activeLabel && (
            <span className="truncate rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
              {activeLabel}
            </span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-2 pb-3 pt-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({
  active,
  onClick,
  label,
  count,
  icon,
  fa,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  fa?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onClick}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13px] transition-all duration-200",
          active ? "bg-foreground text-background shadow-soft" : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground",
        )}
      >
        <span className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          active ? "border-background/30 bg-background/15" : "border-border bg-surface group-hover:border-foreground/30",
        )}>
          {active ? <Check className="h-3 w-3" strokeWidth={3} /> : (icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-30" />)}
        </span>
        <span className={cn("min-w-0 flex-1 truncate", active && "font-medium")}>{label}</span>
        {typeof count === "number" && (
          <span className={cn("tabular text-[11px]", active ? "text-background/70" : "text-muted")}>
            {fa ? faNum(count) : count}
          </span>
        )}
      </button>
    </li>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-foreground/20 bg-foreground px-2.5 py-1 text-[12px] font-medium text-background"
    >
      {label}
      <X className="h-3 w-3 opacity-80" />
    </button>
  );
}
