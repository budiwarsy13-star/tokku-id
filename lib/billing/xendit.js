import { timingSafeEqual } from "crypto";

// Tagihan LANGGANAN lewat Xendit Invoice (halaman bayar hosted Xendit).
// BELUM DIUJI ke sandbox Xendit — field & alur disusun dari dokumentasi Invoice API v2.
// Tes dulu dengan XENDIT_SECRET_KEY mode test sebelum dipakai (BILLING_PROVIDER=xendit).
export async function buatTagihanXendit({ orderId, amount, deskripsi, email, redirectUrl }) {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) throw new Error("XENDIT_SECRET_KEY belum di-set di environment.");
  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(key + ":").toString("base64"),
    },
    body: JSON.stringify({
      external_id: orderId,
      amount,
      description: deskripsi,
      payer_email: email || undefined,
      currency: "IDR",
      invoice_duration: 86400, // 24 jam, dalam detik
      success_redirect_url: redirectUrl,
      failure_redirect_url: redirectUrl,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.invoice_url) throw new Error(data.message || "Xendit menolak pembuatan invoice.");
  return { provider: "xendit", redirectUrl: data.invoice_url, providerRef: data.id };
}

// Callback Xendit dikirim dengan header x-callback-token (token verifikasi dari dashboard Xendit).
export function callbackXenditValid(request) {
  const token = process.env.XENDIT_CALLBACK_TOKEN;
  const dikirim = request.headers.get("x-callback-token") || "";
  if (!token) return false;
  const a = Buffer.from(token), b = Buffer.from(dikirim);
  return a.length === b.length && timingSafeEqual(a, b);
}
