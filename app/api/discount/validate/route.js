import { createClient } from "@supabase/supabase-js";
import { validasiDiskon } from "@/lib/discount-server";

// Pakai service role karena tabel discount_codes sengaja gak punya policy select
// buat public — validasi HARUS lewat sini, gak boleh query langsung dari browser,
// biar orang gak bisa nebak-nebak/enumerasi kode diskon toko lain.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
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
