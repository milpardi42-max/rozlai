import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, FileDown, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getContent } from "@/lib/data/store";
import { getEntitlement } from "@/lib/data/entitlements";
import { listApprovedForPattern } from "@/lib/files/storage";
import { toPublicMeta } from "@/lib/files/types";
import { certificateCode } from "@/lib/license/certificate";
import { LICENSE_COVERAGE, type LicenseTier } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";
import { PrintButton } from "@/components/profile/PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale; entitlementId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "گواهی لایسنس" : "Licence certificate" };
}

const TIER_FA: Record<LicenseTier, string> = {
  personal: "شخصی",
  commercial: "تجاری",
  exclusive: "اختصاصی (انتقال حقوق)",
};
const TIER_TERMS: Record<LicenseTier, { fa: string[]; en: string[] }> = {
  personal: {
    fa: [
      "استفاده‌ی شخصی و غیرتجاری از طرح مجاز است.",
      "بازفروش فایل، چاپ یا تولید کالا برای فروش ممنوع است.",
      "ذکر نام طراح قدردانی می‌شود اما اجباری نیست.",
    ],
    en: [
      "Personal, non-commercial use of the design.",
      "No resale of the file; no physical goods offered for sale.",
      "Artist credit appreciated but not required.",
    ],
  },
  commercial: {
    fa: [
      "شامل تمام حقوق «لایسنس شخصی».",
      "استفاده روی کالای فیزیکی برای فروش (کاغذدیواری، پارچه، دکور) تا سقف ۳٬۰۰۰ واحد.",
      "فایل فقط برای تولید به یک چاپخانه/تولیدکننده تحویل داده می‌شود.",
      "بازفروش، اشتراک یا ساب‌لایسنسِ فایل اثر ممنوع است.",
    ],
    en: [
      "Includes every right of the Personal licence.",
      "Physical goods for sale (wallpaper, fabric, décor) up to 3,000 units.",
      "The file may be passed to a single manufacturer/print house for production.",
      "The artwork file itself may not be resold, shared or sub-licensed.",
    ],
  },
  exclusive: {
    fa: [
      "انتقال کامل و انحصاری حقوق این طرح به دارنده‌ی لایسنس.",
      "طرح به‌صورت دائمی از فروشگاه رزی آتلیه حذف شده است.",
      "مجوزدهنده پس از این تاریخ، طرح را به هیچ شخص ثالثی مجدداً نمی‌فروشد.",
      "فایل‌های سورس (وکتور/لایه‌باز) در صورت ارائه توسط طراح، شامل این لایسنس است.",
    ],
    en: [
      "Full exclusive rights transfer for this design to the licensee.",
      "The design is permanently removed from the Rosie Atelier shop.",
      "The licensor will not re-license the design to any third party after this date.",
      "Source files (vector/layered) are included where supplied by the artist.",
    ],
  },
};

