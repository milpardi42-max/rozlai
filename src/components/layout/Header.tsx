"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Moon, ShoppingBag, Sun, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useCart, useLocale, useTheme } from "@/components/providers/AppProviders";
import { cn, href, t } from "@/lib/utils";
import { Logo } from "./Logo";
import { UnifiedDropdown } from "./UnifiedDropdown";
import type { NavData } from "./nav-data";

type Panel = "unified" | null;

export function Header({ nav }: { nav: NavData }) {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const { count, open: openCart } = useCart();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [mobile, setMobile] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const transparent = isHome && !scrolled && panel === null && !mobile;

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setPanel(null);
    setMobile(false);
  }, [pathname]);

  const openPanel = useCallback((p: Panel) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setPanel(p);
  }, []);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPanel(null), 140);
  }, []);

  const otherLocale = locale === "fa" ? "en" : "fa";
  const switchHref = pathname.replace(new RegExp(`^/${locale}`), `/${otherLocale}`) || `/${otherLocale}`;

  const links: { key: string; label: string; href: string; panel?: Panel }[] = [
    { key: "academy", label: dict.nav.education, href: href(locale, "/academy") },
    { key: "artists", label: dict.nav.artists, href: href(locale, "/artists") },
    { key: "portfolio", label: dict.nav.portfolio, href: href(locale, "/portfolio") },
    { key: "discover", label: locale === "fa" ? "فروشگاه" : "Shop", href: href(locale, "/discover"), panel: "unified" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 z-[70] transition-[background-color,border-color,box-shadow,backdrop-filter,top] duration-300",
          transparent ? "border-b border-transparent bg-transparent" : "glass border-b border-border/70 shadow-[0_1px_0_0_var(--border)]",
        )}
        style={{ top: "var(--announce-h, 0px)" }}
        onMouseLeave={scheduleClose}
      >
        <div
          className={cn(
            "container-x flex items-center justify-between gap-6 transition-[height] duration-300",
            scrolled ? "h-[var(--header-h-compact)]" : "h-[var(--header-h)]",
          )}
        >
          {/* Brand */}
          <Link href={href(locale, "/")} className="flex items-center shrink-0 group" aria-label={dict.brand}>
            <Logo className={cn(
              "text-[17px] transition-opacity duration-300 group-hover:opacity-75",
              transparent ? "text-white [--accent:rgba(255,255,255,0.75)]" : "text-foreground"
            )} />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <div key={l.key} onMouseEnter={() => (l.panel ? openPanel(l.panel) : scheduleClose())} className="relative">
                  <Link
                    href={l.href}
                    aria-expanded={l.panel ? panel === l.panel : undefined}
                    onFocus={() => l.panel && openPanel(l.panel)}
                    className={cn(
                      "relative inline-flex h-10 items-center gap-1 rounded-md px-3.5 text-[14px] font-medium transition-colors",
                      transparent ? "text-white/85 hover:text-white" : "text-foreground-secondary hover:text-foreground",
                      active && (transparent ? "text-white" : "text-foreground"),
                    )}
                  >
                    {l.label}
                    {l.panel && <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", panel === l.panel && "rotate-180")} />}
                    <span className={cn("absolute inset-x-3.5 bottom-1 h-px origin-center scale-x-0 bg-current transition-transform duration-300", active && "scale-x-100")} />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link
              href={switchHref}
              hrefLang={otherLocale}
              aria-label={dict.nav.language}
              className={cn("hidden sm:inline-flex h-9 items-center rounded-full border px-3 text-[12px] font-semibold uppercase tracking-wider transition-colors", transparent ? "border-white/35 text-white hover:bg-white/10" : "border-border text-foreground hover:border-foreground")}
            >
              {otherLocale === "fa" ? "فا" : "EN"}
            </Link>

            <button type="button" onClick={toggle} aria-label={dict.nav.theme} className={cn("hidden sm:flex h-10 w-10 items-center justify-center rounded-md transition-colors", transparent ? "text-white/85 hover:bg-white/10" : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground")}>
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <Link
              href={href(locale, user ? "/account" : "/login")}
              aria-label={dict.nav.account}
              className={cn("hidden sm:flex h-10 w-10 items-center justify-center rounded-md transition-colors", transparent ? "text-white/85 hover:bg-white/10" : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground")}
            >
              {user ? (
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold uppercase select-none",
                  transparent ? "bg-white/20 text-white ring-2 ring-white/40" : "bg-accent text-white ring-2 ring-accent/30"
                )}>
                  {user.name.trim().charAt(0)}
                </span>
              ) : (
                <User className="h-[18px] w-[18px]" />
              )}
            </Link>

            <button type="button" onClick={openCart} aria-label={dict.nav.cart} className={cn("relative flex h-10 w-10 items-center justify-center rounded-md transition-colors", transparent ? "text-white hover:bg-white/10" : "text-foreground hover:bg-background-secondary")}>
              <ShoppingBag className="h-[18px] w-[18px]" />
              {count > 0 && <span className="absolute top-1.5 inset-inline-end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white tabular anim-scale-fade">{count}</span>}
            </button>

            <Link href={href(locale, "/creators/join")} className={cn("hidden lg:inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold transition-[background-color,transform] hover:-translate-y-px ms-1", transparent ? "bg-white text-foreground hover:bg-white/90" : "bg-foreground text-background hover:bg-primary")}>
              {dict.nav.becomeCreator}
            </Link>

            <button type="button" onClick={() => setMobile((m) => !m)} aria-label={mobile ? dict.nav.close : dict.nav.menu} aria-expanded={mobile} className={cn("lg:hidden flex h-10 w-10 items-center justify-center rounded-md", transparent ? "text-white" : "text-foreground")}>
              {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Panels */}
        <div onMouseEnter={() => panel && openPanel(panel)} className={cn("hidden lg:block absolute inset-x-0 top-full origin-top transition-[opacity,transform] duration-200 ease-[var(--ease-out)]", panel ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0")} aria-hidden={!panel}>
          {panel === "unified" && <UnifiedDropdown nav={nav} onNavigate={() => setPanel(null)} />}
        </div>
      </header>

      {/* backdrop for panels */}
      <div className={cn("fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300", panel ? "opacity-100" : "pointer-events-none opacity-0")} onMouseEnter={scheduleClose} aria-hidden />

      {/* Mobile menu */}
      <MobileMenu open={mobile} onClose={() => setMobile(false)} nav={nav} links={links} switchHref={switchHref} otherLocale={otherLocale} />
    </>
  );
}

function MobileMenu({ open, onClose, nav, links, switchHref, otherLocale }: { open: boolean; onClose: () => void; nav: NavData; links: { key: string; label: string; href: string }[]; switchHref: string; otherLocale: string }) {
  const { locale, dict } = useLocale();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className={cn("fixed inset-0 z-[65] lg:hidden transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!open}>
      <div className="absolute inset-0 bg-background pt-[calc(var(--announce-h,0px)+var(--header-h))] overflow-y-auto">
        <div className="container-x pb-12 pt-4">
          <nav className="flex flex-col">
            {links.map((l, i) => (
              <Link key={l.key} href={l.href} onClick={onClose} className="flex items-center justify-between border-b border-border py-4 font-display text-h2 text-foreground anim-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                {l.label}
                <span className="text-muted text-caption tabular">0{i + 1}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {nav.categories.slice(0, 4).map((c) => (
              <Link key={c.slug} href={href(locale, `/patterns?category=${c.slug}`)} onClick={onClose} className="relative aspect-[4/3] overflow-hidden rounded-md">
                <Image src={c.image} alt="" fill sizes="50vw" className="object-cover" />
                <span className="absolute inset-0 bg-black/35" />
                <span className="absolute bottom-3 inset-inline-start-3 font-display text-h4 text-white">{t(c.name, locale)}</span>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link onClick={onClose} href={href(locale, "/collections")} className="py-2 text-foreground-secondary">{dict.nav.collections}</Link>
            <Link onClick={onClose} href={href(locale, "/projects")} className="py-2 text-foreground-secondary">{dict.nav.projects}</Link>
            <Link onClick={onClose} href={href(locale, "/custom")} className="py-2 text-foreground-secondary">{dict.nav.custom}</Link>
            <Link onClick={onClose} href={href(locale, "/stories")} className="py-2 text-foreground-secondary">{dict.nav.stories}</Link>
            <Link onClick={onClose} href={href(locale, user ? "/account" : "/login")} className="py-2 text-foreground-secondary">{dict.nav.account}</Link>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <Link href={switchHref} onClick={onClose} className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-semibold uppercase">{otherLocale === "fa" ? "فارسی" : "English"}</Link>
            <button type="button" onClick={toggle} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{dict.nav.theme}</button>
          </div>
          <Link href={href(locale, "/creators/join")} onClick={onClose} className="mt-6 flex h-12 items-center justify-center rounded-md bg-foreground text-background font-semibold">{dict.nav.becomeCreator}</Link>
        </div>
      </div>
    </div>
  );
}
