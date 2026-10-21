// Kirim email lewat Resend (free tier: 3.000/bulan, 100/hari).
// RESEND_API_KEY   : wajib. Tanpa ini verifikasi buyer nonaktif.
// RESEND_FROM_EMAIL: alamat pengirim. Default onboarding@resend.dev (mode sandbox Resend:
//                    HANYA bisa kirim ke email akun Resend kamu sendiri). Setelah domain
//                    diverifikasi di Resend, isi misalnya "Tokku.id <noreply@domainmu.com>".

const RESEND_API_URL = "https://api.resend.com/emails";

export function emailAktif() {
  return !!process.env.RESEND_API_KEY;
}

export async function kirimEmailOtp(toEmail, kode) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY belum diset.");

  const from = process.env.RESEND_FROM_EMAIL || "Tokku.id <onboarding@resend.dev>";
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: `Kode verifikasi Tokku.id: ${kode}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#1C1C1A;">Kode verifikasi Tokku.id</h2>
          <p style="color:#5B6472;font-size:14px;">Masukkan kode ini untuk melihat pesananmu:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#F5F3EC;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0;">${kode}</div>
          <p style="color:#8B8D85;font-size:12px;">Berlaku 10 menit. Jangan bagikan kode ini ke siapa pun, termasuk yang mengaku dari Tokku.id. Kalau kamu tidak merasa memintanya, abaikan email ini.</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}
