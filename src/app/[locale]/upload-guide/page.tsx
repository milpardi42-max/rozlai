import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, FileCheck2, Gauge, Lock, Palette, Ruler, Scan, Type } from "lucide-react";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fa" ? "راهنمای آپلود فایل ماستر برای هنرمندان" : "Master-file upload guide for artists",
    description:
      locale === "fa"
        ? "استانداردهای فنی فایل‌های تحویلی: فرمت‌ها، رزولوشن، تکرار بی‌درز، پروفایل رنگ و روند بازبینی."
        : "Technical standards for deliverable files: formats, resolution, seamless repeat, colour profile and the review process.",
  };
}

export default async function UploadGuidePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const fa = locale === "fa";

  const formats = fa
    ? [
        { ext: "TIFF", role: "ماستر چاپ (لایسنس تجاری)", why: "استاندارد صنعت چاپ پارچه و کاغذدیواری · فلت، فشرده‌سازی LZW، ۳۰۰ تا ۶۰۰ DPI" },
        { ext: "AI / EPS / PDF (وکتور)", role: "سورس (لایسنس اختصاصی)", why: "کاملاً مقیاس‌پذیر؛ EPS نسخه‌ی ۱۰ به پایین ذخیره شود تا در همه‌ی نرم‌افزارها باز شود" },
        { ext: "PSD / PSB", role: "سورس لایه‌باز", why: "برای طرح‌های نقاشی‌شده با دست (آبرنگ، گواش) · لایه‌ها نام‌گذاری و مرتب" },
        { ext: "PNG", role: "تایل بی‌درز (همه‌ی لایسنس‌ها)", why: "واحد تکرار دقیق، پس‌زمینه‌ی شفاف در صورت نیاز، برای دیزاینرهای وب و گرافیک" },
        { ext: "JPG (کیفیت ۱۲)", role: "نسخه‌ی سبک / کالروی", why: "پیش‌نمایش باکیفیتِ هر رنگ‌بندی" },
        { ext: "ZIP", role: "پکیج کامل", why: "همه‌ی موارد بالا + PDF مشخصات در یک فایل مرتب با نام‌گذاری استاندارد" },
      ]
    : [
        { ext: "TIFF", role: "Print master (commercial licence)", why: "Textile & wallpaper print standard · flattened, LZW compression, 300–600 DPI" },
        { ext: "AI / EPS / PDF (vector)", role: "Source (exclusive licence)", why: "Infinitely scalable; save EPS as v10 or lower so it opens everywhere" },
        { ext: "PSD / PSB", role: "Layered source", why: "For hand-painted work (watercolour, gouache) · named, tidy layers" },
        { ext: "PNG", role: "Seamless tile (all licences)", why: "Exact repeat unit, transparency where needed, for web & graphic designers" },
        { ext: "JPG (quality 12)", role: "Lightweight / colourways", why: "High-quality preview of every colourway" },
        { ext: "ZIP", role: "Complete package", why: "All of the above + a spec-sheet PDF in one tidy, consistently-named file" },
      ];

  const rules = fa
    ? [
        { icon: Gauge, title: "رزولوشن", body: "۳۰۰ DPI واقعی (نه اینترپوله‌شده). برای چاپ بزرگ کاغذدیواری ۴۵۰–۶۰۰ DPI توصیه می‌شود." },
        { icon: Ruler, title: "ابعاد", body: "حداقل ۶۰۰۰×۶۰۰۰ پیکسل برای واحد اصلی. برای رول استاندارد ۵۳ سانتی‌متری، عرض فایل باید پوشش‌دهنده‌ی عرض رول در DPI نهایی باشد." },
        { icon: Scan, title: "تکرار بی‌درز", body: "واحد تکرار باید کاملاً بی‌درز (block / half-drop / brick) باشد. درز، هاله و برش موتیف در لبه مجاز نیست." },
        { icon: Palette, title: "پروفایل رنگ", body: "ICC تعبیه‌شده: sRGB برای وب، Adobe RGB یا CMYK (FOGRA39/PSO) برای ماستر چاپ. رنگ بدون پروفایل رد می‌شود." },
        { icon: Type, title: "نام‌گذاری", body: "انگلیسی، بدون فاصله: designname_colourway_64cm_300dpi.tif — نام فایل نباید فارسی یا کاراکتر خاص داشته باشد." },
        { icon: FileCheck2, title: "برگه‌ی مشخصات (PDF)", body: "ابعاد تکرار (سانتی‌متر)، کدهای رنگ HEX / CMYK / Pantone، مقیاس پیشنهادی و نام رنگ‌بندی‌ها." },
      ]
    : [
        { icon: Gauge, title: "Resolution", body: "A true 300 DPI (not interpolated). 450–600 DPI recommended for large-scale wallpaper." },
        { icon: Ruler, title: "Dimensions", body: "At least 6000×6000 px for the master unit, wide enough to cover the final roll width at target DPI." },
        { icon: Scan, title: "Seamless repeat", body: "The repeat unit must be perfectly seamless (block / half-drop / brick). Seams, halos and clipped motifs at the edge are rejected." },
        { icon: Palette, title: "Colour profile", body: "Embedded ICC: sRGB for web, Adobe RGB or CMYK (FOGRA39/PSO) for print masters. Profile-less files are rejected." },
        { icon: Type, title: "Naming", body: "ASCII, no spaces: designname_colourway_64cm_300dpi.tif — no Persian characters or special symbols." },
        { icon: FileCheck2, title: "Spec sheet (PDF)", body: "Repeat size (cm), HEX / CMYK / Pantone codes, suggested scale and colourway names." },
      ];

  const steps = fa
    ? [
        { title: "آپلود پیش‌نمایش", body: "تصویر نمایشی (موکاپ) از داشبورد هنرمند آپلود می‌شود و به‌صورت خودکار با واترمارک نمایش داده خواهد شد؛ فایل اصلی هرگز عمومی نمی‌شود." },
        { title: "آپلود فایل ماستر", body: "از صفحه‌ی «فایل‌های ماستر» فایل تحویلی را به‌صورت خصوصی بارگذاری و به الگو و لایسنس مرتبط متصل کنید." },
        { title: "بازبینی فنی", body: "تیم ما بی‌درز بودن، DPI، ابعاد و پروفایل رنگ را می‌سنجد. نتیجه: تأیید یا رد با دلیل دقیق." },
        { title: "انتشار و فروش", body: "پس از تأیید، پنل «خرید دانلودی» روی صفحه‌ی الگو فعال می‌شود و فروش شما آغاز می‌گردد." },
        { title: "تحویل امن به خریدار", body: "خریدار پس از پرداخت، از «کتابخانه دانلود» با لینک اختصاصی و زمان‌دار فایل را دریافت می‌کند؛ تا ۱۰ دانلود در ۹۰ روز." },
      ]
    : [
        { title: "Upload the preview", body: "The showcase image (mockup) is uploaded from your dashboard and will be watermarked; the master never goes public." },
        { title: "Upload the master", body: "From “Master files”, privately upload the deliverable and attach it to the pattern and its licence tier." },
        { title: "Technical review", body: "We check seamlessness, DPI, dimensions and colour profile. Result: approved, or rejected with a precise reason." },
        { title: "Publish & sell", body: "Once approved, the “digital download” panel appears on the pattern page and your sales begin." },
        { title: "Secure delivery", body: "After payment, buyers fetch the file from their download library via private, time-limited links — up to 10 downloads in 90 days." },
      ];

  return (
    <article className="container-x max-w-4xl pt-[calc(var(--header-h)+2rem)] section-y">
      <Link href={href(locale, "/patterns")} className="text-caption text-foreground-secondary hover:text-foreground">
        {fa ? "بازگشت به الگوها" : "Back to patterns"}
      </Link>

      <h1 className="mt-4 font-display text-h1 text-balance">
        {fa ? "راهنمای استاندارد فایل‌های تحویلی" : "Deliverable-file standards"}
      </h1>
      <p className="mt-3 text-body text-foreground-secondary">
        {fa
          ? "این صفحه دقیقاً همان چک‌لیستی است که تیم بازبینی روی فایل ماستر شما اعمال می‌کند. رعایتش کنید تا بازبینی یک‌باره تأیید شود."
          : "This is the exact checklist our review team applies to your master file. Follow it to pass review on the first attempt."}
      </p>

      {/* Formats table */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold">{fa ? "فرمت‌های پذیرفته‌شده" : "Accepted formats"}</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-background-secondary text-start">
                <th className="px-4 py-3 text-start font-medium">{fa ? "فرمت" : "Format"}</th>
                <th className="px-4 py-3 text-start font-medium">{fa ? "کاربرد" : "Role"}</th>
                <th className="px-4 py-3 text-start font-medium">{fa ? "توضیح فنی" : "Technical note"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {formats.map((f) => (
                <tr key={f.ext}>
                  <td className="px-4 py-3 font-semibold" dir="ltr">{f.ext}</td>
                  <td className="px-4 py-3">{f.role}</td>
                  <td className="px-4 py-3 text-foreground-secondary">{f.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-caption text-foreground-secondary">
          {fa
            ? "سقف حجم هر فایل ۲۰۰ مگابایت است. برای بسته‌های بزرگ‌تر، محتوا را در چند ZIP جداگانه ارسال کنید."
            : "Each file is capped at 200 MB. For larger packages, split the content into several ZIP archives."}
        </p>
      </section>

      {/* Technical rules */}
      <section className="mt-12">
        <h2 className="text-h3 font-semibold">{fa ? "استانداردهای فنی اجباری" : "Mandatory technical standards"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rules.map((r) => (
            <div key={r.title} className="rounded-lg border border-border bg-background-secondary/40 p-4">
              <div className="flex items-center gap-2">
                <r.icon className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold">{r.title}</h3>
              </div>
              <p className="mt-2 text-sm text-foreground-secondary">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mt-12">
        <h2 className="text-h3 font-semibold">{fa ? "روند کامل: از آپلود تا فروش" : "Full process: upload to sale"}</h2>
        <ol className="mt-4 space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-lg border border-border p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {fa ? `${["۱", "۲", "۳", "۴", "۵"][i]}` : i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-foreground-secondary">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Ownership + security */}
      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold">{fa ? "مالکیت و حق نشر" : "Ownership & rights"}</h3>
          </div>
          <p className="mt-2 text-sm text-foreground-secondary">
            {fa
              ? "با آپلود، اعلام می‌کنید مالک کامل طرح هستید یا مجوز فروش آن را دارید. فروش لایسنس، مالکیت فکری شما را منتقل نمی‌کند — مگر در «لایسنس اختصاصی» که طبق قرارداد انجام و طرح از فروشگاه حذف می‌شود."
              : "By uploading you declare full ownership of the design or permission to sell it. Licences never transfer your IP — except the “exclusive licence”, handled by contract, after which the design is delisted."}
          </p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold">{fa ? "امنیت فایل اصلی" : "Master-file security"}</h3>
          </div>
          <p className="mt-2 text-sm text-foreground-secondary">
            {fa
              ? "فایل ماستر در فضای ذخیره‌سازی خصوصی نگهداری می‌شود؛ هیچ لینک عمومی ندارد و تنها پس از پرداخت تأییدشده، با لینک امضاشده‌ی زمان‌دار و سقف دانلود تحویل داده می‌شود."
              : "Master files live in private storage; there is no public URL. Delivery happens only after verified payment, through signed, time-limited links with a download cap."}
          </p>
        </div>
      </section>

      <div className="mt-12 rounded-lg bg-background-secondary p-6 text-center">
        <p className="text-sm font-semibold">{fa ? "آماده‌ی آپلود هستید؟" : "Ready to upload?"}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={href(locale, "/artist/files")}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background"
          >
            {fa ? "صفحه‌ی فایل‌های ماستر" : "Open master files"}
            <ArrowUpRight className="h-4 w-4 rtl-flip" />
          </Link>
          <Link href={href(locale, "/artist")} className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-6 text-sm font-medium hover:border-foreground">
            {fa ? "داشبورد هنرمند" : "Artist dashboard"}
          </Link>
        </div>
      </div>
    </article>
  );
}
