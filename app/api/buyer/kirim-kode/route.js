import { createClient } from "@supabase/supabase-js";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";
import { mintaKode, normalisasiEmail, emailValid } from "@/lib/buyer-auth-server";
import { emailAktif } from "@/lib/email-server";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    if (!emailAktif()) {
      return Response.json({ success: false, message: "Verifikasi email belum diaktifkan di toko ini. Hubungi penjual." }, { status: 503 });
    }
    const body = await request.json().catch(() => ({}));
    const email = normalisasiEmail(body.email);
    if (!emailValid(email)) return Response.json({ success: false, message: "Format email belum benar." }, { status: 400 });

    const [ip, perEmail] = await Promise.all([
      cekRateLimit(admin, `buyer-kode-ip:${ambilIp(request)}`, 10),
      cekRateLimit(admin, `buyer-kode-email:${email}`, 3),
    ]);
    if (!ip.allowed || !perEmail.allowed) {
      return Response.json({ success: false, message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429 });
    }

    await mintaKode(admin, email);
    return Response.json({ success: true, message: "Kalau email ini terdaftar di pesanan, kode verifikasi sudah dikirim (berlaku 10 menit)." });
  } catch (e) {
    console.error("buyer kirim-kode error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
