import { cekRateLimit, ambilIp } from "@/lib/rate-limit-server";
import { TERMS_VERSION } from "@/lib/affiliate-config";
import {
  supabaseAdmin, autentikasiAffiliate, validasiPendaftaran, enkripsi, piiSiap,
} from "@/lib/affiliate-server";

// Selesaikan pendaftaran: profil + identitas/pembayaran + channel sosmed, SEKALI
// jalan lewat fungsi DB atomik (affiliate_daftar). Gagal di tengah = batal semua.
export async function POST(request) {
  try {
    const auth = await autentikasiAffiliate(request);
    if (auth.error) return auth.error;
    const { affiliate } = auth;
    if (affiliate.status !== "draft") {
      return Response.json({ success: false, message: "Pendaftaran affiliate kamu sudah selesai." }, { status: 409 });
    }

    const { allowed } = await cekRateLimit(supabaseAdmin, `aff-daftar:${ambilIp(request)}`, 10);
    if (!allowed) return Response.json({ success: false, message: "Terlalu banyak percobaan." }, { status: 429 });

    if (!piiSiap()) {
      console.error("AFFILIATE_PII_KEY belum diatur / bukan 64 karakter hex");
      return Response.json({ success: false, message: "Pendaftaran belum bisa diproses (konfigurasi server). Hubungi admin." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const hasil = validasiPendaftaran(body);
    if (hasil.error) return Response.json({ success: false, message: hasil.error }, { status: 400 });
    const { profile, kyc, channels } = hasil.data;

    const { error } = await supabaseAdmin.rpc("affiliate_daftar", {
      p_affiliate_id: affiliate.id,
      p_profile: { ...profile, terms_version: TERMS_VERSION },
      p_kyc: {
        nik_enc: enkripsi(kyc.nik), nik_last4: kyc.nik.slice(-4),
        npwp_enc: kyc.npwp ? enkripsi(kyc.npwp) : "",
        payout_type: kyc.payout_type, payout_provider: kyc.payout_provider,
        account_number_enc: enkripsi(kyc.nomor), account_last4: kyc.nomor.slice(-4),
        account_name: kyc.account_name,
      },
      p_channels: channels,
    });

    if (error) {
      if (error.code === "23505") {
        const m = `${error.message} ${error.details || ""}`;
        if (m.includes("username")) return Response.json({ success: false, message: "Username itu sudah dipakai. Coba yang lain." }, { status: 409 });
        return Response.json({ success: false, message: "Ada data yang bentrok dengan akun lain. Cek username & channel kamu." }, { status: 409 });
      }
      if (error.code === "P0001") return Response.json({ success: false, message: error.message }, { status: 409 });
      console.error("affiliate_daftar error:", error);
      return Response.json({ success: false, message: "Gagal menyimpan pendaftaran, coba lagi." }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (e) {
    console.error("Affiliate daftar error:", e);
    return Response.json({ success: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
