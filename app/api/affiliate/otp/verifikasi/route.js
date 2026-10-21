import { normalisasiTelepon, teleponValid } from "@/lib/wa-server";
import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";
import {
  supabaseAdmin, hashOtp, samaAman, buatSesi, cookieSesiBaru, OTP_MAKS_SALAH,
} from "@/lib/affiliate-server";

// Verifikasi OTP. Kalau cocok: bikin akun affiliate (status "draft") kalau
// nomor ini belum pernah daftar, lalu bikin sesi (cookie httpOnly).
export async function POST(request) {
  try {
    const { allowed } = await cekRateLimit(supabaseAdmin, `aff-verif:${ambilIp(request)}`, 10);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak percobaan. Coba lagi sebentar." }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const phone = normalisasiTelepon(body.phone);
    const code = String(body.code || "").replace(/\D/g, "");
    if (!teleponValid(phone) || code.length !== 6) {
      return Response.json({ success: false, message: "Nomor atau kode gak valid." }, { status: 400 });
    }

    // OTP terbaru yang belum dipakai & belum kedaluwarsa.
    const { data: otp } = await supabaseAdmin.from("affiliate_otps")
      .select("id, code_hash, attempts, expires_at").eq("phone", phone).is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!otp) return Response.json({ success: false, message: "Kode kedaluwarsa. Minta kode baru." }, { status: 400 });
    if (otp.attempts >= OTP_MAKS_SALAH) {
      return Response.json({ success: false, message: "Terlalu sering salah. Minta kode baru." }, { status: 429 });
    }

    if (!samaAman(otp.code_hash, hashOtp(phone, code))) {
      await supabaseAdmin.from("affiliate_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      const sisa = OTP_MAKS_SALAH - otp.attempts - 1;
      return Response.json({ success: false, message: sisa > 0 ? `Kode salah. Sisa ${sisa} percobaan.` : "Kode salah. Minta kode baru." }, { status: 400 });
    }

    // Tandai terpakai secara ATOMIK (guard used_at is null): dua request barengan
    // dengan kode yang sama gak bisa dua-duanya sukses.
    const { data: dipakai } = await supabaseAdmin.from("affiliate_otps")
      .update({ used_at: new Date().toISOString() }).eq("id", otp.id).is("used_at", null).select("id");
    if (!dipakai || dipakai.length === 0) {
      return Response.json({ success: false, message: "Kode sudah dipakai. Minta kode baru." }, { status: 409 });
    }

    let { data: affiliate } = await supabaseAdmin.from("affiliates").select("id, status").eq("phone", phone).maybeSingle();
    if (!affiliate) {
      const { data: baru, error } = await supabaseAdmin.from("affiliates").insert({ phone }).select("id, status").single();
      if (error) {
        // balapan: nomor yang sama baru aja dibuat request lain
        const { data: lagi } = await supabaseAdmin.from("affiliates").select("id, status").eq("phone", phone).maybeSingle();
        if (!lagi) return Response.json({ success: false, message: "Gagal bikin akun, coba lagi." }, { status: 500 });
        affiliate = lagi;
      } else {
        affiliate = baru;
      }
    }
    if (affiliate.status === "ditangguhkan") {
      return Response.json({ success: false, message: "Akun affiliate ini sedang ditangguhkan." }, { status: 403 });
    }

    const token = await buatSesi(affiliate.id);
    return Response.json(
      { success: true, status: affiliate.status },
      { headers: { "Set-Cookie": cookieSesiBaru(token) } }
    );
  } catch (e) {
    console.error("Affiliate OTP verifikasi error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
