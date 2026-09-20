import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  ArrowUpRight,
  Play,
  CheckCircle2,
  ShieldCheck,
  Infinity,
  Users,
  Clock,
  Layers,
  Signal,
  BookOpen,
  Star,
  TrendingUp,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { enrichEducation, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { faNum, formatDuration, href, t } from "@/lib/utils";
import { AcademyClient } from "./AcademyClient";
import { LiveEventBanner } from "@/components/academy/LiveEventBanner";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/academy");
  return {
    title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.education,
    description: m ? t(m.description, locale) : undefined,
  };
}

export default async function AcademyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const isFA = locale === "fa";

  const all = site.education.map((e) => enrichEducation(site, e));
  const featured = all.find((e) => e.featured && e.type === "course") ?? all[0];
  const courses = all.filter((e) => e.type === "course");
  const totalLessons = courses.reduce((acc, c) => acc + c.lessons, 0);
  const totalStudents = all.reduce((acc, i) => acc + i.lessons * 12, 0);
  const totalInstructors = new Set(all.map((i) => i.authorId)).size;

  // Pick the most relevant live/upcoming event for the banner
  const liveEvent =
    all.find((e) => (e.type === "webinar" || e.type === "workshop") && e.liveEvent?.status === "live") ??
    all
      .filter((e) => (e.type === "webinar" || e.type === "workshop") && e.liveEvent?.status === "scheduled")
      .sort((a, b) => new Date(a.liveEvent!.startsAt).getTime() - new Date(b.liveEvent!.startsAt).getTime())[0] ??
    null;

  const n = (v: number) => (isFA ? faNum(v) : String(v));
  const cats = site.categories.filter((c) =>
    site.education.some((e) => e.categoryId === c.id)
  );

  const perks = [
    {
      icon: Play,
      label: isFA ? "دسترسی آنلاین" : "Online access",
      desc: isFA ? "تماشا در هر جا، هر زمان" : "Watch anywhere, anytime",
    },
    {
      icon: Infinity,
      label: isFA ? "دسترسی مادام‌العمر" : "Lifetime access",
      desc: isFA ? "یک بار بخر، همیشه داشته باش" : "Buy once, keep forever",
    },
    {
      icon: ShieldCheck,
      label: isFA ? "گواهینامه رسمی" : "Official certificate",
      desc: isFA ? "گواهی معتبر پس از اتمام" : "Verified certificate on completion",
    },
    {
      icon: Users,
      label: isFA ? "جامعه اختصاصی" : "Private community",
      desc: isFA ? "دسترسی به گروه دانشجویان" : "Access to student community",
    },
  ];

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0c1018] text-white">
        {/* Subtle dot-grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(90,120,200,0.10),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c1018]" />

        <div className="container-x relative z-10 pt-[calc(var(--header-h)+3rem)] pb-20 md:pb-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">

            {/* ── Left: copy ──────────────────────────────────── */}
            <div className="lg:col-span-5 flex flex-col gap-7">
              {/* Eyebrow badge */}
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-caption text-white/70 backdrop-blur-sm">
                <GraduationCap className="h-3.5 w-3.5 text-accent" />
                {d.nav.education}
              </span>

              {/* Headline */}
              <h1 className="anim-blur-in font-display text-h1 text-white text-balance leading-tight">
                {isFA ? (
                  <>آکادمی رزی<br /><span className="text-accent">یاد بگیر، بساز، بفروش.</span></>
                ) : (
                  <>Rosie Academy<br /><span className="text-accent">Learn, Build, Publish.</span></>
                )}
              </h1>

              {/* Sub-copy */}
              <p className="anim-blur-in text-body-lg text-white/65 max-w-md leading-relaxed" style={{ animationDelay: "80ms" }}>
                {isFA
                  ? "دوره‌های تخصصی طراحی الگو، ورکشاپ‌های زنده و وبینارهای حرفه‌ای — از مبانی تا عرضه بین‌المللی."
                  : "Specialist pattern design courses, live workshops and professional webinars — from foundations to international publishing."}
              </p>

              {/* Live stats — all from real data */}
              <div
                className="anim-fade-up grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10"
                style={{ animationDelay: "160ms" }}
              >
                {[
                  { val: `${n(courses.length)}+`, lbl: isFA ? "دوره" : "Courses", icon: BookOpen },
                  { val: `${n(totalStudents)}+`, lbl: isFA ? "دانشجو" : "Students", icon: Users },
                  { val: isFA ? "۴.۸ ⭐" : "4.8 ⭐", lbl: isFA ? "امتیاز میانگین" : "Avg. rating", icon: Star },
                ].map(({ val, lbl, icon: Icon }) => (
                  <div key={lbl} className="flex flex-col items-center gap-1 bg-white/5 px-4 py-4 text-center backdrop-blur-sm">
                    <Icon className="h-4 w-4 text-accent/80 mb-0.5" />
                    <strong className="font-display text-h3 text-white tabular">{val}</strong>
                    <span className="text-[11px] text-white/50">{lbl}</span>
                  </div>
                ))}
              </div>

              {/* Perks 2×2 */}
              <ul className="grid grid-cols-2 gap-3">
                {perks.map(({ icon: Icon, label, desc }) => (
                  <li key={label} className="flex items-start gap-2.5 rounded-xl bg-white/5 border border-white/8 px-3.5 py-3 backdrop-blur-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-accent" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">{label}</span>
                      <span className="block text-[11px] text-white/45 leading-snug mt-0.5">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Right: featured course card ─────────────────── */}
            {featured && (
              <div className="lg:col-span-7">
                <Reveal>
                  <Link
                    href={href(locale, `/academy/${featured.slug}`)}
                    className="group relative flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-elevated"
                  >
                    <Image
                      src={featured.image}
                      alt={t(featured.title, locale)}
                      fill
                      priority
                      sizes="(max-width:1024px) 100vw, 55vw"
                      className="object-cover brightness-[0.65] group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1018]/98 via-[#0c1018]/40 to-transparent" />

                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform duration-300">
                        <Play className="h-7 w-7 fill-white text-white ms-1" />
                      </div>
                    </div>

                    {/* Meta badges — top-left */}
                    <div className="absolute top-5 start-5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1 text-caption font-medium text-white backdrop-blur-sm">
                        {isFA ? "منتخب" : "Featured"} · {d.common[featured.type]}
                      </span>
                      {featured.category && (
                        <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-caption text-white/70 backdrop-blur-sm">
                          {t(featured.category.name, locale)}
                        </span>
                      )}
                    </div>

                    {/* Bottom content */}
                    <div className="relative mt-auto p-7">
                      <h2 className="font-display text-h2 text-white text-balance leading-tight">
                        {t(featured.title, locale)}
                      </h2>
                      <p className="mt-2 text-body-sm text-white/65 max-w-lg line-clamp-2">
                        {t(featured.excerpt, locale)}
                      </p>

                      {/* Course quick-facts row */}
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-white/55">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(featured.durationMin, locale, d.common)}
                        </span>
                        {featured.lessons > 1 && (
                          <span className="inline-flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            {isFA ? faNum(featured.lessons) : featured.lessons} {d.common.lessons}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Signal className="h-3.5 w-3.5" />
                          {d.common[featured.difficulty]}
                        </span>
                      </div>

                      {/* Instructor + CTA row */}
                      <div className="mt-5 flex items-center justify-between">
                        {featured.author && (
                          <div className="flex items-center gap-2">
                            <span className="relative h-8 w-8 overflow-hidden rounded-full border border-white/20">
                              <Image src={featured.author.avatar} alt="" fill sizes="32px" className="object-cover" />
                            </span>
                            <span className="text-caption text-white/60">
                              {d.common.author}: {t(featured.author.name, locale)}
                            </span>
                          </div>
                        )}
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-white border-b border-white/40 pb-0.5 group-hover:border-white transition-colors">
                          {isFA ? "مشاهده دوره" : "View course"}
                          <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Categories strip ──────────────────────────────────── */}
      {cats.length > 0 && (
        <div className="border-b border-border bg-background-secondary">
          <div className="container-x">
            <div className="flex items-center gap-3 overflow-x-auto py-4 no-scrollbar">
              <span className="shrink-0 text-caption text-muted me-1">{d.nav.categories}:</span>
              {cats.map((c) => (
                <Link
                  key={c.id}
                  href={href(locale, `/academy?category=${c.slug}`)}
                  className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-caption text-foreground-secondary transition-all hover:border-accent hover:text-accent"
                >
                  {t(c.name, locale)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Trust bar ─────────────────────────────────────────── */}
      <div className="bg-accent text-white">
        <div className="container-x">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 py-3.5 text-sm">
            {[
              isFA ? "✓ پرداخت امن" : "✓ Secure payment",
              isFA ? "✓ دسترسی فوری" : "✓ Instant access",
              isFA ? "✓ ضمانت بازگشت وجه ۷ روزه" : "✓ 7-day money-back guarantee",
              isFA ? "✓ گواهینامه معتبر" : "✓ Verified certificate",
            ].map((item) => (
              <span key={item} className="font-medium">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── What you'll learn ─────────────────────────────────── */}
      <section className="container-x py-16">
        <SectionHeader
          eyebrow={isFA ? "چرا آکادمی رزی" : "Why Rosie Academy"}
          title={isFA ? "هر آنچه نیاز داری در یک جا" : "Everything you need in one place"}
          description={
            isFA
              ? "از آموزش‌های کوتاه ویدیویی تا دوره‌های جامع حرفه‌ای و رویدادهای زنده — ما هر سطحی را پوشش می‌دهیم."
              : "From short video tutorials to comprehensive professional courses and live events — we cover every level."
          }
          align="center"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🎓",
              title: isFA ? "دوره‌های جامع" : "Comprehensive Courses",
              desc: isFA
                ? "دوره‌های ساختارمند با درس‌های مرحله‌به‌مرحله، تمرین‌های عملی و گواهینامه پایان دوره."
                : "Structured courses with step-by-step lessons, practical exercises and completion certificates.",
              stat: `${n(totalLessons)}+ ${isFA ? "درس" : "lessons"}`,
            },
            {
              icon: "🎥",
              title: isFA ? "ورکشاپ‌های زنده" : "Live Workshops",
              desc: isFA
                ? "جلسات تعاملی آنلاین با مدرس، امکان پرسش و پاسخ مستقیم و تمرین در لحظه."
                : "Interactive online sessions with the instructor, live Q&A and real-time exercises.",
              stat: isFA ? "تعاملی و زنده" : "Real-time & interactive",
            },
            {
              icon: "📡",
              title: isFA ? "وبینارهای تخصصی" : "Expert Webinars",
              desc: isFA
                ? "وبینارهای کوتاه با متخصصان صنعت — برای به‌روز ماندن با آخرین ترندها و تکنیک‌ها."
                : "Short webinars with industry experts — stay updated with the latest trends and techniques.",
              stat: isFA ? "تخصصی و کاربردی" : "Focused & practical",
            },
            {
              icon: "📹",
              title: isFA ? "آموزش‌های ویدیویی" : "Video Tutorials",
              desc: isFA
                ? "آموزش‌های کوتاه و تمرکز‌دار که یک مهارت خاص را عمیق آموزش می‌دهند."
                : "Short, focused tutorials that teach one specific skill in depth.",
              stat: isFA ? "کوتاه و هدفمند" : "Short & targeted",
            },
            {
              icon: "🗺️",
              title: isFA ? "مسیر یادگیری" : "Learning Paths",
              desc: isFA
                ? "برنامه‌ریزی شده از صفر تا حرفه‌ای — مجموعه‌ای از دوره‌ها در کنار هم."
                : "Planned from zero to professional — a curated set of courses together.",
              stat: isFA ? "از مبتدی تا حرفه‌ای" : "Beginner to pro",
            },
            {
              icon: "🏆",
              title: isFA ? "پروژه‌های عملی" : "Real Projects",
              desc: isFA
                ? "هر دوره با یک پروژه واقعی پایان می‌یابد که می‌توانی در پورتفولیوی خود استفاده کنی."
                : "Every course ends with a real project you can add to your portfolio.",
              stat: isFA ? "پورتفولیو‌ساز" : "Portfolio-ready",
            },
          ].map(({ icon, title, desc, stat }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="group flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 h-full transition-all duration-300 hover:border-accent/40 hover:shadow-soft">
                <div className="flex items-start justify-between">
                  <span className="text-3xl leading-none">{icon}</span>
                  <span className="text-[11px] font-medium text-accent bg-accent/8 rounded-full px-2.5 py-1 border border-accent/15">
                    {stat}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-body-sm text-foreground-secondary flex-1 leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Process steps ─────────────────────────────────────── */}
      <section className="bg-background-secondary">
        <div className="container-x py-16">
          <SectionHeader
            eyebrow={isFA ? "چطور کار می‌کند" : "How it works"}
            title={isFA ? "شروع تنها ۳ قدم فاصله دارد" : "Just 3 steps away from learning"}
          />
          <div className="mt-12 grid gap-0 md:grid-cols-3">
            {[
              {
                step: isFA ? "۱" : "1",
                title: isFA ? "دوره را انتخاب کن" : "Choose a course",
                desc: isFA
                  ? "از بین دوره‌ها، ورکشاپ‌ها و وبینارها آنچه به نیازت می‌خورد را پیدا کن."
                  : "Find what fits your needs from courses, workshops and webinars.",
              },
              {
                step: isFA ? "۲" : "2",
                title: isFA ? "ثبت‌نام یا خرید کن" : "Enroll or buy",
                desc: isFA
                  ? "پرداخت امن آنلاین — فوری دسترسی پیدا می‌کنی."
                  : "Secure online payment — get instant access.",
              },
              {
                step: isFA ? "۳" : "3",
                title: isFA ? "یاد بگیر و گواهینامه بگیر" : "Learn & get certified",
                desc: isFA
                  ? "دوره را کامل کن، گواهینامه معتبر دریافت کن و کارت را در پورتفولیو بگذار."
                  : "Complete the course, receive a verified certificate, and add it to your portfolio.",
              },
            ].map(({ step, title, desc }, i) => (
              <Reveal key={step} delay={i * 100}>
                <div className="relative flex gap-5 px-6 py-8 md:px-8">
                  {/* Connector line (between steps, not after last) */}
                  {i < 2 && (
                    <span className="hidden md:block absolute top-[2.75rem] end-0 w-8 h-px bg-border" />
                  )}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground font-display text-h3 shadow-sm">
                    {step}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 text-body-sm text-foreground-secondary leading-relaxed">{desc}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-caption text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isFA
                        ? i === 0 ? "رایگان — بدون نیاز به ثبت‌نام" : i === 1 ? "پرداخت امن" : "گواهی معتبر"
                        : i === 0 ? "Free to browse" : i === 1 ? "Secure payment" : "Verified certificate"}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instructor spotlight ───────────────────────────────── */}
      {totalInstructors > 0 && (
        <section className="container-x py-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-label text-accent mb-2 flex items-center gap-2.5">
                <span className="inline-block h-px w-5 bg-accent/60" />
                {isFA ? "مدرسان" : "Instructors"}
              </p>
              <h2 className="font-display text-h2 text-foreground">
                {isFA ? `${n(totalInstructors)} متخصص در کنار توست` : `${n(totalInstructors)} expert${totalInstructors > 1 ? "s" : ""} at your side`}
              </h2>
            </div>
            <TrendingUp className="h-8 w-8 text-accent/30 hidden md:block" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { val: `${n(courses.length)}+`, lbl: isFA ? "دوره منتشرشده" : "Published courses" },
              { val: `${n(totalLessons)}+`, lbl: isFA ? "درس ویدیویی" : "Video lessons" },
              { val: `${n(totalStudents)}+`, lbl: isFA ? "دانشجوی فعال" : "Active students" },
              { val: isFA ? "۴.۸ / ۵" : "4.8 / 5", lbl: isFA ? "میانگین رضایت" : "Avg. satisfaction" },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="rounded-xl border border-border bg-surface px-5 py-5 text-center">
                <p className="font-display text-h2 text-foreground tabular">{val}</p>
                <p className="mt-1 text-caption text-foreground-secondary">{lbl}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Live event banner ─────────────────────────────────── */}
      {liveEvent && (
        <section className="container-x pb-0 pt-2">
          <LiveEventBanner event={liveEvent} />
        </section>
      )}

      {/* ── Interactive catalog (client component) ────────────── */}
      <AcademyClient items={all} categories={cats} />
    </>
  );
}
