import { normalisasiTelepon, teleponValid, kirimFonnte } from "@/lib/wa-server";
import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";
import { supabaseAdmin, buatOtp, hashOtp, OTP_MENIT } from "@/lib/affiliate-server";

// Kirim kode OTP 6 digit ke WhatsApp calon affiliate. Dipakai buat daftar
// MAUPUN masuk (gak ada password -- nomor WA yang terverifikasi = identitas).
//
// Pembatas (tiap OTP = 1 pesan Fonnte berbayar, jadi jangan bisa di-spam):
//  - per IP: 5 permintaan / menit
//  - per nomor: jeda 60 detik antar kirim, maks 5 kode / jam
export async function POST(request) {
  try {
    const { allowed } = await cekRateLimit(supabaseAdmin, `aff-otp:${ambilIp(request)}`, 5);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });

    const { phone: mentah } = await request.json().catch(() => ({}));
    const phone = normalisasiTelepon(mentah);
    if (!teleponValid(phone) || !phone.startsWith("628")) {
      return Response.json({ success: false, message: "Nomor WhatsApp gak valid. Contoh: 0812xxxxxxxx" }, { status: 400 });
    }
    if (!process.env.WA_API_KEY) {
      return Response.json({ success: false, message: "Layanan WhatsApp belum dikonfigurasi." }, { status: 503 });
    }

    const satuJamLalu = new Date(Date.now() - 3600 * 1000).toISOString();
    const { data: terbaru } = await supabaseAdmin.from("affiliate_otps")
      .select("created_at").eq("phone", phone).gte("created_at", satuJamLalu)
      .order("created_at", { ascending: false });
    if ((terbaru || []).length >= 5) {
      return Response.json({ success: false, message: "Terlalu banyak kode untuk nomor ini. Coba lagi dalam 1 jam." }, { status: 429 });
    }
    if (terbaru?.[0]) {
      const sisa = 60 - Math.floor((Date.now() - new Date(terbaru[0].created_at).getTime()) / 1000);
      if (sisa > 0) {
        return Response.json({ success: false, message: `Tunggu ${sisa} detik sebelum minta kode lagi.`, sisaDetik: sisa }, { status: 429 });
      }
    }

    const code = buatOtp();
    const { data: baris, error } = await supabaseAdmin.from("affiliate_otps").insert({
      phone, code_hash: hashOtp(phone, code),
      expires_at: new Date(Date.now() + OTP_MENIT * 60 * 1000).toISOString(),
    }).select("id").single();
    if (error) return Response.json({ success: false, message: "Gagal bikin kode, coba lagi." }, { status: 500 });

    const hasil = await kirimFonnte({
      targets: [phone], delay: "1",
      message: `*${code}* adalah kode verifikasi Tokku Affiliate kamu.\nBerlaku ${OTP_MENIT} menit. JANGAN bagikan kode ini ke siapa pun, termasuk yang ngaku dari Tokku.`,
    });
    if (!hasil.ok) {
      await supabaseAdmin.from("affiliate_otps").delete().eq("id", baris.id);
      console.error("OTP affiliate gagal terkirim:", hasil.detail);
      return Response.json({ success: false, message: "Gagal kirim WhatsApp. Pastikan nomornya aktif di WhatsApp." }, { status: 502 });
    }
    return Response.json({ success: true, sisaDetik: 60 });
  } catch (e) {
    console.error("Affiliate OTP kirim error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
