"use client";

/**
 * Artist master-file manager — upload private deliverables (TIFF / PSD / AI /
 * EPS / PDF / PNG / JPG / SVG / ZIP), attach them to a pattern + licence tier,
 * and follow the moderation status. Approved files become sellable downloads.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  CloudUpload,
  FileArchive,
  Loader2,
  XCircle,
} from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { MockupStudio } from "@/components/artist/MockupStudio";
import { cn, faNum, href, t } from "@/lib/utils";
import { MASTER_ACCEPT_ATTR, type MasterFileStatus } from "@/lib/files/types";
import type { Localized } from "@/lib/i18n/types";
import type { LicenseTier } from "@/lib/types";

interface PatternLite {
  id: string;
  title: Localized;
  slug: string;
  digital?: boolean;
}

interface SeamReport {
  seamless: boolean;
  ratioX: number;
  ratioY: number;
  score: number;
  checkedAt: string;
}

interface MasterFileRow {
  id: string;
  patternId: string;
  tier: LicenseTier;
  label: string;
  filename: string;
  ext: string;
  size: number;
  status: MasterFileStatus;
  note?: string;
  seam?: SeamReport | null;
  createdAt: string;
}

const TIERS: LicenseTier[] = ["personal", "commercial", "exclusive"];

export function MasterFiles() {
  const { locale, dict } = useLocale();
  const fa = locale === "fa";
  const fileInput = useRef<HTMLInputElement>(null);

  const [patterns, setPatterns] = useState<PatternLite[]>([]);
  const [files, setFiles] = useState<MasterFileRow[]>([]);
  const [backend, setBackend] = useState<string>("local");
  const [loading, setLoading] = useState(true);
  const [patternId, setPatternId] = useState("");
  const [tier, setTier] = useState<LicenseTier>("commercial");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const MAX_SINGLE_UPLOAD = 200 * 1024 * 1024; // single-shot request body ceiling

  const L = {
    title: fa ? "فایل‌های ماستر (تحویل دانلودی)" : "Master files (digital delivery)",
    subtitle: fa
      ? "فایل اصلی محصول را خصوصی آپلود کنید؛ پس از تأیید مدیر، برای خریداران قابل دانلود می‌شود."
      : "Upload the private source file; once approved by an admin it becomes downloadable for buyers.",
    guide: fa ? "راهنمای استانداردهای آپلود" : "Upload standards guide",
    pattern: fa ? "الگو" : "Pattern",
    choosePattern: fa ? "انتخاب الگو…" : "Choose a pattern…",
    noPatterns: fa
      ? "ابتدا از داشبورد هنرمند یک الگو بسازید، بعد فایل ماستر آن را اینجا بارگذاری کنید."
      : "Create a pattern in your dashboard first, then upload its master file here.",
    tierLabel: fa ? "لایسنس مرتبط" : "Licence tier",
    tiers: {
      personal: dict.digital.licensePersonal,
      commercial: dict.digital.licenseCommercial,
      exclusive: dict.digital.licenseExclusive,
    } as Record<LicenseTier, string>,
    fileLabel: fa ? "برچسب فایل (اختیاری)" : "File label (optional)",
    fileLabelPh: fa ? "مثلاً «فایل ماستر TIFF بی‌درز ۳۰۰DPI»" : "e.g. “Seamless TIFF master 300DPI”",
    chooseFile: fa ? "انتخاب فایل" : "Choose file",
    formats: fa
      ? "ZIP · TIFF · PSD · AI · EPS · PDF · PNG · JPG · SVG — تا ۲۰۰ مگابایت تکی؛ بزرگ‌تر با آپلود چندبخشی (S3)"
      : "ZIP · TIFF · PSD · AI · EPS · PDF · PNG · JPG · SVG — up to 200 MB single; larger via multipart (S3)",
    upload: fa ? "آپلود برای بازبینی" : "Upload for review",
    uploading: fa ? "در حال آپلود…" : "Uploading…",
    uploaded: fa ? "آپلود شد و در صف بازبینی قرار گرفت" : "Uploaded and queued for review",
    listTitle: fa ? "فایل‌های من" : "My files",
    empty: fa ? "هنوز فایلی آپلود نکرده‌اید" : "No uploads yet",
    backend: fa ? "محل ذخیره‌سازی" : "Storage backend",
    status: {
      pending: fa ? "در انتظار بازبینی" : "Pending review",
      approved: fa ? "تأیید شده" : "Approved",
      rejected: fa ? "رد شده" : "Rejected",
    } as Record<MasterFileStatus, string>,
    colFile: fa ? "فایل" : "File",
    colPattern: fa ? "الگو" : "Pattern",
    colTier: fa ? "لایسنس" : "Licence",
    colStatus: fa ? "وضعیت" : "Status",
    seamOk: fa ? "تکرار بی‌درز" : "Seamless repeat",
    seamWarn: fa ? "درز محتمل" : "Seam likely",
    size: (n: number) =>
      `${fa ? faNum((n / (1024 * 1024)).toFixed(n > 10 * 1024 * 1024 ? 0 : 1).replace(".", "٫")) : (n / (1024 * 1024)).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)} MB`,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, fRes] = await Promise.all([
        fetch("/api/artist/patterns", { credentials: "same-origin" }),
        fetch("/api/artist/upload-file", { credentials: "same-origin" }),
      ]);
      if (pRes.ok) {
        const pData = (await pRes.json()) as { patterns?: PatternLite[] };
        setPatterns(pData.patterns ?? []);
      }
      if (fRes.ok) {
        const fData = (await fRes.json()) as { files?: MasterFileRow[]; backend?: string };
        setFiles(fData.files ?? []);
        if (fData.backend) setBackend(fData.backend);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload() {
    const file = fileInput.current?.files?.[0];
    if (!file || !patternId || busy) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      // Phase 4 — big files (>200 MB) go straight to S3 with multipart presigned URLs
      if (file.size > MAX_SINGLE_UPLOAD && backend === "s3") {
        await uploadMultipart(file);
      } else {
        const form = new FormData();
        form.append("file", file);
        form.append("patternId", patternId);
        form.append("tier", tier);
        if (label.trim()) form.append("label", label.trim());
        const res = await fetch("/api/artist/upload-file", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error ?? `error_${res.status}`);
          return;
        }
      }
      setDone(true);
      setLabel("");
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith("multipart_") ? e.message : "network_error");
    } finally {
      setBusy(false);
      setUploadPct(null);
    }
  }

  /** Browser → presigned part PUTs (S3/R2), then server-side complete + registry record. */
  async function uploadMultipart(file: File) {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();

    const begin = await fetch("/api/artist/upload-file/multipart", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "begin", ext, size: file.size }),
    });
    const bData = (await begin.json()) as {
      ok?: boolean;
      uploadId?: string;
      key?: string;
      partBytes?: number;
      partCount?: number;
      urls?: string[];
      urlPage?: number;
      totalPages?: number;
      error?: string;
    };
    if (!begin.ok || !bData.ok || !bData.uploadId || !bData.key || !bData.urls) {
      throw new Error(`multipart_${bData.error ?? begin.status}`);
    }

    let { urls, urlPage = 0 } = bData;
    const totalPages = bData.totalPages ?? 1;
    const partBytes = bData.partBytes ?? 16 * 1024 * 1024;
    const partCount = bData.partCount ?? Math.ceil(file.size / partBytes);
    const etags: { partNumber: number; etag: string }[] = [];
    let globalPart = 0;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        const res = await fetch("/api/artist/upload-file/multipart", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "urls", uploadId: bData.uploadId, key: bData.key, size: file.size, page }),
        });
        const d = (await res.json()) as { ok?: boolean; urls?: string[]; urlPage?: number; error?: string };
        if (!res.ok || !d.ok || !d.urls) throw new Error(`multipart_${d.error ?? res.status}`);
        urls = d.urls;
        urlPage = d.urlPage ?? page;
      }
      for (let i = 0; i < urls.length; i++) {
        const partNumber = urlPage * 200 + i + 1;
        const start = (partNumber - 1) * partBytes;
        const chunk = file.slice(start, Math.min(start + partBytes, file.size));
        const res = await fetch(urls[i]!, {
          method: "PUT",
          headers: { "content-type": "application/octet-stream" },
          body: chunk,
        });
        if (!res.ok) {
          // best-effort abort so the bucket doesn't leak parts
          await fetch("/api/artist/upload-file/multipart", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "abort", uploadId: bData.uploadId, key: bData.key }),
          });
          throw new Error(`multipart_part_${res.status}`);
        }
        const etag = res.headers.get("etag") ?? String(partNumber);
        etags.push({ partNumber, etag: etag.replace(/^"|"$/g, "") });
        globalPart = partNumber;
        setUploadPct(Math.round((globalPart / partCount) * 100));
      }
    }

    const complete = await fetch("/api/artist/upload-file/multipart", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        uploadId: bData.uploadId,
        key: bData.key,
        size: file.size,
        parts: etags,
        patternId,
        tier,
        label: label.trim() || undefined,
        filename: file.name,
      }),
    });
    const cData = (await complete.json()) as { ok?: boolean; error?: string };
    if (!complete.ok || !cData.ok) {
      throw new Error(`multipart_${cData.error ?? complete.status}`);
    }
  }

  const patternTitle = (id: string) => {
    const p = patterns.find((x) => x.id === id);
    return p ? t(p.title, locale) : id;
  };

  return (
    <div className="container-x max-w-4xl pt-[calc(var(--header-h)+1.5rem)] section-y min-h-[60vh]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-h1 text-balance">{L.title}</h1>
          <p className="mt-2 text-sm text-foreground-secondary">{L.subtitle}</p>
        </div>
        <Link
          href={href(locale, "/upload-guide")}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:border-foreground"
        >
          <BookOpen className="h-4 w-4" />
          {L.guide}
        </Link>
      </div>

      {/* Upload form */}
      <section className="mt-8 rounded-lg border border-border bg-background-secondary/50 p-5">
        {patterns.length === 0 && !loading ? (
          <p className="text-sm text-foreground-secondary">
            {L.noPatterns}{" "}
            <Link href={href(locale, "/artist")} className="font-medium text-accent underline underline-offset-4">
              {dict.nav.account}
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-muted">{L.pattern}</span>
              <select
                value={patternId}
                onChange={(e) => setPatternId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">{L.choosePattern}</option>
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(p.title, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-label text-muted">{L.tierLabel}</span>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as LicenseTier)}
                className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {TIERS.map((x) => (
                  <option key={x} value={x}>
                    {L.tiers[x]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="text-label text-muted">{L.fileLabel}</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={L.fileLabelPh}
                maxLength={120}
                className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </label>

            <div className="sm:col-span-2">
              <span className="text-label text-muted">{L.chooseFile}</span>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <input ref={fileInput} type="file" accept={MASTER_ACCEPT_ATTR} className="text-sm file:me-3 file:rounded-md file:border-0 file:bg-foreground file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-background" />
              </div>
              <p className="mt-2 text-caption text-foreground-secondary" dir="auto">{L.formats}</p>
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={upload}
                disabled={!patternId || busy}
                className={cn(
                  "inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background",
                  (!patternId || busy) && "opacity-60",
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                {busy
                  ? uploadPct !== null
                    ? `${L.uploading} ${fa ? uploadPct.toLocaleString("fa-IR") : uploadPct}٪`
                    : L.uploading
                  : L.upload}
              </button>
              {done && (
                <span className="ms-3 inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {L.uploaded}
                </span>
              )}
              {error && <span className="ms-3 text-sm text-red-600">{error}</span>}
            </div>
          </div>
        )}
      </section>

      {/* Files list */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileArchive className="h-4 w-4" />
          {L.listTitle}
          <span className="ms-auto text-caption font-normal text-foreground-secondary">
            {L.backend}: <span dir="ltr">{backend}</span>
          </span>
        </h2>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-foreground-secondary" />
          </div>
        ) : files.length === 0 ? (
          <p className="mt-4 rounded-md border border-border p-5 text-sm text-foreground-secondary">{L.empty}</p>
        ) : (
          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {files.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={f.filename}>
                    {f.label}
                  </p>
                  <p className="mt-0.5 text-caption text-foreground-secondary">
                    <span className="uppercase" dir="ltr">{f.ext}</span> · {L.size(f.size)} · {patternTitle(f.patternId)} · {L.tiers[f.tier]}
                  </p>
                  {/* Phase 3 — automatic seamless-repeat verdict (advisory) */}
                  {f.seam && (
                    <p
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                        f.seam.seamless
                          ? "border-green-600/30 text-green-800 dark:text-green-300"
                          : "border-amber-500/40 text-amber-800 dark:text-amber-300",
                      )}
                      title={fa ? `امتیاز درز: ${f.seam.score}` : `seam score: ${f.seam.score}`}
                    >
                      {f.seam.seamless ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {f.seam.seamless ? L.seamOk : L.seamWarn}
                    </p>
                  )}
                  {f.note && <p className="mt-0.5 text-caption text-red-600">{f.note}</p>}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption",
                    f.status === "approved" && "border-green-600/40 text-green-700 dark:text-green-300",
                    f.status === "pending" && "border-amber-500/40 text-amber-700 dark:text-amber-300",
                    f.status === "rejected" && "border-red-600/40 text-red-700 dark:text-red-300",
                  )}
                >
                  {f.status === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {f.status === "pending" && <Clock3 className="h-3.5 w-3.5" />}
                  {f.status === "rejected" && <XCircle className="h-3.5 w-3.5" />}
                  {L.status[f.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Phase 3 — automatic mockup studio */}
      <MockupStudio />
    </div>
  );
}
