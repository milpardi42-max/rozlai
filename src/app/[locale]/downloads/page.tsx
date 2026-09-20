import type { Metadata } from "next";
import { Suspense } from "react";
import { DownloadsView } from "@/components/profile/DownloadsView";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "کتابخانه دانلود" : "Download library" };
}

export const dynamic = "force-dynamic";

export default function DownloadsPage() {
  return (
    <Suspense>
      <DownloadsView />
    </Suspense>
  );
}
