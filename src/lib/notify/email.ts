import "server-only";

/**
 * Resend (resend.com) transactional email sender — dependency-free REST call.
 * Without RESEND_API_KEY we log the message and return ok:false "disabled"
 * (safe in dev; production should set the key).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, error: "email_not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, reply_to: msg.replyTo }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) return { ok: false, error: data?.message ?? `resend_${res.status}` };
    return { ok: true, id: data?.id };
  } catch {
    return { ok: false, error: "resend_unreachable" };
  }
}

const BRAND = "#2b2a28";
const INK = "#181816";
const MUTED = "#6b6963";
const CARD = "#f7f5f0";

function shell(content: string, dir: "rtl" | "ltr", brandName: string): string {
  return `<!doctype html>
<html lang="${dir === "rtl" ? "fa" : "en"}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${CARD};font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:${BRAND};color:#f5f2ec;padding:18px 24px;border-radius:12px 12px 0 0;">
      <strong style="font-size:18px;letter-spacing:1px;">${brandName}</strong>
    </div>
    <div style="background:#ffffff;color:${INK};padding:24px;border-radius:0 0 12px 12px;line-height:1.8;">
      ${content}
    </div>
    <p style="color:${MUTED};font-size:11px;text-align:center;margin-top:16px;">
      © ${new Date().getFullYear()} Rosie Atelier — رزی آتلیه
    </p>
  </div>
</body>
</html>`;
}

function btn(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#f5f2ec;padding:11px 22px;border-radius:8px;text-decoration:none;font-size:14px;margin-top:8px;">${label}</a>`;
}

/** One email per locale so deliverability scoring stays happy — follow the buyer's locale. */
export async function sendPurchaseConfirmedEmail(input: {
  to: string;
  locale: "fa" | "en";
  orderId: string;
  patternTitle: string;
  licenseLabel: string;
  downloadsUrl: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const fa = input.locale === "fa";
  const content = fa
    ? `<h2 style="margin:0 0 10px;font-size:17px;">خرید شما با موفقیت انجام شد ✦</h2>
<p style="margin:0 0 6px;color:${MUTED};font-size:13px;">سفارش <span dir="ltr">${input.orderId}</span></p>
<p style="font-size:14px;margin:0 0 6px;">«${input.patternTitle}» — لایسنس ${input.licenseLabel} برای شما فعال شد.</p>
<p style="font-size:13px;color:${MUTED};">فایل‌های ماستر و گواهی لایسنس از کتابخانه دانلود در دسترس‌اند.</p>
${btn(input.downloadsUrl, "ورود به کتابخانه دانلود")}`
    : `<h2 style="margin:0 0 10px;font-size:17px;">Your purchase is confirmed ✦</h2>
<p style="margin:0 0 6px;color:${MUTED};font-size:13px;">Order <span dir="ltr">${input.orderId}</span></p>
<p style="font-size:14px;margin:0 0 6px;">“${input.patternTitle}” — the ${input.licenseLabel} licence is now active on your account.</p>
<p style="font-size:13px;color:${MUTED};">Master files and the licence certificate live in your download library.</p>
${btn(input.downloadsUrl, "Open download library")}`;

  return sendEmail({
    to: input.to,
    subject: fa ? `تأیید خرید «${input.patternTitle}» — رزی آتلیه` : `Your “${input.patternTitle}” licence — Rosie Atelier`,
    html: shell(content, fa ? "rtl" : "ltr", fa ? "رزی آتلیه" : "ROSIE ATELIER"),
  });
}

export async function sendPayoutRecordedEmail(input: {
  to: string;
  locale: "fa" | "en";
  amountLabel: string;
  method: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const fa = input.locale === "fa";
  const content = fa
    ? `<h2 style="margin:0 0 10px;font-size:17px;">تسویه‌ی جدید برای شما ثبت شد</h2>
<p style="font-size:14px;">مبلغ <strong>${input.amountLabel}</strong> از طریق «${input.method}» تسویه شد.</p>
<p style="font-size:13px;color:${MUTED};">می‌توانید جزئیات را در داشبورد هنرمند، بخش «درآمد و تسویه» ببینید.</p>`
    : `<h2 style="margin:0 0 10px;font-size:17px;">A new payout was recorded</h2>
<p style="font-size:14px;"><strong>${input.amountLabel}</strong> was settled via ${input.method}.</p>
<p style="font-size:13px;color:${MUTED};">See your artist dashboard → Earnings for details.</p>`;
  return sendEmail({
    to: input.to,
    subject: fa ? "تسویه‌ی رویلتی — رزی آتلیه" : "Royalty payout — Rosie Atelier",
    html: shell(content, fa ? "rtl" : "ltr", fa ? "رزی آتلیه" : "ROSIE ATELIER"),
  });
}
