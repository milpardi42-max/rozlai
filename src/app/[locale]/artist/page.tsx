import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/types";
import { ArtistDashboard } from "@/components/artist/ArtistDashboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "داشبورد هنرمند" : "Artist Dashboard" };
}

export default function ArtistDashboardPage() {
  return <ArtistDashboard />;
}