function fmt(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function LicencePage({ params }: Props) {
  const { locale, entitlementId } = await params;
  const fa = locale === "fa";

  const session = await getSession();
  if (!session) {
    return (
      <main className="container-x max-w-2xl pt-[calc(var(--header-h)+3rem)] section-y text-center">
        <Lock className="mx-auto h-8 w-8 text-foreground-secondary" />
        <h1 className="mt-4 font-display text-h2">{fa ? "ورود لازم است" : "Sign-in required"}</h1>
        <p className="mt-2 text-sm text-foreground-secondary">
          {fa ? "برای مشاهده‌ی گواهی لایسنس ابتدا وارد شوید." : "Please sign in to view the licence certificate."}
        </p>
        <Link
          href={href(locale, `/login?next=${encodeURIComponent(href(locale, `/license/${entitlementId}`))}`)}
          className="mt-6 inline-flex h-11 items-center rounded-md bg-foreground px-6 text-sm font-medium text-background"
        >
          {fa ? "ورود" : "Sign in"}
        </Link>
      </main>
    );
  }

  const ent = await getEntitlement(entitlementId);
  const ownsIt = ent && (ent.userId === session.id || ent.email === session.email.toLowerCase() || session.role === "admin");
  if (!ent || !ownsIt) notFound();

  const content = await getContent();
  const pattern = content.patterns.find((p) => p.id === ent.patternId);
  const artist = pattern?.artistId ? content.artists.find((a) => a.id === pattern.artistId) : null;

  const approved = await listApprovedForPattern(ent.patternId);
  const covered = new Set(LICENSE_COVERAGE[ent.license]);
  const files = approved.filter((f) => covered.has(f.tier)).map(toPublicMeta);

  const code = certificateCode(ent);
  const terms = TIER_TERMS[ent.license][fa ? "fa" : "en"];

  const L = {
    header: fa ? "گواهی لایسنس طرح دیجیتال" : "Digital Design Licence Certificate",
    brand: fa ? "رزی آتلیه · ROSIE ATELIER" : "ROSIE ATELIER",
    verified: fa ? "سند معتبر" : "VERIFIED DOCUMENT",
    rows: [
      [fa ? "شماره گواهی" : "Certificate ID", ent.id.toUpperCase()],
      [fa ? "تاریخ صدور" : "Issued", fmt(ent.createdAt, locale)],
      [fa ? "کد سفارش" : "Order", ent.orderId],
      [fa ? "طرح" : "Design", pattern ? t(pattern.title, locale === "fa" ? "fa" : "en") : "—"],
      [fa ? "طراح / مجوزدهنده" : "Artist / Licensor", artist ? t(artist.name, locale === "fa" ? "fa" : "en") : fa ? "رزی آتلیه" : "Rosie Atelier"],
      [fa ? "دارنده‌ی لایسنس" : "Licensee", ent.email],
      [fa ? "نوع لایسنس" : "Licence type", fa ? TIER_FA[ent.license] : ent.license.toUpperCase()],
      [
        fa ? "اعتبار" : "Validity",
        fa
          ? "دائمی از تاریخ صدور؛ پنجره‌ی تحویل فایل: ۹۰ روز، حداکثر ۱۰ دانلود برای هر فایل."
          : "Perpetual from issue date; file delivery window 90 days, 10 downloads per file.",
      ],
    ] as [string, string][],
    filesTitle: fa ? "فایل‌های ماستر تحویلی" : "Delivered master files",
    termsTitle: fa ? "شرایط لایسنس" : "Licence terms",
    verifiedNote1: fa ? `این گواهی فقط همراه سفارش ${ent.orderId} معتبر است.` : `This certificate is valid only together with order ${ent.orderId}.`,
    verifiedNote2: fa ? `کد راستی‌آزمایی: ${code}` : `Verification code: ${code}`,
    footer: fa ? "رزی آتلیه — الگو، کاغذدیواری، پارچه و دکور" : "ROSIE ATELIER — patterns, wallpaper, fabric & décor",
    backLink: fa ? "بازگشت به کتابخانه دانلود" : "Back to download library",
    pdfNote: fa
      ? "نسخه‌ی رسمی انگلیسی (PDF) هم در کتابخانه‌ی دانلود موجود است."
      : "The official English PDF is also available in your download library.",
  };

  return (
    <main className="container-x max-w-3xl pt-[calc(var(--header-h)+2rem)] pb-20">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #licence-cert, #licence-cert * { visibility: visible !important; }
        #licence-cert { position: absolute !important; inset: 0 !important; width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
      }`}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={href(locale, "/downloads")} className="text-sm text-foreground-secondary hover:text-foreground">
          ← {L.backLink}
        </Link>
        <PrintButton />
      </div>

      <article id="licence-cert" className="overflow-hidden rounded-xl border border-border bg-background shadow-medium" dir={fa ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="bg-[#2b2a28] px-8 py-6 text-[#f6f4ef]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-bold tracking-wide">{L.brand}</p>
              <p className="mt-1 text-sm opacity-80">{L.header}</p>
            </div>
            <div className="text-end">
              <p className="text-[10px] font-bold tracking-[0.18em] opacity-70">{L.verified}</p>
              <p className="mt-1 font-mono text-xs opacity-90" dir="ltr">{code}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-7">
          {/* Rows */}
          <dl className="divide-y divide-border">
            {L.rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-4 py-3">
                <dt className="text-xs font-semibold text-foreground-secondary">{k}</dt>
                <dd className="col-span-2 break-words text-sm font-medium" dir={/^[\x00-\x7F]*$/.test(v) ? "ltr" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>

          {/* Files */}
          <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{L.filesTitle}</h2>
          <ul className="mt-2 space-y-1.5">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <FileDown className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="font-medium" dir="ltr">{f.filename}</span>
                <span className="text-xs uppercase text-foreground-secondary" dir="ltr">
                  {f.ext} · {(f.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </li>
            ))}
          </ul>

          {/* Terms */}
          <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{L.termsTitle}</h2>
          <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm text-foreground">
            {terms.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>

          {/* Footer */}
          <div className="mt-8 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BadgeCheck className="h-4 w-4 text-accent" />
              {L.footer}
            </div>
            <p className="mt-2 text-xs text-foreground-secondary">{L.verifiedNote1}</p>
            <p className="mt-1 font-mono text-xs text-foreground-secondary" dir="ltr">{L.verifiedNote2}</p>
            <p className="mt-3 text-[11px] text-foreground-secondary/70">{L.pdfNote}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
