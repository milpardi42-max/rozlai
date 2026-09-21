"use client";

import { Printer } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";

export function PrintButton() {
  const { locale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background"
    >
      <Printer className="h-4 w-4" />
      {locale === "fa" ? "چاپ یا ذخیره‌ی PDF" : "Print / Save as PDF"}
    </button>
  );
}
