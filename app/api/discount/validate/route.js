import { createClient } from "@supabase/supabase-js";
import { validasiDiskon } from "@/lib/discount-server";
import { ambilIp, cekRateLimit } from "@/lib/rate-limit-server";

// Pakai service role karena tabel discount_codes sengaja gak punya policy select
// buat public — validasi HARUS lewat sini, gak boleh query langsung dari browser,
// biar orang gak bisa nebak-nebak/enumerasi kode diskon toko lain.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Limit lebih longgar dari /api/lacak (20/menit) karena orang beneran bisa
    // salah ketik kode beberapa kali — tapi tetep nutup enumerasi cepat/otomatis.
    const { allowed } = await cekRateLimit(supabaseAdmin, `diskon:${ambilIp(request)}`, 20);
    if (!allowed) {
      return Response.json({ valid: false, message: "Kebanyakan percobaan. Coba lagi sebentar lagi." }, { status: 429 });
    }

    const { code, storeId, subtotal } = await request.json();
    if (!code || !storeId || typeof subtotal !== "number") {
      return Response.json({ valid: false, message: "Data gak lengkap." }, { status: 400 });
    }

    const hasil = await validasiDiskon(supabaseAdmin, storeId, code, subtotal);
    return Response.json(hasil);
  } catch (error) {
    console.error("Discount validate error:", error);
    return Response.json({ valid: false, message: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
