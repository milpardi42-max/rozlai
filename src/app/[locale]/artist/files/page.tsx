import type { Metadata } from "next";
import { MasterFiles } from "@/components/artist/MasterFiles";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "فایل‌های ماستر" : "Master files" };
}

export default function ArtistFilesPage() {
  return <MasterFiles />;
}
