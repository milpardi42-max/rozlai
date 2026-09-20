"use client";

/**
 * Mockup studio (Phase 3) — artist uploads one pattern tile and instantly gets
 * four watermarked presentation renders (tile / 3×3 repeat / wall / fabric)
 * plus the automatic seamless-repeat verdict.
 */
import { useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  LayoutGrid,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";

type MockupKind = "tile" | "repeat" | "wall" | "fabric";

interface SeamReport {
  seamless: boolean;
  ratioX: number;
  ratioY: number;
  score: number;
  checkedAt: string;
}

export function MockupStudio() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockups, setMockups] = useState<Partial<Record<MockupKind, string>> | null>(null);
  const [seam, setSeam] = useState<SeamReport | null | undefined>(undefined);
  const [drag, setDrag] = useState(false);

  const L = {
    title: fa ? "استودیو موکاپ خودکار" : "Automatic mockup studio",
    subtitle: fa
      ? "تصویر تکرارشونده (تایل) را آپلود کنید تا چهار پیش‌نمایش آماده‌ی ارائه بگیرید؛ همه خروجی‌ها واترمارک‌دار هستند."
      : "Upload a repeating tile to get four presentation-ready previews — every render is watermarked.",
    drop: fa ? "کلیک کنید یا تایل را اینجا رها کنید" : "Click or drop your tile here",
    hint: fa ? "JPG · PNG · WebP — حداکثر ۸ مگابایت" : "JPG · PNG · WebP — max 8 MB",
    rendering: fa ? "در حال رندر چهار موکاپ…" : "Rendering four mockups…",
    kinds: {
      tile: fa ? "تایل اصلی" : "Original tile",
      repeat: fa ? "تکرار ۳×۳" : "3×3 repeat",
      wall: fa ? "دیوار / کاغذدیواری" : "Wall / wallpaper",
      fabric: fa ? "پارچه" : "Fabric",
    } as Record<MockupKind, string>,
    seamless: fa ? "بی‌درز است — گزارش تمیز" : "Seamless — clean joins",
    notSeamless: fa ? "هشدار: درز در تکرار دیده می‌شود" : "Warning: visible seam in the repeat",
    seamNote: (s: SeamReport) =>
      fa
        ? `امتیاز درز ${fa ? s.score.toLocaleString("fa-IR") : s.score} (× افقی ${s.ratioX.toLocaleString("fa-IR")} / عمودی ${s.ratioY.toLocaleString("fa-IR")}) — نزدیک ۱ یعنی بدون درز.`
        : `Seam score ${s.score} (x ${s.ratioX} / y ${s.ratioY}) — 1.0 means perfectly seamless.`,
    retry: fa ? "تایل دیگری امتحان کنید" : "Try another tile",
    errors: {
      file_too_large: fa ? "حجم فایل بیش از ۸ مگابایت است." : "File exceeds the 8 MB limit.",
      invalid_image_data: fa ? "فرمت تصویر معتبر نیست." : "Not a valid image.",
      unauthorized: fa ? "لطفاً دوباره وارد شوید." : "Please sign in again.",
      too_many_attempts: fa ? "تعداد تلاش زیاد شد؛ کمی صبر کنید." : "Too many attempts — please wait a moment.",
    } as Record<string, string>,
  };

  async function generate(file: File) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMockups(null);
    setSeam(undefined);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/artist/mockups", { method: "POST", credentials: "same-origin", body: form });
      const data = (await res.json()) as {
        ok?: boolean;
        mockups?: Partial<Record<MockupKind, string>>;
        seam?: SeamReport | null;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.mockups) {
        setError(L.errors[data.error ?? ""] ?? (fa ? `خطا: ${data.error ?? res.status}` : `Error: ${data.error ?? res.status}`));
        return;
      }
      setMockups(data.mockups);
      setSeam(data.seam ?? null);
    } catch {
      setError(fa ? "خطای شبکه." : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void generate(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void generate(file);
  };

  return (
    <section className="mt-8 rounded-lg border border-border bg-background-secondary/50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">{L.title}</h2>
          <p className="mt-1 text-sm text-foreground-secondary">{L.subtitle}</p>
        </div>
      </div>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn(
          "mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition",
          drag ? "border-accent bg-accent/10" : "border-border hover:border-accent/60 hover:bg-background/50",
          busy && "pointer-events-none opacity-70",
        )}
      >
        {busy ? <Loader2 className="h-7 w-7 animate-spin text-accent" /> : <Upload className="h-7 w-7 text-muted" />}
        <p className="text-sm font-medium">{busy ? L.rendering : L.drop}</p>
        <p className="text-caption text-muted">{L.hint}</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} disabled={busy} />
      </div>

      {error && <p className="mt-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

      {/* Seam verdict */}
      {seam && (
        <div
          className={cn(
            "mt-4 flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm",
            seam.seamless
              ? "border-green-600/30 bg-green-600/5 text-green-800 dark:text-green-300"
              : "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300",
          )}
        >
          {seam.seamless ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p className="font-semibold">{seam.seamless ? L.seamless : L.notSeamless}</p>
            <p className="mt-0.5 text-caption opacity-80" dir="auto">
              {L.seamNote(seam)}
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {mockups && (
        <div className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(L.kinds) as MockupKind[]).map((kind) =>
              mockups[kind] ? (
                <figure key={kind} className="overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
                  <div className="relative aspect-square w-full bg-background">
                    <Image
                      src={mockups[kind]!}
                      alt={L.kinds[kind]}
                      fill
                      sizes="(min-width: 640px) 40vw, 90vw"
                      className={kind === "repeat" || kind === "fabric" ? "object-contain" : "object-cover"}
                      unoptimized
                    />
                  </div>
                  <figcaption className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <LayoutGrid className="h-3.5 w-3.5 text-muted" />
                      {L.kinds[kind]}
                    </span>
                    <a
                      href={mockups[kind]!}
                      download={`rosie-mockup-${kind}.webp`}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-caption text-foreground-secondary transition hover:border-accent hover:text-accent"
                    >
                      <Download className="h-3 w-3" />
                      {fa ? "دانلود" : "Save"}
                    </a>
                  </figcaption>
                </figure>
              ) : null,
            )}
          </div>
          {inputRef.current && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 text-sm font-medium text-accent underline underline-offset-4"
            >
              {L.retry}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
