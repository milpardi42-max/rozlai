import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/types";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

function isOwnerEmail(email: string): boolean {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return false;
  return email.toLowerCase() === ownerEmail;
}

/** زبان ترجیحی کاربر: کوکی `ra-locale` و در نبود آن زبان پیش‌فرض. */
function preferredLocale(req: NextRequest): string {
  const cookie = req.cookies.get("ra-locale")?.value;
  return LOCALES.includes(cookie as never) ? cookie! : DEFAULT_LOCALE;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* -------- میان‌برهای ورود به پنل ادمین -------- */
  // مسیر واقعی پنل `/admin/[locale]` است. دو آدرس رایج اما نامعتبر
  // (`/admin` خالی و `/{locale}/admin` که در مستندات قدیمی آمده) به آن هدایت
  // می‌شوند تا کاربر به صفحهٔ ۴۰۴ نرسد.
  if (pathname === "/admin" || pathname === "/admin/") {
    const url = req.nextUrl.clone();
    url.pathname = `/admin/${preferredLocale(req)}`;
    return NextResponse.redirect(url);
  }

  const legacyAdmin = pathname.match(/^\/([a-z-]+)\/admin(\/.*)?$/);
  if (legacyAdmin && LOCALES.includes(legacyAdmin[1] as never)) {
    const url = req.nextUrl.clone();
    url.pathname = `/admin/${legacyAdmin[1]}${legacyAdmin[2] ?? ""}`;
    return NextResponse.redirect(url);
  }

  /* -------- مسیرهای پنل ادمین (/admin/[locale]/) -------- */
  // این مسیرها از layout سایت جدا هستند
  const adminMatch = pathname.match(/^\/admin\/([^/]+)(\/.*)?$/);
  if (adminMatch) {
    const rest = adminMatch[2] ?? "";

    // صفحه لاگین ادمین نیازی به بررسی نشست ندارد
    if (rest === "/login" || rest === "/login/") return NextResponse.next();

    // بقیه مسیرهای ادمین نیاز به نقش admin دارند
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    const session = await readSessionToken(sessionToken);
    if (!session || session.role !== "admin") {
      const locale = adminMatch[1];
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/admin/${locale}/login`;
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  /* -------- i18n locale prefix (برای مسیرهای سایت اصلی) -------- */
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const locale = preferredLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  /* -------- Protected routes (سایت اصلی) -------- */
  const segments = pathname.split("/").filter(Boolean);
  const rest = segments.slice(1).join("/");

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(sessionToken);

  // /[locale]/artist — requires role: artist or admin
  if (rest === "artist" || rest.startsWith("artist/")) {
    if (!session || (session.role !== "artist" && session.role !== "admin")) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${segments[0]}/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // /[locale]/downloads — buyer's digital library; any signed-in role
  if (rest === "downloads" || rest.startsWith("downloads/")) {
    if (!session) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${segments[0]}/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // /[locale]/owner/* — requires owner email or admin role
  if (rest === "owner" || rest.startsWith("owner/")) {
    const isOwnerSession =
      session && (session.role === "admin" || isOwnerEmail(session.email));
    if (!isOwnerSession) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${segments[0]}/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|fonts|images|favicon.ico|.*\\..*).*)"],
};
